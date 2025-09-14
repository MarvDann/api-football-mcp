import { createHash } from 'crypto'

export type CacheKeyParams = Record<string, string | number | boolean | null | undefined>
export type CacheKeyType = 'standings' | 'fixtures' | 'teams' | 'players' | 'events'

export function generateCacheKey (
  dataType: string,
  params: CacheKeyParams = {}
): string {
  // Sort parameters for consistent key generation
  const sortedParams = Object.keys(params)
    .sort()
    .reduce<CacheKeyParams>((acc, key) => {
      const value = params[key]
      if (value !== undefined && value !== null) {
        acc[key] = value
      }
      return acc
    }, {})

  // Create a deterministic string representation
  const paramString = JSON.stringify(sortedParams)

  // Create a hash for shorter keys (optional - can use full string for debugging)
  const hash = createHash('sha256')
    .update(`${dataType}:${paramString}`)
    .digest('hex')
    .substring(0, 16) // Use first 16 characters for shorter keys

  return `${dataType}:${hash}`
}

// Specific key generators for each data type
export const CacheKeys = {
  standings: (season?: number) =>
    generateCacheKey('standings', {
      league: 39, // Premier League ID
      season: season || new Date().getFullYear()
    }),

  fixtures: (params: {
    season?: number
    team?: number
    from?: string
    to?: string
    date?: string
    status?: string
    limit?: number
  }) =>
    generateCacheKey('fixtures', {
      league: 39,
      ...params
    }),

  liveFixtures: () =>
    generateCacheKey('live_fixtures', { league: 39 }),

  team: (teamId: number, season?: number) =>
    generateCacheKey('team', { id: teamId, season }),

  teams: (season?: number) =>
    generateCacheKey('teams', {
      league: 39,
      season: season || new Date().getFullYear()
    }),

  searchTeams: (query: string, season?: number) =>
    generateCacheKey('search_teams', {
      league: 39,
      search: query.toLowerCase(),
      season
    }),

  player: (playerId: number, season?: number) =>
    generateCacheKey('player', { id: playerId, season }),

  players: (params: {
    team?: number
    season?: number
    search?: string
    page?: number
  }) =>
    generateCacheKey('players', {
      league: 39,
      ...params,
      search: params.search?.toLowerCase()
    }),

  searchPlayers: (query: string, params: {
    team?: number
    season?: number
    page?: number
  }) =>
    generateCacheKey('search_players', {
      league: 39,
      search: query.toLowerCase(),
      ...params
    }),

  squad: (teamId: number, season?: number) =>
    generateCacheKey('squad', { team: teamId, season }),

  matchEvents: (fixtureId: number) =>
    generateCacheKey('match_events', { fixture: fixtureId }),

  fixtureEvents: (fixtureId: number) =>
    generateCacheKey('fixture_events', { fixture: fixtureId })
}

// Cache key patterns for batch operations
export const CacheKeyPatterns = {
  standings: (season?: number) =>
    season ? `standings:*:${season}` : 'standings:*',

  fixtures: (season?: number) =>
    season ? `fixtures:*:${season}` : 'fixtures:*',

  teams: (season?: number) =>
    season ? `teams:*:${season}` : 'teams:*',

  players: (season?: number) =>
    season ? `players:*:${season}` : 'players:*',

  live: () => 'live_*',

  search: () => 'search_*',

  all: () => '*'
}

export function isExpired (timestamp: number, ttl: number): boolean {
  if (ttl <= 0) return true // TTL of 0 or negative means immediate expiration
  return Date.now() - timestamp > ttl
}

export function parseKeyComponents (key: string): {
  dataType: string
  hash: string
} {
  const parts = key.split(':', 2)
  return {
    dataType: parts[0] || '',
    hash: parts[1] || ''
  }
}

export function matchesPattern (key: string, pattern: string): boolean {
  if (pattern === '*') return true

  // Convert pattern to regex
  const regexPattern = pattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

  return new RegExp(`^${regexPattern}$`).test(key)
}
