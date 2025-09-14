export interface Player {
  id: number
  name: string
  firstname: string
  lastname: string
  age: number
  birth: {
    date: string
    place: string
    country: string
  }
  nationality: string
  height: string
  weight: string
  injured: boolean
  photo: string
}

export interface PlayerPosition {
  id: number
  name: string
  position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker'
  number: number | null
}

export interface PlayerInSquad extends Player {
  position: string
  number: number | null
}

export interface PlayerStatistics {
  team: {
    id: number
    name: string
    logo: string
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
  }
  games: {
    appearences: number
    lineups: number
    minutes: number
    number: number | null
    position: string
    rating: string | null
    captain: boolean
  }
  substitutes: {
    in: number
    out: number
    bench: number
  }
  shots: {
    total: number | null
    on: number | null
  }
  goals: {
    total: number | null
    conceded: number | null
    assists: number | null
    saves: number | null
  }
  passes: {
    total: number | null
    key: number | null
    accuracy: number | null
  }
  tackles: {
    total: number | null
    blocks: number | null
    interceptions: number | null
  }
  duels: {
    total: number | null
    won: number | null
  }
  dribbles: {
    attempts: number | null
    success: number | null
    past: number | null
  }
  fouls: {
    drawn: number | null
    committed: number | null
  }
  cards: {
    yellow: number
    yellowred: number
    red: number
  }
  penalty: {
    won: number | null
    commited: number | null
    scored: number | null
    missed: number | null
    saved: number | null
  }
}

export interface PlayerCareer {
  team: {
    id: number
    name: string
    logo: string
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
  }
  start: string
  end: string | null
}
