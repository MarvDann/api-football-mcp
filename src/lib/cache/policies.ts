export interface CachePolicy {
  ttl: number // Time to live in milliseconds
  maxEntries: number
  staleWhileRevalidate?: boolean
}

export const CACHE_POLICIES = {
  // Historical data - long TTL since it doesn't change
  HISTORICAL: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 1000,
    staleWhileRevalidate: true
  },

  // Current season data - medium TTL
  CURRENT: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxEntries: 500,
    staleWhileRevalidate: true
  },

  // Live data - very short TTL
  LIVE: {
    ttl: 30 * 1000, // 30 seconds
    maxEntries: 100,
    staleWhileRevalidate: false
  },

  // Team/Player profiles - medium TTL
  PROFILES: {
    ttl: 60 * 60 * 1000, // 1 hour
    maxEntries: 200,
    staleWhileRevalidate: true
  },

  // Search results - short TTL
  SEARCH: {
    ttl: 10 * 60 * 1000, // 10 minutes
    maxEntries: 100,
    staleWhileRevalidate: true
  }
} as const

export type CachePolicyName = keyof typeof CACHE_POLICIES

export function getCachePolicy (dataType: string, season?: number): CachePolicy {
  const currentYear = new Date().getFullYear()
  const isHistorical = season && season < currentYear

  switch (dataType) {
    case 'standings':
      return isHistorical ? CACHE_POLICIES.HISTORICAL : CACHE_POLICIES.CURRENT

    case 'fixtures':
      return isHistorical ? CACHE_POLICIES.HISTORICAL : CACHE_POLICIES.CURRENT

    case 'live_fixtures':
      return CACHE_POLICIES.LIVE

    case 'match_events':
      return isHistorical ? CACHE_POLICIES.HISTORICAL : CACHE_POLICIES.CURRENT

    case 'teams':
    case 'players':
      return isHistorical ? CACHE_POLICIES.HISTORICAL : CACHE_POLICIES.PROFILES

    case 'search_teams':
    case 'search_players':
      return CACHE_POLICIES.SEARCH

    default:
      return CACHE_POLICIES.CURRENT
  }
}

export interface CacheMetrics {
  hits: number
  misses: number
  sets: number
  deletes: number
  evictions: number
  size: number
}

export class CacheMetricsTracker {
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    size: 0
  }

  hit (): void {
    this.metrics.hits++
  }

  miss (): void {
    this.metrics.misses++
  }

  set (): void {
    this.metrics.sets++
    this.metrics.size++
  }

  delete (): void {
    this.metrics.deletes++
    this.metrics.size--
  }

  evict (): void {
    this.metrics.evictions++
    this.metrics.size--
  }

  getMetrics (): CacheMetrics {
    return { ...this.metrics }
  }

  getHitRate (): number {
    const total = this.metrics.hits + this.metrics.misses
    return total > 0 ? this.metrics.hits / total : 0
  }

  reset (): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      size: 0
    }
  }
}
