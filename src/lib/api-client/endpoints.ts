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

// Re-export shared types from central types module
export type { ApiEndpointParams, RateLimitHeaders, ApiResponse, ApiError } from '../../types/api'
