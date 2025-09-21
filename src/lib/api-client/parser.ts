import {
  StandingType as Standing,
  StandingStatsType as StandingStats,
  Fixture,
  TeamInFixture,
  Player,
  MatchEvent
} from '../../models'
import {
  StandingItemAPI,
  StandingStatsAPI,
  FixtureAPI,
  TeamInFixtureAPI,
  PlayerAPI,
  MatchEventAPI
} from '../../types/api-football'

export interface ValidationError {
  field: string
  message: string
  value?: unknown
}

export class ValidationErrors extends Error {
  public readonly errors: ValidationError[]

  constructor (errors: ValidationError[]) {
    super(`Validation failed: ${errors.map(e => `${e.field}: ${e.message}`).join(', ')}`)
    this.name = 'ValidationErrors'
    this.errors = errors
  }
}

export function validateRequired<T> (
  value: T | null | undefined,
  field: string
): T {
  if (value === null || value === undefined) {
    throw new ValidationErrors([{
      field,
      message: 'is required',
      value
    }])
  }
  return value
}

export function validateNumber (
  value: unknown,
  field: string,
  options: {
    required?: boolean
    min?: number
    max?: number
  } = {}
): number | null {
  if (value === null || value === undefined) {
    if (options.required) {
      throw new ValidationErrors([{
        field,
        message: 'is required',
        value
      }])
    }
    return null
  }

  const raw = value as number | string
  const num = typeof raw === 'string' ? parseFloat(raw) : raw
  if (typeof num !== 'number' || isNaN(num)) {
    throw new ValidationErrors([{
      field,
      message: 'must be a valid number',
      value
    }])
  }

  if (options.min !== undefined && num < options.min) {
    throw new ValidationErrors([{
      field,
      message: `must be at least ${options.min}`,
      value
    }])
  }

  if (options.max !== undefined && num > options.max) {
    throw new ValidationErrors([{
      field,
      message: `must be at most ${options.max}`,
      value
    }])
  }

  return num
}

export function validateString (
  value: unknown,
  field: string,
  options: {
    required?: boolean
    minLength?: number
    maxLength?: number
  } = {}
): string | null {
  if (value === null || value === undefined) {
    if (options.required) {
      throw new ValidationErrors([{
        field,
        message: 'is required',
        value
      }])
    }
    return null
  }

  if (typeof value !== 'string') {
    throw new ValidationErrors([{
      field,
      message: 'must be a string',
      value
    }])
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    throw new ValidationErrors([{
      field,
      message: `must be at least ${options.minLength} characters`,
      value
    }])
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw new ValidationErrors([{
      field,
      message: `must be at most ${options.maxLength} characters`,
      value
    }])
  }

  return value
}

// Parser functions
export function parseStandingStats (data: StandingStatsAPI): StandingStats {
  return {
    played: validateNumber(data.played, 'played', { required: true }) ?? 0,
    win: validateNumber(data.win, 'win', { required: true }) ?? 0,
    draw: validateNumber(data.draw, 'draw', { required: true }) ?? 0,
    lose: validateNumber(data.lose, 'lose', { required: true }) ?? 0,
    goals: {
      for: validateNumber(data.goals?.for, 'goals.for', { required: true }) ?? 0,
      against: validateNumber(data.goals?.against, 'goals.against', { required: true }) ?? 0
    }
  }
}

export function parseStanding (data: StandingItemAPI): Standing {
  return {
    rank: validateNumber(data.rank, 'rank', { required: true }) ?? 0,
    team: {
      id: validateNumber(data.team.id, 'team.id', { required: true }) ?? 0,
      name: validateString(data.team.name, 'team.name', { required: true }) ?? '',
      logo: validateString(data.team.logo, 'team.logo') ?? ''
    },
    points: validateNumber(data.points, 'points', { required: true }) ?? 0,
    goalsDiff: validateNumber(data.goalsDiff, 'goalsDiff', { required: true }) ?? 0,
    group: validateString(data.group, 'group') ?? '',
    form: validateString(data.form, 'form') ?? '',
    status: validateString(data.status, 'status') ?? '',
    description: validateString(data.description, 'description'),
    all: parseStandingStats(data.all),
    home: parseStandingStats(data.home),
    away: parseStandingStats(data.away),
    update: validateString(data.update, 'update', { required: true }) ?? ''
  }
}

export function parseTeamInFixture (data: TeamInFixtureAPI): TeamInFixture {
  return {
    id: validateNumber(data.id, 'id', { required: true }) ?? 0,
    name: validateString(data.name, 'name', { required: true }) ?? '',
    logo: validateString(data.logo, 'logo') ?? '',
    winner: data.winner === null ? null : Boolean(data.winner)
  }
}

