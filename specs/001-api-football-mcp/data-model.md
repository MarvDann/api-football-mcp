# Data Model

## Core Entities

### League
```typescript
interface League {
  id: number           // API-Football league ID (39 for EPL)
  name: string         // "Premier League"
  country: string      // "England"
  logo: string         // URL to league logo
  flag: string         // URL to country flag
  season: number       // Current season year (e.g., 2025)
}
```

### Team
```typescript
interface Team {
  id: number           // API-Football team ID
  name: string         // Full team name
  code: string         // Three-letter code (e.g., "MUN")
  logo: string         // URL to team logo
  founded: number      // Year founded
  venue: Venue         // Stadium information
}

interface Venue {
  id: number
  name: string         // Stadium name
  city: string
  capacity: number
  surface: string      // "grass" | "artificial"
  image: string        // URL to venue image
}
```

### Player
```typescript
interface Player {
  id: number           // API-Football player ID
  name: string         // Full name
  firstname: string
  lastname: string
  age: number
  birthDate: string    // ISO date
  birthPlace: string
  birthCountry: string
  nationality: string
  height: string       // e.g., "180 cm"
  weight: string       // e.g., "75 kg"
  photo: string        // URL to player photo
  position: string     // "Goalkeeper" | "Defender" | "Midfielder" | "Attacker"
  number: number       // Jersey number
}

interface PlayerStatistics {
  playerId: number
  teamId: number
  season: number
  appearances: number
  lineups: number
  minutes: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  rating: number       // Average match rating
}
```

### Fixture
```typescript
interface Fixture {
  id: number           // Match ID
  referee: string      // Referee name
  timezone: string
  date: string         // ISO datetime
  timestamp: number    // Unix timestamp
  venue: {
    id: number
    name: string
    city: string
  }
  status: FixtureStatus
  league: League
  teams: {
    home: TeamInFixture
    away: TeamInFixture
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: {
    halftime: Score
    fulltime: Score
    extratime: Score | null
    penalty: Score | null
  }
}

interface FixtureStatus {
  long: string         // "Match Finished", "Not Started", etc.
  short: string        // "FT", "NS", "1H", "2H", "HT", etc.
  elapsed: number | null  // Minutes elapsed
}

interface TeamInFixture {
  id: number
  name: string
  logo: string
  winner: boolean | null  // true if won, false if lost, null if draw/not finished
}

interface Score {
  home: number | null
  away: number | null
}
```

### Standing
```typescript
interface Standing {
  rank: number
  team: {
    id: number
    name: string
    logo: string
  }
  points: number
  goalsDiff: number    // Goal difference
  group: string        // League name
  form: string         // Last 5 matches (e.g., "WWDLW")
  status: string       // "up" | "down" | "same"
  description: string  // "Champions League", "Relegation", etc.
  all: StandingStats
  home: StandingStats
  away: StandingStats
  update: string       // ISO datetime of last update
}

interface StandingStats {
  played: number
  win: number
  draw: number
  lose: number
  goals: {
    for: number
    against: number
  }
}
```

### Match Event
```typescript
interface MatchEvent {
  time: {
    elapsed: number    // Minute of the event
    extra: number | null  // Extra time in that half
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
  type: EventType      // "Goal", "Card", "Subst", "Var"
  detail: string       // "Normal Goal", "Yellow Card", "Substitution", etc.
  comments: string | null
}

type EventType = "Goal" | "Card" | "Subst" | "Var"
```

### Season
```typescript
interface Season {
  year: number         // e.g., 2024 for 2024-25 season
  start: string        // ISO date
  end: string          // ISO date
  current: boolean     // Is this the current season?
  coverage: {
    fixtures: {
      events: boolean
      lineups: boolean
      statistics_fixtures: boolean
      statistics_players: boolean
    }
    standings: boolean
    players: boolean
    predictions: boolean
    odds: boolean
  }
}
```

## Relationships

1. **League → Season**: One-to-many (a league has multiple seasons)
2. **Season → Team**: Many-to-many (teams can change each season)
3. **Season → Fixture**: One-to-many (fixtures belong to a season)
4. **Team → Player**: Many-to-many (players can transfer between teams)
5. **Fixture → MatchEvent**: One-to-many (a match has multiple events)
6. **Season → Standing**: One-to-many (standings per season)

## Validation Rules

1. **League ID**: Must be 39 for EPL
2. **Season Year**: Must be between 1992 and current year
3. **Date Ranges**: Start date must be before end date
4. **Player Age**: Must be between 15 and 50
5. **Match Status**: Only specific values allowed (NS, 1H, HT, 2H, FT, etc.)
6. **Goals/Score**: Cannot be negative, null for future matches
7. **Team IDs**: Must exist in the current season's team list
8. **Rate Limits**: Must not exceed API rate limits (check headers)

## State Transitions

### Fixture Status Flow
```
Not Started (NS) → First Half (1H) → Halftime (HT) →
Second Half (2H) → Full Time (FT) → After Extra Time (AET) →
Penalty Shootout (PEN) → Match Finished (FT/AET/PEN)
```

### Standing Updates
- Updated after each match completion
- Recalculated based on:
  - Points (3 for win, 1 for draw, 0 for loss)
  - Goal difference
  - Goals scored (tiebreaker)
  - Head-to-head record (secondary tiebreaker)

## Cache Policies

| Entity | TTL | Condition |
|--------|-----|-----------|
| Historic Fixtures | 24h | Season < current |
| Current Fixtures | 5m | Season = current |
| Live Fixtures | 0 | Status in (1H, HT, 2H) |
| Historic Standings | 24h | Season < current |
| Current Standings | 5m | Season = current |
| Teams | 1h | All seasons |
| Players | 1h | All seasons |
| Match Events | 24h | Match finished |
| Live Events | 0 | Match in progress |