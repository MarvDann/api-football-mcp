export interface MatchEvent {
  time: {
    elapsed: number
    extra: number | null
  }
  team: {
    id: number
    name: string
    logo: string
  }
  player: {
    id: number
    name: string
  }
  assist: {
    id: number | null
    name: string | null
  }
  type: 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string
  comments: string | null
}

export interface MatchEventResponse {
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
  events: MatchEvent[]
}

export interface EventType {
  GOAL: 'Goal'
  CARD: 'Card'
  SUBSTITUTION: 'subst'
  VAR: 'Var'
}

export interface EventDetail {
  // Goals
  NORMAL_GOAL: 'Normal Goal'
  OWN_GOAL: 'Own Goal'
  PENALTY: 'Penalty'
  MISSED_PENALTY: 'Missed Penalty'

  // Cards
  YELLOW_CARD: 'Yellow Card'
  RED_CARD: 'Red Card'
  SECOND_YELLOW: 'Second Yellow card'

  // Substitutions
  SUBSTITUTION: 'Substitution 1' | 'Substitution 2' | 'Substitution 3' | 'Substitution 4' | 'Substitution 5'

  // VAR
  VAR_CANCELLED_GOAL: 'Goal cancelled'
  VAR_PENALTY_CONFIRMED: 'Penalty confirmed'
}
