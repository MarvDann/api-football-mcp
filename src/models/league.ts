export interface League {
  id: number
  name: string
  country: string
  logo: string
  flag: string
  season: number
  start: string
  end: string
  current: boolean
}

export interface LeagueStanding {
  league: League
  standings: Standing[][]
}

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
  description: string
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
