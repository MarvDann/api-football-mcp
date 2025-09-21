import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { DataService } from '../../src/services/data-service'
import { APIFootballClient } from '../../src/lib/api-client/client'

// Mock API client for performance tests
class MockAPIFootballClient extends APIFootballClient {
  private latency: number

  constructor (latency = 100) {
    // Create with minimal config for testing
    super({ apiKey: 'test-key' })
    this.latency = latency
  }

  // Override methods to simulate network latency without making real API calls
  async getStandings (season?: number) {
    await this.simulateLatency()
    return {
      get: '/standings',
      parameters: { league: '39', season: season?.toString() ?? '2023' },
      errors: [],
      results: 1,
      response: [
        {
          league: {
            id: 39,
            name: 'Premier League',
            country: 'England',
            logo: '',
            flag: '',
            season: season ?? 2023,
            standings: [[{
              rank: 1,
              team: { id: 1, name: 'Test Team', logo: '' },
              points: 10,
              goalsDiff: 5,
              group: 'Premier League',
              form: 'WWWWW',
              status: 'same',
              description: 'Test',
              all: { played: 5, win: 5, draw: 0, lose: 0, goals: { for: 10, against: 5 } },
              home: { played: 3, win: 3, draw: 0, lose: 0, goals: { for: 6, against: 2 } },
              away: { played: 2, win: 2, draw: 0, lose: 0, goals: { for: 4, against: 3 } },
              update: new Date().toISOString()
            }]]
          }
        }
      ],
      paging: { current: 1, total: 1 }
    }
  }

  async getFixtures (params: any) {
    await this.simulateLatency()
    return {
      get: '/fixtures',
      parameters: { league: '39', ...params },
      errors: [],
      results: 1,
      response: [{
        fixture: {
          id: 1,
          date: '2023-01-01T00:00:00Z',
          timestamp: 1672531200,
          status: { long: 'Match Finished', short: 'FT', elapsed: 90 },
          referee: 'Test Ref',
          timezone: 'UTC'
        },
        league: { id: 39, name: 'Premier League', season: params?.season ?? 2023, round: 'Regular Season - 1', country: 'England', logo: '', flag: '' },
        teams: { home: { id: 1, name: 'Home' }, away: { id: 2, name: 'Away' } },
        goals: { home: 1, away: 0 },
        score: { halftime: { home: 1, away: 0 }, fulltime: { home: 1, away: 0 } }
      }],
      paging: { current: 1, total: 1 }
    }
  }

  async getTeams (season?: number) {
    await this.simulateLatency()
    return {
      get: '/teams',
      parameters: { league: '39', season: season?.toString() ?? '2023' },
      errors: [],
      results: 1,
      response: [{ team: { id: 1, name: 'Test Team', country: 'England', logo: '' }, venue: { id: 1, name: 'Stadium', city: 'City' } }],
      paging: { current: 1, total: 1 }
    }
  }

  async getPlayers (params: any) {
    await this.simulateLatency()
    return {
      get: '/players',
      parameters: { league: '39', ...params },
      errors: [],
      results: 1,
      response: [{
        player: {
          id: 1,
          name: 'Test Player',
          firstname: 'Test',
          lastname: 'Player',
          age: 25,
          birth: { date: '2000-01-01', place: 'City', country: 'Country' },
          nationality: 'Country',
          height: '180 cm',
          weight: '75 kg',
          injured: false,
          photo: ''
        },
        statistics: []
      }],
      paging: { current: 1, total: 1 }
    }
  }

  private async simulateLatency (): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.latency))
  }
}

