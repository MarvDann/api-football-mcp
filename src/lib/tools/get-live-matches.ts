import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parseFixture } from '../api-client/parser'
import { logger } from '../logger/logger'
import { GetLiveMatchesResult } from '../../types/tool-results'
import { FixtureAPI } from '../../types/api-football'
import type { Fixture } from '../../models/fixture'
import { getDefaultFormat, getDefaultMaxRows } from '../utils/format-config'
import { renderTable } from '../utils/table'
import { summarizeLiveFixture } from '../utils/summarize'

// Result shape imported from ../../types/tool-results

export class GetLiveMatchesTool implements Tool {
  [key: string]: unknown
  name = 'get_live_matches'
  description = 'Get all currently live Premier League matches'

  inputSchema = {
    type: 'object' as const,
    properties: {
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
  }

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (_request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = (_request?.params ?? {}) as { format?: 'json' | 'table', limit?: number, detail?: boolean }
      // Generate cache key
      const cacheKey = CacheKeys.liveFixtures()

      // Try to get from cache first (very short TTL for live data)
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        const format = params.detail ? 'json' : (params.format ?? getDefaultFormat())
        if (format === 'json') {
          return { content: [{ type: 'text', text: JSON.stringify(cachedResult, null, 2) }] }
        }
        const rows = (cachedResult.fixtures || []).map((f: any) => summarizeLiveFixture(f))
        const table = renderTable(
          [
            { key: 'id', header: 'ID' },
            { key: 'min', header: 'Min' },
            { key: 'home', header: 'Home' },
            { key: 'away', header: 'Away' },
            { key: 'score', header: 'Score' },
            { key: 'st', header: 'St' }
          ],
          rows,
          { maxRows: params.limit ?? getDefaultMaxRows(), showFooter: true }
        )
        return { content: [{ type: 'text', text: table }] }
      }

      // Fetch live fixtures from API
      const apiResponse = await this.apiClient.getLiveFixtures()

      // Parse fixtures
      const fixtures: Fixture[] = apiResponse.response
        ? apiResponse.response.map((fixtureData: FixtureAPI) => parseFixture(fixtureData))
        : []

      // Filter to only include matches that are actually live
      const liveFixtures = fixtures.filter((fixture) => {
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

      const format = params.detail ? 'json' : (params.format ?? getDefaultFormat())
      if (format === 'json') {
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }
      const rows = liveFixtures.map(f => summarizeLiveFixture(f))
      const table = renderTable(
        [
          { key: 'id', header: 'ID' },
          { key: 'min', header: 'Min' },
          { key: 'home', header: 'Home' },
          { key: 'away', header: 'Away' },
          { key: 'score', header: 'Score' },
          { key: 'st', header: 'St' }
        ],
        rows,
        { maxRows: params.limit ?? getDefaultMaxRows(), showFooter: true }
      )
      return { content: [{ type: 'text', text: table }] }

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
