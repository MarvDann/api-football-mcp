import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parseMatchEvent, parseFixture } from '../api-client/parser'
import { logger } from '../logger/logger'
import { getToolArguments } from './params'
import { GetMatchGoalsResult } from '../../types/tool-results'
import { MatchEventAPI, FixtureAPI } from '../../types/api-football'
import type { Fixture } from '../../models/fixture'

export interface GetMatchGoalsParams {
  fixtureId: number
}

export class GetMatchGoalsTool implements Tool {
  [key: string]: unknown
  name = 'get_match_goals'
  description = 'Get goal events from a specific match'

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
      const params = getToolArguments<GetMatchGoalsParams>(request)

      if (!params.fixtureId || typeof params.fixtureId !== 'number' || params.fixtureId <= 0) {
        return { content: [{ type: 'text', text: 'Error: fixtureId must be a positive number' }], isError: true }
      }

      const cacheKey = CacheKeys.matchEvents(params.fixtureId)
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        return { content: [{ type: 'text', text: JSON.stringify(cachedResult, null, 2) }] }
      }

      const eventsResponse = await this.apiClient.getFixtureEvents(params.fixtureId)
      // Get fixture details by id only
      const fixturesResponse = await this.apiClient.getFixtures({ id: params.fixtureId })

      let fixture: Fixture | null = null
      if (fixturesResponse.response) {
        const fixtureData = fixturesResponse.response.find((f: FixtureAPI) => f.fixture.id === params.fixtureId)
        if (fixtureData) fixture = parseFixture(fixtureData)
      }

      const events = (eventsResponse.response || [])
        .filter((eventData: MatchEventAPI) => eventData?.type === 'Goal')
        .map((eventData: MatchEventAPI) => parseMatchEvent(eventData))

      const result: GetMatchGoalsResult = { fixture: fixture || { id: params.fixtureId }, events }
      const isLive = fixture?.status?.short === 'LIVE' || fixture?.status?.short === '1H' || fixture?.status?.short === '2H'
      const policy = getCachePolicy(isLive ? 'live_fixtures' : 'match_events')
      this.cache.set(cacheKey, result, policy.ttl)

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (error) {
      logger.error('Error in get_match_goals', error as Error)
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}` }], isError: true }
    }
  }
}