export function parseFixture (data: FixtureAPI): Fixture {
  return {
    id: validateNumber(data.fixture.id, 'fixture.id', { required: true }) ?? 0,
    referee: validateString(data.fixture.referee ?? null, 'fixture.referee'),
    timezone: validateString(data.fixture.timezone ?? 'UTC', 'fixture.timezone', { required: true }) || 'UTC',
    date: validateString(data.fixture.date, 'fixture.date', { required: true }) ?? '',
    timestamp: validateNumber(data.fixture.timestamp, 'fixture.timestamp', { required: true }) ?? 0,
    periods: {
      first: validateNumber(data.fixture.periods?.first, 'fixture.periods.first'),
      second: validateNumber(data.fixture.periods?.second, 'fixture.periods.second')
    },
    venue: {
      id: validateNumber(data.fixture.venue?.id ?? null, 'fixture.venue.id'),
      name: validateString(data.fixture.venue?.name ?? null, 'fixture.venue.name'),
      city: validateString(data.fixture.venue?.city ?? null, 'fixture.venue.city')
    },
    status: {
      long: validateString(data.fixture.status.long, 'fixture.status.long', { required: true }) ?? '',
      short: parseFixtureStatusShort(data.fixture.status.short),
      elapsed: validateNumber(data.fixture.status.elapsed ?? null, 'fixture.status.elapsed')
    },
    league: {
      id: validateNumber(data.league?.id, 'league.id', { required: true }) ?? 0,
      name: validateString(data.league?.name, 'league.name', { required: true }) ?? '',
      country: validateString(data.league?.country, 'league.country', { required: true }) ?? '',
      logo: validateString(data.league?.logo, 'league.logo') ?? '',
      flag: validateString(data.league?.flag, 'league.flag') ?? '',
      season: validateNumber(data.league?.season, 'league.season', { required: true }) ?? 0,
      round: validateString(data.league?.round, 'league.round', { required: true }) ?? ''
    },
    teams: {
      home: parseTeamInFixture(data.teams.home),
      away: parseTeamInFixture(data.teams.away)
    },
    goals: {
      home: validateNumber(data.goals.home, 'goals.home'),
      away: validateNumber(data.goals.away, 'goals.away')
    },
    score: {
      halftime: {
        home: validateNumber(data.score?.halftime?.home ?? null, 'score.halftime.home'),
        away: validateNumber(data.score?.halftime?.away ?? null, 'score.halftime.away')
      },
      fulltime: {
        home: validateNumber(data.score?.fulltime?.home ?? null, 'score.fulltime.home'),
        away: validateNumber(data.score?.fulltime?.away ?? null, 'score.fulltime.away')
      },
      extratime: {
        home: validateNumber(data.score?.extratime?.home ?? null, 'score.extratime.home'),
        away: validateNumber(data.score?.extratime?.away ?? null, 'score.extratime.away')
      },
      penalty: {
        home: validateNumber(data.score?.penalty?.home ?? null, 'score.penalty.home'),
        away: validateNumber(data.score?.penalty?.away ?? null, 'score.penalty.away')
      }
    }
  }
}

export function parsePlayer (data: PlayerAPI): Player {
  return {
    id: validateNumber(data.id, 'id', { required: true }) ?? 0,
    name: validateString(data.name, 'name', { required: true }) ?? '',
    firstname: validateString(data.firstname, 'firstname') ?? '',
    lastname: validateString(data.lastname, 'lastname') ?? '',
    age: validateNumber(data.age, 'age') ?? 0,
    birth: {
      date: validateString(data.birth?.date, 'birth.date') ?? '',
      place: validateString(data.birth?.place, 'birth.place') ?? '',
      country: validateString(data.birth?.country, 'birth.country') ?? ''
    },
    nationality: validateString(data.nationality, 'nationality') ?? '',
    height: validateString(data.height, 'height') ?? '',
    weight: validateString(data.weight, 'weight') ?? '',
    injured: data.injured,
    photo: validateString(data.photo, 'photo') ?? ''
  }
}

export function parseMatchEvent (data: MatchEventAPI): MatchEvent {
  return {
    time: {
      elapsed: validateNumber(data.time?.elapsed, 'time.elapsed', { required: true }) ?? 0,
      extra: validateNumber(data.time?.extra, 'time.extra')
    },
    team: {
      id: validateNumber(data.team?.id, 'team.id', { required: true }) ?? 0,
      name: validateString(data.team?.name, 'team.name', { required: true }) ?? '',
      logo: validateString(data.team?.logo, 'team.logo') ?? ''
    },
    player: {
      id: validateNumber(data.player?.id, 'player.id', { required: true }) ?? 0,
      name: validateString(data.player?.name, 'player.name', { required: true }) ?? ''
    },
    assist: {
      id: validateNumber(data.assist?.id, 'assist.id'),
      name: validateString(data.assist?.name, 'assist.name')
    },
    type: parseEventType(validateString(data.type, 'type', { required: true }) || undefined),
    detail: validateString(data.detail, 'detail', { required: true }) ?? '',
    comments: validateString(data.comments ?? null, 'comments')
  }
}

// Helpers
function parseFixtureStatusShort (value: string | undefined): Fixture['status']['short'] {
  const allowed = new Set<string>([
    'TBD', 'NS', '1H', 'HT', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'FT', 'AET', 'PEN', 'PST', 'CANC', 'ABD', 'AWD', 'WO', 'LIVE'
  ])
  if (!value || !allowed.has(value)) return 'TBD'
  return value as Fixture['status']['short']
}

function parseEventType (value: string | undefined): MatchEvent['type'] {
  const allowed = new Set(['Goal', 'Card', 'subst', 'Var'])
  if (!value || !allowed.has(value)) return 'Goal'
  return value as MatchEvent['type']
}
