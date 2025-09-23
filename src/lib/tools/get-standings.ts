import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parseStanding } from '../api-client/parser'
import { logger } from '../logger/logger'
import { SEASON_CONFIG } from '../../models/season'
import { GetStandingsResult } from '../../types/tool-results'
import { getToolArguments } from './params'

export interface GetStandingsParams {
  season?: number
}

// result type imported from types

export class GetStandingsTool implements Tool {
  [key: string]: unknown
  name = 'get_standings'
  description = 'Get current or historical Premier League standings'

  inputSchema = {
    type: 'object' as const,
    properties: {
      season: {
        type: 'number',
        description: 'Season year (e.g., 2024 for 2024-25 season). Defaults to current season.',
        minimum: SEASON_CONFIG.MINIMUM_SEASON,
        maximum: SEASON_CONFIG.MAXIMUM_SEASON
      }
    }
  }

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = getToolArguments<GetStandingsParams>(request)
      const season = params.season || new Date().getFullYear()

      // Validate season range
      if (season < SEASON_CONFIG.MINIMUM_SEASON || season > SEASON_CONFIG.MAXIMUM_SEASON) {
        return {
          content: [{
            type: 'text',
            text: `Error: Season must be between ${SEASON_CONFIG.MINIMUM_SEASON} and ${SEASON_CONFIG.MAXIMUM_SEASON}`
          }],
          isError: true
        }
      }

      // Generate cache key
      const cacheKey = CacheKeys.standings(season)

      // Try to get from cache first
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(cachedResult, null, 2)
          }]
        }
      }

      // Fetch from API
      const apiResponse = await this.apiClient.getStandings(season)

      if (!apiResponse.response || apiResponse.response.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Error: No standings data found for season ${season}`
          }],
          isError: true
        }
      }

      // Parse and format the response
      const leagueStandings = apiResponse.response[0]!
      const standings = leagueStandings.league.standings[0]!.map((item) => parseStanding(item))

      const result: GetStandingsResult = {
        standings,
        lastUpdated: new Date().toISOString()
      }

      // Cache the result
      const policy = getCachePolicy('standings', season)
      this.cache.set(cacheKey, result, policy.ttl)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }

    } catch (error) {
      logger.error('Error in get_standings', error as Error)

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
