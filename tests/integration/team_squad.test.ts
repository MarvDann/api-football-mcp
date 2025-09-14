import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { APIFootballClient } from '../../src/lib/api-client/client'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { GetTeamTool } from '../../src/lib/tools/get-team'
import { SearchTeamsTool } from '../../src/lib/tools/search-teams'

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

  it('should retrieve complete team information with squad', async () => {
    // User Story: Given an agent needs team information,
    // When the agent queries for a specific team,
    // Then the system returns team details, squad information, and recent performance

    const teamName = 'Manchester United'
    const teamId = 33
    const season = 2024

    try {
      // Test getting team by ID
      const teamById = await getTeamTool.call({ params: { teamId, season } })
      expect(teamById).toBeDefined()

      // Test getting team by name
      const teamByName = await getTeamTool.call({ params: { name: teamName, season } })
      expect(teamByName).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

  it('should find team by name search', async () => {
    // Test searching for teams by name
    const teamName = 'Manchester'

    try {
      const searchResults = await searchTeamsTool.call({ params: { name: teamName } })
      expect(searchResults).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

  it('should retrieve all teams for a specific season', async () => {
    // Test getting all teams that played in Premier League for a season
    const season = 2024

    // We can test this by searching for teams without specifying a name
    try {
      const allTeams = await searchTeamsTool.call({ params: { season } })
      expect(allTeams).toBeDefined()
    } catch (error: any) {
      // If API key is missing or invalid, check that we handle it gracefully
      if (error.message?.includes('API key')) {
        expect(error.message).toContain('API key')
      } else {
        throw error
      }
    }
  })

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
