import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parsePlayer } from '../api-client/parser'
import { logger } from '../logger/logger'
import { createApiParams } from '../utils/object-utils'

export interface SearchPlayersParams {
  query?: string
  teamId?: number
  position?: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'
  season?: number
}

export interface SearchPlayersResult {
  players: any[]
  total: number
}

export class SearchPlayersTool implements Tool {
  [key: string]: unknown
  name = 'search_players'
  description = 'Search for players by name or position'

  inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query for player name'
      },
      teamId: {
        type: 'number',
        description: 'Filter by team ID'
      },
      position: {
        type: 'string',
        enum: ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'],
        description: 'Filter by position'
      },
      season: {
        type: 'number',
        description: 'Season year'
      }
    }
  } as const

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = request.params as SearchPlayersParams || {}

      // Generate cache key
      const cacheKey = params.query
        ? CacheKeys.searchPlayers(params.query, createApiParams({
          team: params.teamId,
          season: params.season
        }))
        : CacheKeys.players(createApiParams({
          team: params.teamId,
          season: params.season
        }))

      // Try to get from cache first
      let cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        // Apply position filter if not cached with position
        if (params.position && cachedResult.players) {
          cachedResult = {
            ...cachedResult,
            players: cachedResult.players.filter((player: any) =>
              player.position === params.position
            ),
            total: cachedResult.players.filter((player: any) =>
              player.position === params.position
            ).length
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(cachedResult, null, 2)
          }]
        }
      }

      let apiResponse: any

      if (params.query) {
        // Search for players by name
        apiResponse = await this.apiClient.searchPlayers(params.query, createApiParams({
          team: params.teamId,
          season: params.season,
          page: 1
        }))
      } else {
        // Get players (filtered by team/season if provided)
        apiResponse = await this.apiClient.getPlayers(createApiParams({
          team: params.teamId,
          season: params.season,
          page: 1
        }))
      }

      if (!apiResponse.response) {
        return {
          content: [{
            type: 'text',
            text: `Error: No players found${params.query ? ` for query "${params.query}"` : ''}`
          }],
          isError: true
        }
      }

      // Parse player data and map to contract schema
      let players = apiResponse.response.map((playerData: any) => {
        const parsed = parsePlayer(playerData.player)

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

        return {
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
      })

      // Apply position filter if specified
      if (params.position) {
        players = players.filter((player: any) =>
          player.position === params.position ||
          (player.position?.toLowerCase().includes(params.position!.toLowerCase()))
        )
      }

      const result: SearchPlayersResult = {
        players,
        total: players.length
      }

      // Cache the result
      const policy = getCachePolicy('search_players', params.season)
      this.cache.set(cacheKey, result, policy.ttl)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }

    } catch (error) {
      logger.error('Error in search_players', error as Error)

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
