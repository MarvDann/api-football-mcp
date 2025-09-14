export const API_ENDPOINTS = {
  BASE_URL: 'https://v3.football.api-sports.io',

  // League endpoints
  LEAGUES: '/leagues',
  SEASONS: '/leagues/seasons',

  // Standings
  STANDINGS: '/standings',

  // Fixtures
  FIXTURES: '/fixtures',
  FIXTURES_HEAD_TO_HEAD: '/fixtures/headtohead',
  FIXTURES_STATISTICS: '/fixtures/statistics',

  // Teams
  TEAMS: '/teams',
  TEAMS_STATISTICS: '/teams/statistics',

  // Players
  PLAYERS: '/players',
  PLAYERS_SQUADS: '/players/squads',
  PLAYERS_TOP_SCORERS: '/players/topscorers',
  PLAYERS_TOP_ASSISTS: '/players/topassists',

  // Match events
  FIXTURES_EVENTS: '/fixtures/events',
  FIXTURES_LINEUPS: '/fixtures/lineups',
  FIXTURES_PLAYERS: '/fixtures/players',

  // Live matches
  FIXTURES_LIVE: '/fixtures/live'
} as const

export const PREMIER_LEAGUE_ID = 39

export const API_HEADERS = {
  'x-apisports-host': 'v3.football.api-sports.io'
} as const

export interface ApiEndpointParams {
  league?: number
  season?: number
  team?: number
  player?: number
  fixture?: number
  from?: string
  to?: string
  date?: string
  status?: string
  search?: string
  limit?: number
  page?: number
  id?: number
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
}

export interface ApiResponse<T> {
  get: string
  parameters: Record<string, string>
  errors: any[]
  results: number
  paging: {
    current: number
    total: number
  }
  response: T
}

export interface ApiError {
  message: string
  status: number
  headers?: RateLimitHeaders
}
