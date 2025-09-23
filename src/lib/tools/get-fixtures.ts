import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parseFixture } from '../api-client/parser'
import { logger } from '../logger/logger'
import { createApiParams } from '../utils/object-utils'
import { FixtureAPI } from '../../types/api-football'
import { getToolArguments } from './params'

export interface GetFixturesParams {
  season?: number
  teamId?: number
  date?: string
  from?: string
  to?: string
  status?: 'NS' | '1H' | 'HT' | '2H' | 'FT' | 'LIVE'
}

export interface GetFixturesResult {
  fixtures: any[]
  total: number
}

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
      }
    }
  } as any

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


      // Generate cache key
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
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(cachedResult, null, 2)
          }]
        }
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
      const fixtures = apiResponse.response.map((item: FixtureAPI) => {
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

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }

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
