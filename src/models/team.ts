export interface Team {
  id: number
  name: string
  code: string
  country: string
  founded: number
  national: boolean
  logo: string
}

export interface Venue {
  id: number
  name: string
  address: string
  city: string
  capacity: number
  surface: string
  image: string
}

export interface TeamWithVenue extends Team {
  venue: Venue
}

export interface TeamInFixture {
  id: number
  name: string
  logo: string
  winner: boolean | null
}

export interface TeamColors {
  primary: string
  secondary: string
  goalkeeper: {
    primary: string
    secondary: string
  }
}

export interface TeamStatistics {
  team: Team
  form: string
  fixtures: {
    played: {
      home: number
      away: number
      total: number
    }
    wins: {
      home: number
      away: number
      total: number
    }
    draws: {
      home: number
      away: number
      total: number
    }
    loses: {
      home: number
      away: number
      total: number
    }
  }
  goals: {
    for: {
      total: {
        home: number
        away: number
        total: number
      }
      average: {
        home: string
        away: string
        total: string
      }
    }
    against: {
      total: {
        home: number
        away: number
        total: number
      }
      average: {
        home: string
        away: string
        total: string
      }
    }
  }
}
