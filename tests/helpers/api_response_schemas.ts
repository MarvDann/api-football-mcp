// API response schemas based on actual API-Football v3 responses
// These schemas are derived from real API responses to ensure accurate testing

export interface ApiFootballResponse<T> {
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

export interface PlayerResponse {
  player: {
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
  statistics: {
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
      scored: number
      missed: number
      saved: number | null
    }
  }[]
}

export interface TeamResponse {
  team: {
    id: number
    name: string
    code: string
    country: string
    founded: number
    national: boolean
    logo: string
  }
  venue: {
    id: number
    name: string
    address: string
    city: string
    capacity: number
    surface: string
    image: string
  }
}

export interface FixtureResponse {
  fixture: {
    id: number
    referee: string | null
    timezone: string
    date: string
    timestamp: number
    periods: {
      first: number | null
      second: number | null
    }
    venue: {
      id: number | null
      name: string | null
      city: string | null
    }
    status: {
      long: string
      short: string
      elapsed: number | null
      extra: number | null
    }
  }
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    round: string
  }
  teams: {
    home: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
    away: {
      id: number
      name: string
      logo: string
      winner: boolean | null
    }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: {
      home: number | null
      away: number | null
    }
    fulltime: {
      home: number | null
      away: number | null
    }
    extratime: {
      home: number | null
      away: number | null
    }
    penalty: {
      home: number | null
      away: number | null
    }
  }
}

export interface StandingResponse {
  league: {
    id: number
    name: string
    country: string
    logo: string
    flag: string
    season: number
    standings: {
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
      all: {
        played: number
        win: number
        draw: number
        lose: number
        goals: {
          for: number
          against: number
        }
      }
      home: {
        played: number
        win: number
        draw: number
        lose: number
        goals: {
          for: number
          against: number
        }
      }
      away: {
        played: number
        win: number
        draw: number
        lose: number
        goals: {
          for: number
          against: number
        }
      }
      update: string
    }[][]
  }
}

// Test validation functions based on documented response formats
export function validatePlayerResponse (response: any): boolean {
  if (!response.player) return false

  const player = response.player
  return (
    typeof player.id === 'number' &&
    typeof player.name === 'string' &&
    typeof player.firstname === 'string' &&
    typeof player.lastname === 'string' &&
    typeof player.age === 'number' &&
    player.birth &&
    typeof player.birth.date === 'string' &&
    typeof player.nationality === 'string' &&
    typeof player.height === 'string' &&
    typeof player.weight === 'string' &&
    typeof player.injured === 'boolean' &&
    typeof player.photo === 'string' &&
    Array.isArray(response.statistics)
  )
}

export function validateTeamResponse (response: any): boolean {
  if (!response.team) return false

  const team = response.team
  return (
    typeof team.id === 'number' &&
    typeof team.name === 'string' &&
    typeof team.code === 'string' &&
    typeof team.country === 'string' &&
    typeof team.founded === 'number' &&
    typeof team.national === 'boolean' &&
    typeof team.logo === 'string' &&
    response.venue &&
    typeof response.venue.id === 'number' &&
    typeof response.venue.name === 'string'
  )
}

export function validateFixtureResponse (response: any): boolean {
  if (!response.fixture) return false

  const fixture = response.fixture
  return (
    typeof fixture.id === 'number' &&
    typeof fixture.timezone === 'string' &&
    typeof fixture.date === 'string' &&
    typeof fixture.timestamp === 'number' &&
    fixture.status &&
    typeof fixture.status.long === 'string' &&
    typeof fixture.status.short === 'string' &&
    response.league &&
    typeof response.league.id === 'number' &&
    typeof response.league.name === 'string' &&
    response.teams?.home &&
    response.teams.away
  )
}

export function validateStandingResponse (response: any): boolean {
  if (!response.league) return false

  const league = response.league
  return (
    typeof league.id === 'number' &&
    typeof league.name === 'string' &&
    typeof league.season === 'number' &&
    Array.isArray(league.standings) &&
    league.standings.length > 0 &&
    Array.isArray(league.standings[0]) &&
    league.standings[0].every((standing: any) =>
      typeof standing.rank === 'number' &&
      typeof standing.points === 'number' &&
      standing.team &&
      typeof standing.team.id === 'number' &&
      typeof standing.team.name === 'string'
    )
  )
}

export function validateApiResponse (
  response: any,
  validator: (data: unknown) => boolean
): boolean {
  return (
    response &&
    typeof response.get === 'string' &&
    typeof response.results === 'number' &&
    Array.isArray(response.errors) &&
    response.paging &&
    typeof response.paging.current === 'number' &&
    typeof response.paging.total === 'number' &&
    Array.isArray(response.response) &&
    (response.results === 0 || response.response.every(validator))
  )
}
