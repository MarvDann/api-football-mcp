import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parsePlayer } from '../api-client/parser'
import { logger } from '../logger/logger'
import { SearchPlayersResult, PlayerProfile } from '../../types/tool-results'
import { PlayersResponseItemAPI, PlayerStatisticsAPI } from '../../types/api-football'
import { getToolArguments } from './params'
import { createApiParams } from '../utils/object-utils'
import { getDefaultFormat, getDefaultMaxRows } from '../utils/format-config'
import { renderTable } from '../utils/table'
import { summarizePlayer } from '../utils/summarize'

export interface SearchPlayersParams {
  query?: string
  teamId?: number
  position?: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'
  season?: number
  // output options (optional; supported by inputSchema and rendering logic)
  format?: 'json' | 'table'
  limit?: number
  detail?: boolean
}

// Result shape imported from ../../types/tool-results

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
      },
      format: {
        type: 'string' as const,
        enum: ['json', 'table'] as const,
        description: 'Output format (default: table)'
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of rows when using table format'
      },
      detail: {
        type: 'boolean' as const,
        description: 'Return full JSON even for lists (overrides default table)'
      }
    }
  } as const

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = getToolArguments<SearchPlayersParams>(request)

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
      const cached = this.cache.get(cacheKey) as SearchPlayersResult | null
      if (cached) {
        let out = cached
        // Apply position filter if not cached with position
        if (params.position && cached.players) {
          const filtered = cached.players.filter((player) => player.position === params.position)
          out = { ...cached, players: filtered, total: filtered.length }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(out, null, 2)
          }]
        }
      }

      let apiResponse: { response?: PlayersResponseItemAPI[] }

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
      let players: PlayerProfile[] = (apiResponse.response || []).map((playerData) => {
        const parsed = parsePlayer(playerData.player)

        let position: string | undefined
        let number: number | null | undefined
        if (playerData.statistics && playerData.statistics.length > 0) {
          const premierLeagueStats = playerData.statistics.find((stat: PlayerStatisticsAPI) =>
            (stat.league?.id === 39) && (!params.season || stat.league?.season === params.season)
          )

          if (premierLeagueStats) {
            position = premierLeagueStats.games?.position || undefined
            number = premierLeagueStats.games?.number ?? null
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
          injured: parsed.injured,
          photo: parsed.photo,
          ...(position ? { position } : {}),
          ...(number !== undefined ? { number } : {})
        }
      })

      // Apply position filter if specified
      if (params.position) {
        const needle = params.position.toLowerCase()
        players = players.filter((player) =>
          player.position === params.position ||
          (player.position?.toLowerCase().includes(needle))
        )
      }

      const result: SearchPlayersResult = {
        players,
        total: players.length
      }

      // Cache the result
      const policy = getCachePolicy('search_players', params.season)
      this.cache.set(cacheKey, result, policy.ttl)

      const format = params.detail ? 'json' : (params.format ?? getDefaultFormat())
      if (format === 'json') {
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }

      const rows = players.map(p => summarizePlayer(p))
      const table = renderTable(
        [
          { key: 'id', header: 'ID' },
          { key: 'name', header: 'Name' },
          { key: 'age', header: 'Age' },
          { key: 'nat', header: 'Nat' },
          { key: 'pos', header: 'Pos' },
          { key: 'no', header: 'No' }
        ],
        rows,
        { maxRows: params.limit ?? getDefaultMaxRows(), showFooter: true }
      )
      return { content: [{ type: 'text', text: table }] }

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
