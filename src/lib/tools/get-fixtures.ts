import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parseFixture } from '../api-client/parser'
import { logger } from '../logger/logger'
import { createApiParams } from '../utils/object-utils'
import { FixtureAPI } from '../../types/api-football'
// import type { Fixture } from '../../models/fixture' // unused
import { FixtureWithId, GetFixturesResult } from '../../types/tool-results'
import { getToolArguments } from './params'
import { getDefaultFormat, getDefaultMaxRows } from '../utils/format-config'
import { renderTable } from '../utils/table'
import { summarizeFixture } from '../utils/summarize'

export interface GetFixturesParams {
  season?: number
  teamId?: number
  date?: string
  from?: string
  to?: string
  status?: 'NS' | '1H' | 'HT' | '2H' | 'FT' | 'LIVE'
  fixtureId?: number
  format?: 'json' | 'table'
  limit?: number
  detail?: boolean
}

// Types sourced from ../../types/tool-results

export class GetFixturesTool implements Tool {
  [key: string]: unknown
  name = 'get_fixtures'
  description = 'Get fixtures by date range, team, or status'

  inputSchema = {
    type: 'object' as const,
    properties: {
      season: {
        type: 'number' as const,
        description: 'Season year'
      },
      teamId: {
        type: 'number' as const,
        description: 'Filter by team ID'
      },
      date: {
        type: 'string' as const,
        format: 'date' as const,
        description: 'Specific date (YYYY-MM-DD)'
      },
      from: {
        type: 'string' as const,
        format: 'date' as const,
        description: 'Start date (YYYY-MM-DD)'
      },
      to: {
        type: 'string' as const,
        format: 'date' as const,
        description: 'End date (YYYY-MM-DD)'
      },
      status: {
        type: 'string' as const,
        enum: ['NS', '1H', 'HT', '2H', 'FT', 'LIVE'] as const,
        description: 'Filter by match status'
      },
      fixtureId: {
        type: 'number' as const,
        description: 'If provided, returns the full data for a single fixture'
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
  }

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = getToolArguments<GetFixturesParams>(request)

      // Validate date formats
      if (params.from && !this.isValidDate(params.from)) {
        return {
          content: [{
            type: 'text',
            text: 'Error: "from" date must be in YYYY-MM-DD format'
          }],
          isError: true
        }
      }

      if (params.to && !this.isValidDate(params.to)) {
        return {
          content: [{
            type: 'text',
            text: 'Error: "to" date must be in YYYY-MM-DD format'
          }],
          isError: true
        }
      }

      // Validate date range
      if (params.from && params.to && params.from > params.to) {
        return {
          content: [{
            type: 'text',
            text: 'Error: "from" date must be before or equal to "to" date'
          }],
          isError: true
        }
      }
      // Single fixture path: return full data
      if (params.fixtureId) {
        const apiResponse = await this.apiClient.getFixtures({ id: params.fixtureId })
        const fixtureData = (apiResponse.response || []).find((item: any) => item?.fixture?.id === params.fixtureId)
        if (!fixtureData) {
          return {
            content: [{ type: 'text', text: `Error: Fixture ${params.fixtureId} not found` }],
            isError: true
          }
        }
        const full = parseFixture(fixtureData as any)
        return {
          content: [{ type: 'text', text: JSON.stringify(full, null, 2) }]
        }
      }

      // Generate cache key (format/limit not included)
      const cacheKey = CacheKeys.fixtures(createApiParams({
        season: params.season,
        team: params.teamId,
        date: params.date,
        from: params.from,
        to: params.to,
        status: params.status
      }))

      // Try to get from cache first
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        const format = params.detail ? 'json' : (params.format ?? getDefaultFormat())
        if (format === 'json') {
          return { content: [{ type: 'text', text: JSON.stringify(cachedResult, null, 2) }] }
        }
        const rows = (cachedResult.fixtures || []).map((f: any) => summarizeFixture(f))
        const table = renderTable(
          [
            { key: 'id', header: 'ID' },
            { key: 'date', header: 'Date' },
            { key: 'home', header: 'Home' },
            { key: 'away', header: 'Away' },
            { key: 'score', header: 'Score' },
            { key: 'st', header: 'St' },
            { key: 'rnd', header: 'Rnd' }
          ],
          rows,
          { maxRows: params.limit ?? getDefaultMaxRows(), showFooter: true }
        )
        return { content: [{ type: 'text', text: table }] }
      }

      // Fetch from API
      const apiResponse = await this.apiClient.getFixtures(createApiParams({
        season: params.season,
        team: params.teamId,
        date: params.date,
        from: params.from,
        to: params.to,
        status: params.status
      }))

      // Parse and format the response, ensure fixture id is explicitly included
      const fixtures: FixtureWithId[] = apiResponse.response.map((item: FixtureAPI) => {
        const f = parseFixture(item)
        return { fixtureId: f.id, ...f }
      })

      const result: GetFixturesResult = {
        fixtures,
        total: fixtures.length
      }

      // Cache the result
      const policy = getCachePolicy('fixtures', params.season)
      this.cache.set(cacheKey, result, policy.ttl)

      const format = params.detail ? 'json' : (params.format ?? getDefaultFormat())
      if (format === 'json') {
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }
      const rows = fixtures.map(f => summarizeFixture(f))
      const table = renderTable(
        [
          { key: 'id', header: 'ID' },
          { key: 'date', header: 'Date' },
          { key: 'home', header: 'Home' },
          { key: 'away', header: 'Away' },
          { key: 'score', header: 'Score' },
          { key: 'st', header: 'St' },
          { key: 'rnd', header: 'Rnd' }
        ],
        rows,
        { maxRows: params.limit ?? getDefaultMaxRows(), showFooter: true }
      )
      return { content: [{ type: 'text', text: table }] }

    } catch (error) {
      logger.error('Error in get_fixtures', error as Error)

      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }],
        isError: true
      }
    }
  }

  private isValidDate (dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/
    if (!regex.test(dateString)) return false

    const date = new Date(dateString)
    return date instanceof Date && !isNaN(date.getTime()) && date.toISOString().startsWith(dateString)
  }
}
