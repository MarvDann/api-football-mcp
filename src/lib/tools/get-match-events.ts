import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parseMatchEvent, parseFixture } from '../api-client/parser'
import { getToolArguments } from './params'
import { GetMatchEventsResult } from '../../types/tool-results'
import { MatchEventAPI, FixtureAPI } from '../../types/api-football'
import { logger } from '../logger/logger'

export interface GetMatchEventsParams {
  fixtureId: number
}

export class GetMatchEventsTool implements Tool {
  [key: string]: unknown
  name = 'get_match_events'
  description = 'Get events from a specific match'

  inputSchema = {
    type: 'object' as const,
    properties: {
      fixtureId: {
        type: 'number',
        description: 'Fixture/Match ID'
      }
    },
    required: ['fixtureId']
  }

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = getToolArguments<GetMatchEventsParams>(request)

      if (!params.fixtureId) {
        return {
          content: [{
            type: 'text',
            text: 'Error: fixtureId is required'
          }],
          isError: true
        }
      }

      if (typeof params.fixtureId !== 'number' || params.fixtureId <= 0) {
        return {
          content: [{
            type: 'text',
            text: 'Error: fixtureId must be a positive number'
          }],
          isError: true
        }
      }

      // Generate cache key
      const cacheKey = CacheKeys.matchEvents(params.fixtureId)

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

      // Fetch match events from API
      const eventsResponse = await this.apiClient.getFixtureEvents(params.fixtureId)

      if (!eventsResponse.response || eventsResponse.response.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `Error: No events found for fixture ${params.fixtureId}`
          }],
          isError: true
        }
      }

      // Get fixture details as well (query by id only)
      const fixturesResponse = await this.apiClient.getFixtures({ id: params.fixtureId })

      let fixture: import('../../models/fixture').Fixture | null = null

      // Find the fixture in the response
      if (fixturesResponse.response) {
        const fixtureData = fixturesResponse.response.find((f: FixtureAPI) => f.fixture.id === params.fixtureId)
        if (fixtureData) {
          fixture = parseFixture(fixtureData)
        }
      }

      // Filter out non-goal events for now
      const events = (eventsResponse.response || [])
        .filter((eventData: MatchEventAPI) => eventData?.type === 'Goal')
        .map((eventData: MatchEventAPI) => parseMatchEvent(eventData))

      const result: GetMatchEventsResult = {
        fixture: fixture || { id: params.fixtureId },
        events
      }

      // Cache the result - use historical policy for finished matches, live policy for ongoing
      const isLive = fixture?.status?.short === 'LIVE' || fixture?.status?.short === '1H' || fixture?.status?.short === '2H'
      const policy = getCachePolicy(isLive ? 'live_fixtures' : 'match_events')
      this.cache.set(cacheKey, result, policy.ttl)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }

    } catch (error) {
      logger.error('Error in get_match_events', error as Error)

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
