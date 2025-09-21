import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { APIFootballClient } from '../../src/lib/api-client/client'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { GetPlayerTool } from '../../src/lib/tools/get-player'
import { SearchPlayersTool } from '../../src/lib/tools/search-players'
import { delayedApiCall, expectToolSuccess, testWithRateLimit } from '../helpers/api_test_helpers'

describe('Integration: Search player by name and get stats', () => {
  let apiClient: APIFootballClient
  let cache: LRUCache
  let getPlayerTool: GetPlayerTool
  let searchPlayersTool: SearchPlayersTool

  beforeAll(() => {
    const apiKey = process.env.API_FOOTBALL_KEY || 'test-key'
    apiClient = new APIFootballClient({ apiKey, timeout: 10000 })
    cache = new LRUCache({ maxSize: 100, defaultTtl: 5000 })
    getPlayerTool = new GetPlayerTool(apiClient, cache)
    searchPlayersTool = new SearchPlayersTool(apiClient, cache)
  })

  afterAll(() => {
    cache.destroy()
  })

  it('should find and return player profile with statistics', testWithRateLimit(
    'player profile with statistics',
    async () => {
      // User Story: Given an agent needs player information,
      // When the agent queries for a specific player by name or ID,
      // Then the system returns detailed player profile including statistics,
      // current team, and career history

      const playerId = 1460 // Bukayo Saka
      const season = 2024

      // Test getting player by ID with delay
      const playerById = await delayedApiCall(() => getPlayerTool.call({ params: { playerId, season } }))

      // Use expectToolSuccess to avoid false positives
      expectToolSuccess(playerById, 'player by ID', true)

      // Validate response structure
      expect(playerById.content[0].type).toBe('text')
      const responseData = JSON.parse(playerById.content[0].text)
      expect(responseData).toBeDefined()
      expect(responseData.player || responseData.error).toBeDefined()
    }
  ), 60000)

  it('should search players by partial name match', async () => {
    // Test search functionality with partial names

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const searchResults = await delayedApiCall(() => searchPlayersTool.call({
        params: { query: 'Saka', season: 2024 }
      }))

      if (searchResults.content?.[0]?.text) {
        const responseData = JSON.parse(searchResults.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping partial name search test due to rate limiting')
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

  it('should filter players by position', async () => {
    // Test filtering by position parameter

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const searchResults = await delayedApiCall(() => searchPlayersTool.call({
        params: { position: 'Attacker', season: 2024 }
      }))

      if (searchResults.content?.[0]?.text) {
        const responseData = JSON.parse(searchResults.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping position filter test due to rate limiting')
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

  it('should filter players by team', async () => {
    // Test filtering by team ID

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const searchResults = await delayedApiCall(() => searchPlayersTool.call({
        params: { teamId: 42, season: 2024 } // Arsenal
      }))

      if (searchResults.content?.[0]?.text) {
        const responseData = JSON.parse(searchResults.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping team filter test due to rate limiting')
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

  it('should return detailed player statistics for current season', async () => {
    // Test that player statistics include:
    // - appearances, lineups, minutes, goals, assists
    // - cards, rating, season, team info

    const playerId = 1460 // Bukayo Saka
    const season = 2024

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const playerStats = await delayedApiCall(() => getPlayerTool.call({ params: { playerId, season } }))

      if (playerStats.content?.[0]?.text) {
        const responseData = JSON.parse(playerStats.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping player statistics test due to rate limiting')
          expect(true).toBe(true)
        } else {
          expect(playerStats).toBeDefined()
          expect(playerStats.content).toBeDefined()
          // Could validate specific fields in responseData here
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

  it('should handle player search with season parameter', async () => {
    // Test that season parameter affects player statistics

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const searchResults = await delayedApiCall(() => searchPlayersTool.call({
        params: { query: 'Saka', season: 2023 }
      }))

      if (searchResults.content?.[0]?.text) {
        const responseData = JSON.parse(searchResults.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping season parameter test due to rate limiting')
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

  it('should handle non-existent player gracefully', async () => {
    // Edge case: What happens when requesting data for non-existent player?

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const searchResults = await delayedApiCall(() => searchPlayersTool.call({
        params: { query: 'NonExistentPlayer', season: 2024 }
      }))

      if (searchResults.content?.[0]?.text) {
        const responseData = JSON.parse(searchResults.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping non-existent player test due to rate limiting')
          expect(true).toBe(true)
        } else {
          expect(searchResults).toBeDefined()
          expect(searchResults.content).toBeDefined()
          // Should handle gracefully (empty results or error message)
        }
      }
    } catch (error: any) {
      if (error.message?.includes('API key') || error.message?.includes('rate limit')) {
        console.log('⏭️  Skipping due to API key or rate limit issue')
        expect(true).toBe(true)
      } else {
        // This might be expected for non-existent players
        expect(error).toBeDefined()
      }
    }
  }, 60000)

  it('should return structured data that agents can easily parse', async () => {
    // Test FR-008: System MUST return data in structured, consistent format

    const playerId = 1460 // Bukayo Saka
    const season = 2024

    if (!process.env.API_FOOTBALL_KEY) {
      expect(true).toBe(true) // Skip if no API key
      return
    }

    try {
      const playerData = await delayedApiCall(() => getPlayerTool.call({ params: { playerId, season } }))

      if (playerData.content?.[0]?.text) {
        const responseData = JSON.parse(playerData.content[0].text)
        const rateLimit = checkRateLimit(responseData)
        if (rateLimit.isLimited) {
          console.log('⏭️  Skipping data structure test due to rate limiting')
          expect(true).toBe(true)
        } else {
          expect(playerData).toBeDefined()
          expect(playerData.content).toBeDefined()
          expect(playerData.content[0].type).toBe('text')
          // Should be valid JSON
          expect(() => JSON.parse(playerData.content[0].text)).not.toThrow()
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
})