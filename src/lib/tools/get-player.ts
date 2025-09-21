import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parsePlayer } from '../api-client/parser'
import { logger } from '../logger/logger'
import { createApiParams } from '../utils/object-utils'

export interface GetPlayerParams {
  playerId?: number
  name?: string
  season?: number
}

export interface GetPlayerResult {
  player: any
  statistics?: any
}

export class GetPlayerTool implements Tool {
  [key: string]: unknown
  name = 'get_player'
  description = 'Get detailed player information and statistics'

  inputSchema = {
    type: 'object' as const,
    properties: {
      playerId: {
        type: 'number',
        description: 'Player ID (optional if name provided)'
      },
      name: {
        type: 'string',
        description: 'Player name (optional if ID provided)'
      },
      season: {
        type: 'number',
        description: 'Season year for statistics'
      }
    },
    anyOf: [
      { required: ['playerId'] },
      { required: ['name'] }
    ]
  } as const

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = request.params as GetPlayerParams || {}

      // Validate that either playerId or name is provided
      if (!params.playerId && !params.name) {
        return {
          content: [{
            type: 'text',
            text: 'Error: Either playerId or name must be provided'
          }],
          isError: true
        }
      }

      let playerData: any = null
      let playerId: number | undefined = params.playerId

      // If we have a player ID, fetch player directly
      if (playerId) {
        const cacheKey = CacheKeys.player(playerId, params.season)
        const cachedResult = this.cache.get(cacheKey)

        if (cachedResult) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(cachedResult, null, 2)
            }]
          }
        }

        const apiResponse = await this.apiClient.getPlayer(playerId, params.season)

        if (apiResponse.response && apiResponse.response.length > 0) {
          playerData = apiResponse.response[0]
          playerId = playerData.player.id
        }
      } else if (params.name) {
        // Search for player by name
        const searchResponse = await this.apiClient.searchPlayers(params.name, createApiParams({
          season: params.season,
          page: 1
        }))

        if (searchResponse.response && searchResponse.response.length > 0) {
          // Find exact match or closest match
          const queryName = params.name.toLowerCase()
          const exactMatch = searchResponse.response.find((p: any) =>
            p.player.name.toLowerCase() === queryName ||
            `${p.player.firstname} ${p.player.lastname}`.toLowerCase() === queryName
          )

          if (exactMatch) {
            playerData = exactMatch
            playerId = playerData.player.id
          } else {
            // Use first result as closest match
            const first = searchResponse.response[0]
            if (first) {
              playerData = first
              playerId = playerData.player.id
            }
          }
        }
      }

      if (!playerData) {
        const identifier = params.playerId ? `ID ${params.playerId}` : `name "${params.name}"`
        return {
          content: [{
            type: 'text',
            text: `Error: No player found for ${identifier}`
          }],
          isError: true
        }
      }

      // Parse and map player data to contract shape
      const parsed = parsePlayer(playerData.player)

      // Determine position/number from statistics if available
      let position: string | undefined
      let number: number | null | undefined
      if (playerData.statistics && playerData.statistics.length > 0) {
        const premierLeagueStats = playerData.statistics.find((stat: any) =>
          stat.league.id === 39 && (!params.season || stat.league.season === params.season)
        )
        if (premierLeagueStats) {
          position = premierLeagueStats.games.position || undefined
          number = premierLeagueStats.games.number ?? null
        }
      }

      const player = {
        id: parsed.id,
        name: parsed.name,
        firstname: parsed.firstname,
        lastname: parsed.lastname,
        age: parsed.age,
        birthDate: parsed.birth.date,
        birthPlace: parsed.birth.place,
        birthCountry: parsed.birth.country,
        nationality: parsed.nationality,
        height: parsed.height,
        weight: parsed.weight,
        photo: parsed.photo,
        ...(position ? { position } : {}),
        ...(number !== undefined ? { number } : {})
      }

      const result: GetPlayerResult = { player }

      // Add statistics if available
      if (playerData.statistics && playerData.statistics.length > 0) {
        // Find Premier League statistics (league ID 39)
        const premierLeagueStats = playerData.statistics.find((stat: any) =>
          stat.league.id === 39 &&
          (!params.season || stat.league.season === params.season)
        )

        if (premierLeagueStats) {
          result.statistics = {
            playerId: player.id,
            teamId: premierLeagueStats.team.id,
            season: premierLeagueStats.league.season,
            appearances: premierLeagueStats.games.appearences || 0,
            lineups: premierLeagueStats.games.lineups || 0,
            minutes: premierLeagueStats.games.minutes || 0,
            goals: premierLeagueStats.goals.total || 0,
            assists: premierLeagueStats.goals.assists || 0,
            yellowCards: premierLeagueStats.cards.yellow || 0,
            redCards: premierLeagueStats.cards.red || 0,
            rating: premierLeagueStats.games.rating ? parseFloat(premierLeagueStats.games.rating) : null
          }
        }
      }

      // Cache the result
      if (playerId) {
        const policy = getCachePolicy('players', params.season)
        const cacheKey = CacheKeys.player(playerId, params.season)
        this.cache.set(cacheKey, result, policy.ttl)
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }

    } catch (error) {
      logger.error('Error in get_player', error as Error)

      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }],
        isError: true
      }
    }
  }
}
