import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parseFixture } from '../api-client/parser'
import { logger } from '../logger/logger'

export interface GetLiveMatchesResult {
  fixtures: any[]
  total: number
}

export class GetLiveMatchesTool implements Tool {
  [key: string]: unknown
  name = 'get_live_matches'
  description = 'Get all currently live Premier League matches'

  inputSchema = {
    type: 'object' as const,
    properties: {}
  }

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (_request: CallToolRequest): Promise<CallToolResult> {
    try {
      // Generate cache key
      const cacheKey = CacheKeys.liveFixtures()

      // Try to get from cache first (very short TTL for live data)
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(cachedResult, null, 2)
          }]
        }
      }

      // Fetch live fixtures from API
      const apiResponse = await this.apiClient.getLiveFixtures()

      // Parse fixtures
      const fixtures = apiResponse.response
        ? apiResponse.response.map((fixtureData: any) => parseFixture(fixtureData))
        : []

      // Filter to only include matches that are actually live
      const liveFixtures = fixtures.filter((fixture: any) => {
        const status = fixture.status.short
        return ['1H', 'HT', '2H', 'ET', 'BT', 'LIVE'].includes(status)
      })

      const result: GetLiveMatchesResult = {
        fixtures: liveFixtures,
        total: liveFixtures.length
      }

      // Cache the result with very short TTL for live data
      const policy = getCachePolicy('live_fixtures')
      this.cache.set(cacheKey, result, policy.ttl)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }

    } catch (error) {
      logger.error('Error in get_live_matches', error as Error)

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
