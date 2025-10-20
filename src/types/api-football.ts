// API-Football v3 minimal response shapes used by the CLI formatting

export interface TeamInFixtureAPI {
  id: number
  name: string
  logo?: string
  winner?: boolean | null
}

export interface FixtureStatusAPI {
  long: string
  short: string
  elapsed: number | null
}

export interface FixtureAPI {
  fixture: {
    id: number
    date: string
    timestamp: number
    status: FixtureStatusAPI
    referee?: string | null
    timezone?: string
    periods?: { first?: number | null; second?: number | null }
    venue?: { id?: number | null; name?: string | null; city?: string | null }
  }
  league: {
    id: number
    name: string
    season: number
    round: string
    country?: string
    logo?: string
    flag?: string
  }
  teams: {
    home: TeamInFixtureAPI
    away: TeamInFixtureAPI
  }
  goals: {
    home: number | null
    away: number | null
  }
  score?: {
    halftime?: { home?: number | null; away?: number | null }
    fulltime?: { home?: number | null; away?: number | null }
    extratime?: { home?: number | null; away?: number | null }
    penalty?: { home?: number | null; away?: number | null }
  }
}

export interface MatchEventAPI {
  time: { elapsed: number; extra?: number | null }
  team: { id: number; name: string; logo?: string }
  player: { id: number; name: string }
  assist?: { id?: number | null; name?: string | null }
  type: string
  detail: string
  comments?: string | null
}

export interface PlayerAPI {
  id: number
  name: string
  firstname: string
  lastname: string
  age: number
  birth: { date: string; place: string; country: string }
  nationality: string
  height: string
  weight: string
  injured: boolean
  photo: string
}

export interface PlayerGamesAPI {
  number?: number | null
  position?: string
  appearences?: number
  lineups?: number
  minutes?: number
  rating?: string | null
}

export interface PlayerStatisticsAPI {
  games?: PlayerGamesAPI
  team?: { id: number }
  league?: { id: number; season: number }
  goals?: { total?: number | null; assists?: number | null }
  cards?: { yellow?: number | null; red?: number | null }
}

export interface PlayersResponseItemAPI {
  player: PlayerAPI
  statistics?: PlayerStatisticsAPI[]
}

// Teams endpoint
export interface TeamInfoAPI {
  id: number
  name: string
  code?: string | null
  country: string
  founded?: number
  national?: boolean
  logo: string
}

export interface VenueAPI {
  id: number
  name: string
  address?: string
  city: string
  capacity?: number
  surface?: string
  image?: string
}

export interface TeamResponseItemAPI {
  team: TeamInfoAPI
  venue?: VenueAPI | null
}

// Standings endpoint
export interface StandingStatsAPI {
  played: number
  win: number
  draw: number
  lose: number
  goals: { for: number; against: number }
}

export interface StandingItemAPI {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group?: string
  form?: string
  status?: string
  description?: string
  all: StandingStatsAPI
  home: StandingStatsAPI
  away: StandingStatsAPI
  update: string
}

export interface LeagueStandingsAPI {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    standings: StandingItemAPI[][]
  }
}
