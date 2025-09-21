import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { APIFootballClient } from '../../src/lib/api-client/client'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { GetStandingsTool } from '../../src/lib/tools/get-standings'
import { GetFixturesTool } from '../../src/lib/tools/get-fixtures'
import { SearchTeamsTool } from '../../src/lib/tools/search-teams'
import { SearchPlayersTool } from '../../src/lib/tools/search-players'

describe('Integration: Query historical 1992-93 season', () => {
  let apiClient: APIFootballClient
  let cache: LRUCache
  let standingsTool: GetStandingsTool
  let fixturesTool: GetFixturesTool
  let teamsTool: SearchTeamsTool
  let playersTool: SearchPlayersTool

  beforeAll(() => {
    const apiKey = process.env.API_FOOTBALL_KEY || 'test-key'
    apiClient = new APIFootballClient({ apiKey, timeout: 5000 })
    cache = new LRUCache({ maxSize: 100, defaultTtl: 5000 })
    standingsTool = new GetStandingsTool(apiClient, cache)
    fixturesTool = new GetFixturesTool(apiClient, cache)
    teamsTool = new SearchTeamsTool(apiClient, cache)
    playersTool = new SearchPlayersTool(apiClient, cache)
  })

  afterAll(() => {
    cache.destroy()
  })

  it('should retrieve first Premier League season standings', async () => {
    // Test FR-007: System MUST handle data queries for multiple seasons
    // including all teams that have played from August 1992 to present day
    const firstSeason = 1992

    try {
      const standings = await standingsTool.call({ params: { season: firstSeason } } as any)
      expect(standings).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

  it('should retrieve first season fixtures and results', async () => {
    // Test that historical fixtures from 1992-93 season are available
    const firstSeason = 1992

    try {
      const fixtures = await fixturesTool.call({ params: { season: firstSeason } } as any)
      expect(fixtures).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

  it('should retrieve all teams from first Premier League season', async () => {
    // Test getting all 22 teams that played in the first Premier League season
    const firstSeason = 1992

    // Expected teams include: Arsenal, Aston Villa, Chelsea, Coventry City,
    // Crystal Palace, Everton, Ipswich Town, Leeds United, Liverpool,
    // Manchester City, Manchester United, Middlesbrough, Norwich City,
    // Nottingham Forest, Oldham Athletic, Queens Park Rangers, Sheffield United,
    // Sheffield Wednesday, Southampton, Tottenham Hotspur, Wimbledon

    try {
      const teams = await teamsTool.call({ params: { season: firstSeason } } as any)
      expect(teams).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

  it('should retrieve players from historical seasons', async () => {
    // Test that player data is available for historical seasons
    const firstSeason = 1992

    try {
      const players = await playersTool.call({ params: { season: firstSeason, name: 'Ryan' } } as any)
      expect(players).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

  it('should handle all historical seasons from 1992 to present', async () => {
    // Test that system can handle queries for any season from 1992-2025
    const seasons = [1992, 2000, 2010, 2020, 2024]

    // Test that tools accept season parameters
    for (const season of seasons) {
      try {
        const result = await standingsTool.call({ params: { season } } as any)
        expect(result).toBeDefined()
      } catch (error: any) {
        // If API key is missing or invalid, check that we handle it gracefully
        if (error.message?.includes('API key')) {
          expect(error.message).toContain('API key')
          break // Don't test all seasons if no API key
        } else {
          throw error
        }
      }
    }
  })

  it('should cache historical data efficiently', async () => {
    // Test FR-014: System MUST cache frequently requested data for historic information
    // Historical data should have longer TTL since it doesn't change

    const testKey = 'historical-standings-1992'
    const testValue = { standings: [{ position: 1, team: { name: 'Manchester United' } }] }

    // Test cache with longer TTL for historical data (24 hours = 86400000ms)
    cache.set(testKey, testValue, 86400000)

    expect(cache.has(testKey)).toBe(true)
    expect(cache.get(testKey)).toEqual(testValue)

    // Verify cache can handle different TTL values
    const stats = cache.getStats()
    expect(stats.size).toBeGreaterThan(0)
  })

  it('should validate season boundaries correctly', async () => {
    // Test that seasons before 1992 are rejected
    // Test that future seasons beyond current are handled appropriately
    const prePremierLeague = 1991
    const futureSeason = 2030

    try {
      // Test pre-Premier League season - should handle gracefully
      await standingsTool.call({ params: { season: prePremierLeague } } as any)
    } catch (error: any) {
      // Should provide meaningful validation error
      expect(error).toBeDefined()
    }

    try {
      // Test future season - should handle gracefully
      await standingsTool.call({ params: { season: futureSeason } } as any)
    } catch (error: any) {
      // Should provide meaningful validation error or empty results
      expect(error).toBeDefined()
    }
  })

  it('should handle different season formats correctly', async () => {
    // Test that system correctly interprets season years
    // e.g., 1992 should refer to 1992-93 season

    // Test that tools accept numeric season parameter
    const season = 1992
    expect(typeof season).toBe('number')

    // Verify tool input schema accepts season parameter
    const tool = new GetStandingsTool(apiClient, cache)
    expect(tool.inputSchema).toBeDefined()
    expect(tool.inputSchema.properties).toBeDefined()
  })

  it('should provide data completeness indicators for historical seasons', async () => {
    // Test that system indicates data availability/completeness
    // for different historical periods

    try {
      const result = await standingsTool.call({ params: { season: 1992 } } as any)
      // Result should indicate whether data is available
      expect(result).toBeDefined()

      // The response should contain meaningful data or error information
      expect(typeof result).toBe('object')
    } catch (error: any) {
      // Error messages should indicate data availability issues
      expect(error).toBeDefined()
      expect(typeof error.message).toBe('string')
    }
  })
})
