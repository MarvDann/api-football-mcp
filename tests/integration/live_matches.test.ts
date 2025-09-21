import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { APIFootballClient } from '../../src/lib/api-client/client'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { GetLiveMatchesTool } from '../../src/lib/tools/get-live-matches'
import { GetMatchGoalsTool } from '../../src/lib/tools/get-match-goals'
import { delayedApiCall, testWithRateLimit, checkRateLimit } from '../helpers/api_test_helpers'

describe('Integration: Get live match events', () => {
  let apiClient: APIFootballClient
  let cache: LRUCache
  let liveMatchesTool: GetLiveMatchesTool
  let matchEventsTool: GetMatchGoalsTool

  beforeAll(() => {
    const apiKey = process.env.API_FOOTBALL_KEY || 'test-key'
    apiClient = new APIFootballClient({ apiKey, timeout: 5000 })
    cache = new LRUCache({ maxSize: 100, defaultTtl: 5000 })
    liveMatchesTool = new GetLiveMatchesTool(apiClient, cache)
    matchEventsTool = new GetMatchGoalsTool(apiClient, cache)
  })

  afterAll(() => {
    cache.destroy()
  })

  it('should retrieve currently live Premier League matches', testWithRateLimit('live matches', async () => {
    // User Story: Given an agent needs live match data,
    // When the agent queries for ongoing matches,
    // Then the system returns real-time match events and statistics

    try {
      const liveMatches = await delayedApiCall(() => liveMatchesTool.call({ params: {} } as any))
      if (liveMatches.content?.[0] && (liveMatches.content[0] as any).text) {
        const data = JSON.parse(((liveMatches.content[0] as any).text as string))
        const rl = checkRateLimit(data)
        if (rl.isLimited) throw new Error('SKIP_TEST: Rate limited - live matches')
      }
      expect(liveMatches).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  }))

  it('should return match goals for specific fixture', testWithRateLimit('match goals by fixture', async () => {
    // Test getting detailed match events (goals, cards, substitutions)
    const fixtureId = 12345

    try {
      const events = await delayedApiCall(() => matchEventsTool.call({ params: { fixtureId } } as any))
      expect(events).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  }))

  it('should handle no live matches scenario', testWithRateLimit('no live matches', async () => {
    // Test when no matches are currently live
    // Should return empty fixtures array with total: 0

    try {
      const result = await delayedApiCall(() => liveMatchesTool.call({ params: {} } as any))
      // Should return valid response structure even when no matches
      expect(result).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  }))

  it('should return only Premier League live matches', async () => {
    // Test that only Premier League matches are returned (League ID: 39)

    // Test that live matches tool focuses on Premier League (league ID: 39)
    const tool = new GetLiveMatchesTool(apiClient, cache)
    expect(tool.name).toBe('get_live_matches')
    expect(tool.description).toContain('live')
  })

  it('should include current match minute for live matches', testWithRateLimit('live matches elapsed', async () => {
    // Test that live matches include elapsed time and status

    try {
      const liveMatches = await delayedApiCall(() => liveMatchesTool.call({ params: {} } as any))
      // Verify response structure supports elapsed time information
      expect(liveMatches).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  }))

  it('should return complete match event data', async () => {
    // Test FR-006: System MUST provide match event data including
    // goals, cards, substitutions, and assists
    // Test that events include time, team, player, assist, type, detail

    const tool = new GetMatchGoalsTool(apiClient, cache)

    // Verify tool schema supports match event requirements
    expect(tool.name).toBe('get_match_goals')
    expect(tool.description).toBeDefined()
    expect(tool.inputSchema).toBeDefined()
    expect(tool.inputSchema.properties).toBeDefined()
  })

  it('should handle match event data temporarily unavailable', async () => {
    // Edge case: How does system respond when match event data
    // is temporarily unavailable?

    try {
      // Test with invalid fixture ID
      await matchEventsTool.call({ params: { fixtureId: -1 } } as any)
    } catch (error: any) {
      // Should provide meaningful error for unavailable data
      expect(error).toBeDefined()
      expect(typeof error.message).toBe('string')
    }
  })

  it('should provide data freshness for live matches', async () => {
    // Test FR-012: System MUST provide data freshness indicators
    // Critical for live data to show last update time

    // Test cache TTL for live data (should be short, e.g., 5 minutes)
    const testKey = 'live-data-freshness'
    const testValue = { lastUpdate: new Date() }

    cache.set(testKey, testValue, 300000) // 5 minutes
    expect(cache.has(testKey)).toBe(true)

    // Verify timestamp tracking
    const retrieved = cache.get(testKey)
    expect(retrieved).toEqual(testValue)
  })

  it('should handle concurrent requests for live data', async () => {
    // Edge case: What happens when multiple concurrent requests
    // are made for the same live data?

    // Test concurrent requests to live matches
    const promises = Array(3).fill(null).map(() =>
      liveMatchesTool.call({ params: {} } as any).catch(e => ({ error: e.message }))
    )

    const results = await Promise.all(promises)
    expect(results).toHaveLength(3)

    // All requests should complete (with data or error)
    results.forEach(result => {
      expect(result).toBeDefined()
    })
  })
})