describe('Performance - Concurrent Requests', () => {
  let dataService: DataService
  let cache: LRUCache
  let mockClient: MockAPIFootballClient

  const PERFORMANCE_THRESHOLDS = {
    CACHE_HIT_MAX_TIME: 10, // milliseconds
    CONCURRENT_REQUESTS_MAX_TIME: 1000, // milliseconds for batch
    CACHE_HIT_RATE_MIN: 0.8 // 80% minimum hit rate for repeated requests
  }

  beforeEach(() => {
    cache = new LRUCache({
      maxSize: 1000,
      defaultTtl: 60000, // 1 minute
      checkInterval: 5000
    })

    mockClient = new MockAPIFootballClient(50) // 50ms simulated latency

    dataService = new DataService({
      apiClient: mockClient,
      cache,
      enableCaching: true,
      enableLogging: false // Disable logging for performance tests
    })
  })

  afterEach(() => {
    cache.destroy()
  })

  describe('Cache Performance', () => {
    it('should serve cached data within performance threshold', async () => {
      const key = 'test-standings-2023'

      // First request (cache miss)
      await dataService.getStandings(2023)

      // Second request (cache hit) - measure time
      const startTime = performance.now()
      await dataService.getStandings(2023)
      const endTime = performance.now()

      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_HIT_MAX_TIME)
    })

    it('should maintain high hit rate for repeated requests', async () => {
      // First, warm up the cache with initial request
      await dataService.getStandings(2023)

      // Reset cache stats to measure hit rate for subsequent requests
      const initialStats = cache.getStats()

      const requests = []
      // Make multiple requests for the same data after cache is warmed
      for (let i = 0; i < 100; i++) {
        requests.push(dataService.getStandings(2023))
      }

      await Promise.all(requests)

      const stats = cache.getStats()
      // Calculate hit rate based on new requests only
      const newHits = stats.metrics.hits - initialStats.metrics.hits
      const newRequests = stats.metrics.hits + stats.metrics.misses - (initialStats.metrics.hits + initialStats.metrics.misses)
      const newHitRate = newRequests > 0 ? newHits / newRequests : 0

      expect(newHitRate).toBeGreaterThan(PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_MIN)
    })

    it('should handle cache under high load', async () => {
      const concurrentRequests = 200
      const requests = []

      // Create many concurrent requests for different data
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(dataService.getStandings(1992 + (i % 32))) // Vary seasons
      }

      const startTime = performance.now()
      await Promise.all(requests)
      const endTime = performance.now()

      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS_MAX_TIME * 2)

      // Cache should still be operational
      const stats = cache.getStats()
      expect(stats.size).toBeGreaterThan(0)
    })
  })

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent requests to same endpoint efficiently', async () => {
      const concurrentRequests = 50

      // First, populate cache with one request
      await dataService.getStandings(2023)

      // Reset metrics to measure only the concurrent requests
      const initialStats = cache.getStats()

      const requests = []
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(dataService.getStandings(2023))
      }

      const startTime = performance.now()
      const results = await Promise.all(requests)
      const endTime = performance.now()

      const totalTime = endTime - startTime

      // All requests should complete successfully
      expect(results).toHaveLength(concurrentRequests)
      results.forEach(result => {
        expect(result.response).toBeDefined()
      })

      // Time should be reasonable (fast due to caching)
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS_MAX_TIME)

      // Calculate hit rate for just the concurrent requests
      const currentStats = cache.getStats()
      const newHits = currentStats.metrics.hits - initialStats.metrics.hits
      const newRequests = (currentStats.metrics.hits + currentStats.metrics.misses) - (initialStats.metrics.hits + initialStats.metrics.misses)
      const concurrentHitRate = newRequests > 0 ? newHits / newRequests : 0

      // Most concurrent requests should have been cache hits
      expect(concurrentHitRate).toBeGreaterThan(0.9) // 90% hit rate expected
    })

    it('should handle mixed concurrent requests efficiently', async () => {
      const requests = [
        // Mix different types of requests
        ...Array(20).fill(null).map(() => dataService.getStandings(2023)),
        ...Array(20).fill(null).map(() => dataService.getFixtures({ season: 2023 })),
        ...Array(20).fill(null).map(() => dataService.getTeams(2023)),
        ...Array(20).fill(null).map(() => dataService.getPlayers({ team: 1 }))
      ]

      const startTime = performance.now()
      const results = await Promise.all(requests)
      const endTime = performance.now()

      const totalTime = endTime - startTime

      // All requests should complete
      expect(results).toHaveLength(80)

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS_MAX_TIME * 1.5)
    })

    it('should maintain performance under high concurrent load', async () => {
      const highLoad = 500
      const batches = []

      // Create multiple batches of concurrent requests
      for (let batch = 0; batch < 5; batch++) {
        const batchRequests = []
        for (let i = 0; i < highLoad / 5; i++) {
          batchRequests.push(dataService.getStandings(2020 + (i % 5)))
        }
        batches.push(Promise.all(batchRequests))
      }

      const startTime = performance.now()
      await Promise.all(batches)
      const endTime = performance.now()

      const totalTime = endTime - startTime

      // Should handle high load without excessive degradation
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS_MAX_TIME * 3)

      // Cache should be stable
      const stats = cache.getStats()
      expect(stats.size).toBeGreaterThan(0)
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize)
    })
  })

  describe('Memory and Resource Management', () => {
    it('should not cause memory leaks with many requests', async () => {
      const initialMemory = process.memoryUsage()
      const manyRequests = 1000

      // Make many requests in batches to avoid overwhelming
      const batchSize = 50
      for (let i = 0; i < manyRequests; i += batchSize) {
        const batch = []
        for (let j = 0; j < batchSize && i + j < manyRequests; j++) {
          batch.push(dataService.getStandings(1992 + ((i + j) % 32)))
        }
        await Promise.all(batch)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)

      // Cache should maintain reasonable size
      const stats = cache.getStats()
      expect(stats.size).toBeLessThanOrEqual(stats.maxSize)
    })

    it('should handle cache eviction under pressure', async () => {
      // Set smaller cache for this test
      const smallCache = new LRUCache({
        maxSize: 10, // Very small cache
        defaultTtl: 60000,
        checkInterval: 1000
      })

      const smallDataService = new DataService({
        apiClient: mockClient,
        cache: smallCache,
        enableCaching: true,
        enableLogging: false
      })

      try {
        // Make more requests than cache can hold
        const requests = []
        for (let i = 0; i < 50; i++) {
          requests.push(smallDataService.getStandings(1992 + i))
        }

        await Promise.all(requests)

        const stats = smallCache.getStats()

        // Cache should not exceed max size
        expect(stats.size).toBeLessThanOrEqual(10)

        // Should have some evictions
        expect(stats.metrics.evictions || 0).toBeGreaterThan(0)
      } finally {
        smallCache.destroy()
      }
    })
  })

  describe('Latency and Response Time', () => {
    it('should maintain consistent response times under load', async () => {
      const samples = 100
      const responseTimes: number[] = []

      // Warm up cache
      await dataService.getStandings(2023)

      // Measure response times for cached requests
      for (let i = 0; i < samples; i++) {
        const startTime = performance.now()
        await dataService.getStandings(2023)
        const endTime = performance.now()
        responseTimes.push(endTime - startTime)
      }

      // Calculate statistics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      const maxResponseTime = Math.max(...responseTimes)
      const minResponseTime = Math.min(...responseTimes)

      // Assert performance characteristics
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_HIT_MAX_TIME)
      expect(maxResponseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_HIT_MAX_TIME * 2)
      expect(minResponseTime).toBeGreaterThan(0)

      // Variance should be low for cached requests
      const variance = responseTimes.reduce((acc, time) => {
        return acc + Math.pow(time - avgResponseTime, 2)
      }, 0) / responseTimes.length

      expect(variance).toBeLessThan(100) // Low variance expected
    })

    it('should handle timeout scenarios gracefully', async () => {
      // Create client with very high latency
      const slowClient = new MockAPIFootballClient(2000) // 2 second delay

      const slowDataService = new DataService({
        apiClient: slowClient,
        cache,
        enableCaching: true,
        enableLogging: false
      })

      // This test would normally timeout, but our mock doesn't actually timeout
      // Instead, we test that slow requests don't block other operations

      const fastRequest = dataService.getStandings(2023) // Uses cached data or fast client
      const slowRequest = slowDataService.getStandings(2024) // Uses slow client

      const startTime = performance.now()

      // Fast request should complete quickly even while slow request is running
      await fastRequest

      const fastCompleteTime = performance.now()
      const fastDuration = fastCompleteTime - startTime

      expect(fastDuration).toBeLessThan(200) // Should complete quickly

      // Wait for slow request to complete
      await slowRequest

      const totalTime = performance.now() - startTime
      expect(totalTime).toBeGreaterThan(1900) // Should take at least 2 seconds for slow client
    })
  })

  describe('Batch Operations Performance', () => {
    it('should efficiently handle batch requests', async () => {
      const batchRequests = [
        () => dataService.getStandings(2023),
        () => dataService.getFixtures({ season: 2023 }),
        () => dataService.getTeams(2023),
        () => dataService.getPlayers({ team: 1 }),
        () => dataService.getStandings(2022),
        () => dataService.getFixtures({ season: 2022 })
      ]

      const startTime = performance.now()
      const results = await dataService.batchRequest(batchRequests, { maxConcurrency: 3 })
      const endTime = performance.now()

      const totalTime = endTime - startTime

      // All requests should succeed
      expect(results).toHaveLength(6)

      // Should complete efficiently with concurrency limit
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_REQUESTS_MAX_TIME)

      // Should be faster than sequential execution
      const estimatedSequentialTime = batchRequests.length * 50 // 50ms per request
      expect(totalTime).toBeLessThan(estimatedSequentialTime)
    })

    it('should respect concurrency limits in batch operations', async () => {
      const largeRequestBatch = Array(20).fill(null).map((_, i) =>
        () => dataService.getStandings(2000 + i)
      )

      const startTime = performance.now()
      await dataService.batchRequest(largeRequestBatch, { maxConcurrency: 5 })
      const endTime = performance.now()

      const totalTime = endTime - startTime

      // Should complete all requests
      // Time should reflect concurrency limit (not all at once, not sequential)
      const minExpectedTime = Math.ceil(largeRequestBatch.length / 5) * 50 // Minimum with perfect batching
      const maxExpectedTime = largeRequestBatch.length * 50 // Sequential maximum

      expect(totalTime).toBeGreaterThan(minExpectedTime * 0.8) // Some overhead allowed
      expect(totalTime).toBeLessThan(maxExpectedTime * 0.6) // Should be much faster than sequential
    })
  })
})
