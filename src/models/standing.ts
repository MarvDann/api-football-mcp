export interface Standing {
  rank: number
  team: {
    id: number
    name: string
    logo: string
  }
  points: number
  goalsDiff: number
  group: string
  form: string
  status: string
  description: string | null
  all: StandingStats
  home: StandingStats
  away: StandingStats
  update: string
}

export interface StandingStats {
  played: number
  win: number
  draw: number
  lose: number
  goals: {
    for: number
    against: number
  }
}

export interface LeagueStandings {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    standings: Standing[][]
  }
}

export interface StandingsResponse {
  get: string
  parameters: {
    league: string
    season: string
  }
  errors: any[]
  results: number
  paging: {
    current: number
    total: number
  }
  response: LeagueStandings[]
}
