import { Fixture, MatchEvent } from '../models'
import { StandingType as Standing } from '../models'

export interface FixtureWithId extends Fixture {
  fixtureId: number
}

export interface GetFixturesResult {
  fixtures: FixtureWithId[]
  total: number
}

export interface GetLiveMatchesResult {
  fixtures: Fixture[]
  total: number
}

export interface GetMatchGoalsResult {
  fixture: Fixture | { id: number }
  events: MatchEvent[]
}

export interface GetMatchEventsResult {
  fixture: Fixture | { id: number }
  events: MatchEvent[]
}

export interface GetStandingsResult {
  standings: Standing[]
  lastUpdated: string
}

export interface ToolVenue {
  id?: number
  name?: string
  city?: string
  address?: string
  capacity?: number
  surface?: string
  image?: string
}

export interface ToolTeam {
  id: number
  name: string
  code: string | null
  country: string
  founded?: number
  logo: string
  venue?: ToolVenue | null
}

export interface PlayerProfile {
  id: number
  name: string
  firstname: string
  lastname: string
  age: number
  birthDate: string
  birthPlace: string
  birthCountry: string
  nationality: string
  height: string
  weight: string
  injured: boolean
  photo: string
  position?: string
  number?: number | null
}

export interface PlayerStatisticsSummary {
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
  rating: number | null
}

export interface GetTeamResult {
  team: ToolTeam
  squad?: PlayerProfile[]
}

export interface SearchTeamsResult {
  teams: ToolTeam[]
  total: number
}

export interface SearchPlayersResult {
  players: PlayerProfile[]
  total: number
}

export interface GetPlayerResult {
  player: PlayerProfile
  statistics?: PlayerStatisticsSummary
}

export interface GetSquadResult {
  squad: PlayerProfile[]
  total: number
}
