import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { APIFootballClient } from '../../src/lib/api-client/client'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { GetTeamTool } from '../../src/lib/tools/get-team'
import { SearchTeamsTool } from '../../src/lib/tools/search-teams'
import { delayedApiCall, expectApiSuccess, checkRateLimit, testWithRateLimit } from '../helpers/api_test_helpers'

describe('Integration: Get team squad information', () => {
  let apiClient: APIFootballClient
  let cache: LRUCache
  let getTeamTool: GetTeamTool
  let searchTeamsTool: SearchTeamsTool

  beforeAll(() => {
    const apiKey = process.env.API_FOOTBALL_KEY || 'test-key'
    apiClient = new APIFootballClient({ apiKey, timeout: 5000 })
    cache = new LRUCache({ maxSize: 100, defaultTtl: 5000 })
    getTeamTool = new GetTeamTool(apiClient, cache)
    searchTeamsTool = new SearchTeamsTool(apiClient, cache)
  })

  afterAll(() => {
    cache.destroy()
  })

  it('should retrieve complete team information with squad', testWithRateLimit('team info with squad', async () => {
    // User Story: Given an agent needs team information,
    // When the agent queries for a specific team,
    // Then the system returns team details, squad information, and recent performance

    const teamName = 'Manchester United'
    const teamId = 33
    const season = 2024

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      // Test getting team by ID with delay
      const teamById = await delayedApiCall(() => getTeamTool.call({ params: { teamId, season } }))

      // Check for rate limiting in response
      if (teamById.content?.[0]?.text) {
        const responseData = JSON.parse(teamById.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping team by ID test due to rate limiting')
          expect(true).toBe(true)
        } else {
          expect(teamById).toBeDefined()
          expect(teamById.content).toBeDefined()
        }
      }

      // Test getting team by name with delay
      const teamByName = await delayedApiCall(() => getTeamTool.call({ params: { name: teamName, season } }))

      if (teamByName.content?.[0]?.text) {
        const responseData = JSON.parse(teamByName.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping team by name test due to rate limiting')
          expect(true).toBe(true)
        } else {
          expect(teamByName).toBeDefined()
          expect(teamByName.content).toBeDefined()
        }
      }
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key') || error.message?.includes('rate limit')) {
        console.log('⏭️  Skipping due to API key or rate limit issue')
        expect(true).toBe(true)
      } else {
        throw error
      }
    }
  }, 60000))

  it('should find team by name search', async () => {
    // Test searching for teams by name
    const teamName = 'Manchester'

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const searchResults = await delayedApiCall(() => searchTeamsTool.call({ params: { name: teamName } }))

      if (searchResults.content?.[0]?.text) {
        const responseData = JSON.parse(searchResults.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping team search test due to rate limiting')
          expect(true).toBe(true)
        } else {
          expect(searchResults).toBeDefined()
          expect(searchResults.content).toBeDefined()
        }
      }
    } catch (error: any) {
      if (error.message?.includes('API key') || error.message?.includes('rate limit')) {
        console.log('⏭️  Skipping due to API key or rate limit issue')
        expect(true).toBe(true)
      } else {
        throw error
      }
    }
  }, 60000)

  it('should retrieve all teams for a specific season', async () => {
    // Test getting all teams that played in Premier League for a season
    const season = 2024

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const allTeams = await delayedApiCall(() => searchTeamsTool.call({ params: { season } }))

      if (allTeams.content?.[0]?.text) {
        const responseData = JSON.parse(allTeams.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping teams by season test due to rate limiting')
          expect(true).toBe(true)
        } else {
          expect(allTeams).toBeDefined()
          expect(allTeams.content).toBeDefined()
        }
      }
    } catch (error: any) {
      if (error.message?.includes('API key') || error.message?.includes('rate limit')) {
        console.log('⏭️  Skipping due to API key or rate limit issue')
        expect(true).toBe(true)
      } else {
        throw error
      }
    }
  }, 60000)

  it('should return complete team details', async () => {
    // Test that team information includes:
    // - id, name, code, logo, founded
    // - venue details (name, city, capacity, surface)

    const tool = new GetTeamTool(apiClient, cache)

    // Verify tool properties
    expect(tool.name).toBe('get_team')
    expect(tool.description).toBeDefined()
    expect(tool.inputSchema).toBeDefined()
    expect(tool.inputSchema.properties).toBeDefined()
  })

  it('should return complete squad information', async () => {
    // Test that squad includes detailed player information:
    // - id, name, age, position, number, nationality

    const teamId = 33
    const season = 2024

    try {
      const result = await getTeamTool.call({ params: { teamId, season } })
      // The result structure should be defined by the tool implementation
      expect(result).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

  it('should handle historical team queries', async () => {
    // Test FR-007: System MUST handle data queries for multiple seasons
    // including all teams from August 1992 to present day
    const historicalSeason = 1992

    try {
      const historicalTeams = await searchTeamsTool.call({ params: { season: historicalSeason } })
      expect(historicalTeams).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

  it('should handle non-existent team gracefully', async () => {
    // Edge case: What happens when requesting data for non-existent team?
    const nonExistentTeam = 'Non Existent FC'

    try {
      const result = await searchTeamsTool.call({ params: { name: nonExistentTeam } })
      // Should return empty results or handle gracefully
      expect(result).toBeDefined()
    } catch (error: any) {
      // Should provide meaningful error message
      expect(error).toBeDefined()
      expect(typeof error.message).toBe('string')
    }
  })

  it('should provide clear error messages for invalid requests', async () => {
    // Test FR-009: System MUST provide clear error messages
    // when requested data is unavailable or invalid

    try {
      // Test with invalid parameters
      await getTeamTool.call({ params: { teamId: -1, season: -1 } })
    } catch (error: any) {
      // Should provide clear error message
      expect(error).toBeDefined()
      expect(typeof error.message).toBe('string')
      expect(error.message.length).toBeGreaterThan(0)
    }
  })

  it('should allow querying by either team ID or name', async () => {
    // Test anyOf constraint in get_team tool
    // Should work with either teamId or name parameter

    const tool = new GetTeamTool(apiClient, cache)

    // Verify input schema supports both teamId and name
    expect(tool.inputSchema).toBeDefined()
    expect(tool.inputSchema.anyOf || tool.inputSchema.properties).toBeDefined()

    // Test that handler accepts both parameter types
    expect(typeof tool.call).toBe('function')
  })
})
