import { TeamInFixture, Venue } from './team'

export interface Fixture {
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
    short: 'TBD' | 'NS' | '1H' | 'HT' | '2H' | 'ET' | 'BT' | 'P' | 'SUSP' | 'INT' | 'FT' | 'AET' | 'PEN' | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO' | 'LIVE'
    elapsed: number | null
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
    home: TeamInFixture
    away: TeamInFixture
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

export interface FixtureLineup {
  team: {
    id: number
    name: string
    logo: string
    colors: {
      player: {
        primary: string
        number: string
        border: string
      }
      goalkeeper: {
        primary: string
        number: string
        border: string
      }
    }
  }
  formation: string
  startXI: {
    player: {
      id: number
      name: string
      number: number
      pos: string
      grid: string
    }
  }[]
  substitutes: {
    player: {
      id: number
      name: string
      number: number
      pos: string
      grid: string | null
    }
  }[]
  coach: {
    id: number
    name: string
    photo: string
  }
}

export interface FixtureStatistics {
  team: {
    id: number
    name: string
    logo: string
  }
  statistics: {
    type: string
    value: number | string | null
  }[]
}
