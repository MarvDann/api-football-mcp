import { APIFootballClient } from '../lib/api-client/client'
import { LRUCache } from '../lib/cache/lru-cache'
import { generateCacheKey, CacheKeyType } from '../lib/cache/keys'
import { getCachePolicy } from '../lib/cache/policies'
import { logger, PerformanceTimer } from '../lib/server/logger'
import type { ApiResponse } from '../lib/api-client/endpoints'
import { createOptionalObject } from '../lib/utils/object-utils'

export interface DataServiceConfig {
  apiClient: APIFootballClient
  cache: LRUCache
  enableCaching?: boolean
  enableLogging?: boolean
}

export interface QueryOptions {
  bypassCache?: boolean
  cacheTtl?: number
  requestId?: string
}

export class DataService {
  private apiClient: APIFootballClient
  private cache: LRUCache
  private enableCaching: boolean
  private enableLogging: boolean

  constructor (config: DataServiceConfig) {
    this.apiClient = config.apiClient
    this.cache = config.cache
    this.enableCaching = config.enableCaching ?? true
    this.enableLogging = config.enableLogging ?? true
  }

  // Standings
  async getStandings (season?: number, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const params = { season: season || new Date().getFullYear() }
    const cacheKey = generateCacheKey('standings', params)
    const cacheType: CacheKeyType = 'standings'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getStandings(season),
      options,
      'getStandings',
      params
    )
  }

  // Fixtures
  async getFixtures (params: {
    season?: number
    team?: number
    from?: string
    to?: string
    date?: string
    status?: string
    limit?: number
  } = {}, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const cacheKey = generateCacheKey('fixtures', params)
    const cacheType: CacheKeyType = 'fixtures'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getFixtures(params),
      options,
      'getFixtures',
      params
    )
  }

  async getLiveFixtures (options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const cacheKey = generateCacheKey('fixtures', { live: true })
    const cacheType: CacheKeyType = 'fixtures'

    // Live data has shorter cache TTL
    const liveOptions = {
      ...options,
      cacheTtl: options.cacheTtl || 30 * 1000 // 30 seconds for live data
    }

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getLiveFixtures(),
      liveOptions,
      'getLiveFixtures',
      { live: true }
    )
  }

  // Teams
  async getTeams (season?: number, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const params = { season: season || new Date().getFullYear() }
    const cacheKey = generateCacheKey('teams', params)
    const cacheType: CacheKeyType = 'teams'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getTeams(season),
      options,
      'getTeams',
      params
    )
  }

  async getTeam (teamId: number, season?: number, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const params = { id: teamId, ...(season && { season }) }
    const cacheKey = generateCacheKey('teams', params)
    const cacheType: CacheKeyType = 'teams'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getTeam(teamId, season),
      options,
      'getTeam',
      params
    )
  }

  async searchTeams (query: string, season?: number, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const params = { search: query, ...(season && { season }) }
    const cacheKey = generateCacheKey('teams', params)
    const cacheType: CacheKeyType = 'teams'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.searchTeams(query),
      options,
      'searchTeams',
      params
    )
  }

  // Players
  async getPlayers (params: {
    team?: number
    season?: number
    search?: string
    page?: number
  } = {}, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const cacheKey = generateCacheKey('players', params)
    const cacheType: CacheKeyType = 'players'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getPlayers(params),
      options,
      'getPlayers',
      params
    )
  }

  async getPlayer (playerId: number, season?: number, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const params = { id: playerId, ...(season && { season }) }
    const cacheKey = generateCacheKey('players', params)
    const cacheType: CacheKeyType = 'players'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getPlayer(playerId, season),
      options,
      'getPlayer',
      params
    )
  }

  async searchPlayers (query: string, params: {
    team?: number
    season?: number
    page?: number
  } = {}, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const searchParams = { search: query, ...params }
    const cacheKey = generateCacheKey('players', searchParams)
    const cacheType: CacheKeyType = 'players'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.searchPlayers(query, params),
      options,
      'searchPlayers',
      searchParams
    )
  }

  async getSquad (teamId: number, season?: number, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const params = { team: teamId, ...(season && { season }) }
    const cacheKey = generateCacheKey('players', params)
    const cacheType: CacheKeyType = 'players'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getSquad(teamId, season),
      options,
      'getSquad',
      params
    )
  }

  // Match Events
  async getFixtureEvents (fixtureId: number, options: QueryOptions = {}): Promise<ApiResponse<any[]>> {
    const params = { fixture: fixtureId }
    const cacheKey = generateCacheKey('events', params)
    const cacheType: CacheKeyType = 'events'

    return this.cachedApiCall(
      cacheKey,
      cacheType,
      () => this.apiClient.getFixtureEvents(fixtureId),
      options,
      'getFixtureEvents',
      params
    )
  }

  // Cache management methods
  clearCache (): void {
    this.cache.clear()
    if (this.enableLogging) {
      logger.info('Data service cache cleared')
    }
  }

  getCacheStats () {
    return this.cache.getStats()
  }

  invalidateCacheByPattern (pattern: string): number {
    const keys = this.cache.findKeys(pattern)
    const deleted = this.cache.deleteMany(keys)

    if (this.enableLogging) {
      logger.info(`Invalidated ${deleted} cache entries matching pattern: ${pattern}`)
    }

    return deleted
  }

  invalidateCacheByType (type: CacheKeyType): number {
    return this.invalidateCacheByPattern(`^${type}:`)
  }

  // Batch operations
  async batchRequest<T>(
    requests: (() => Promise<T>)[],
    options: QueryOptions & { maxConcurrency?: number } = {}
  ): Promise<T[]> {
    const maxConcurrency = options.maxConcurrency || 5
    const timer = PerformanceTimer.start()

    try {
      const results: T[] = []

      // Process requests in batches
      for (let i = 0; i < requests.length; i += maxConcurrency) {
        const batch = requests.slice(i, i + maxConcurrency)
        const batchResults = await Promise.all(batch.map(req => req()))
        results.push(...batchResults)
      }

      if (this.enableLogging) {
        timer.end(`Batch request completed: ${requests.length} requests`)
      }

      return results
    } catch (error) {
      if (this.enableLogging) {
        timer.endWithError(`Batch request failed: ${requests.length} requests`, error as Error)
      }
      throw error
    }
  }

  // Health check
  async healthCheck (): Promise<{
    api: { connected: boolean; rateLimitRemaining: number }
    cache: { size: number; hitRate: number }
  }> {
    try {
      const rateLimitInfo = this.apiClient.getRateLimitInfo()
      const cacheStats = this.cache.getStats()

      return {
        api: {
          connected: rateLimitInfo.remaining > 0,
          rateLimitRemaining: rateLimitInfo.remaining
        },
        cache: {
          size: cacheStats.size,
          hitRate: cacheStats.hitRate
        }
      }
    } catch (error) {
      if (this.enableLogging) {
        logger.error('Health check failed', error as Error)
      }
      return {
        api: { connected: false, rateLimitRemaining: 0 },
        cache: { size: 0, hitRate: 0 }
      }
    }
  }

  // Private helper method for cached API calls
  private async cachedApiCall<T>(
    cacheKey: string,
    cacheType: CacheKeyType,
    apiCall: () => Promise<T>,
    options: QueryOptions,
    method: string,
    params: any
  ): Promise<T> {
    const timer = PerformanceTimer.start()

    if (this.enableLogging) {
      const context = options.requestId ? { requestId: options.requestId } : {}
      logger.apiCall(method, params, context)
    }

    try {
      // Check cache first (unless bypassing)
      if (this.enableCaching && !options.bypassCache) {
        const cached = this.cache.get(cacheKey)
        if (cached !== null) {
          if (this.enableLogging) {
            const context = options.requestId ? { requestId: options.requestId } : {}
            logger.cacheOperation('hit', cacheKey, true, context)
            timer.end(`${method} completed (cached)`)
          }
          return cached as T
        }

        if (this.enableLogging) {
          const context = options.requestId ? { requestId: options.requestId } : {}
          logger.cacheOperation('miss', cacheKey, false, context)
        }
      }

      // Make API call
      const result = await apiCall()

      // Cache the result
      if (this.enableCaching && result) {
        const policy = getCachePolicy(cacheType)
        const ttl = options.cacheTtl || policy.ttl

        this.cache.set(cacheKey, result, ttl)

        if (this.enableLogging) {
          const context = options.requestId
            ? { requestId: options.requestId, ttl: Math.round(ttl / 1000) }
            : { ttl: Math.round(ttl / 1000) }
          logger.cacheOperation('set', cacheKey, undefined, context)
        }
      }

      if (this.enableLogging) {
        timer.end(`${method} completed`)
      }

      return result
    } catch (error) {
      if (this.enableLogging) {
        const context = options.requestId ? { requestId: options.requestId } : {}
        timer.endWithError(`${method} failed`, error as Error, context)
      }
      throw error
    }
  }
}
