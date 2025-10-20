import {
  FixtureAPI,
  MatchEventAPI,
  PlayersResponseItemAPI,
  TeamResponseItemAPI
} from './api-football'

export function isFixtureArray (v: unknown): v is FixtureAPI[] {
  return Array.isArray(v) && v.every((item: unknown) =>
    typeof item === 'object' && item !== null &&
    typeof (item as Record<string, any>).fixture?.id === 'number' &&
    typeof (item as Record<string, any>).league?.id === 'number'
  )
}

export function isEventArray (v: unknown): v is MatchEventAPI[] {
  return Array.isArray(v) && v.every((ev: unknown) =>
    typeof ev === 'object' && ev !== null &&
    typeof (ev as Record<string, any>).type === 'string' &&
    typeof (ev as Record<string, any>).time?.elapsed === 'number'
  )
}

export function isPlayersArray (v: unknown): v is PlayersResponseItemAPI[] {
  return Array.isArray(v) && v.every((p: unknown) =>
    typeof p === 'object' && p !== null &&
    typeof (p as Record<string, any>).player?.id === 'number' &&
    typeof (p as Record<string, any>).player?.name === 'string'
  )
}

export function isTeamArray (v: unknown): v is TeamResponseItemAPI[] {
  return Array.isArray(v) && v.every((team: unknown) =>
    typeof team === 'object' && team !== null &&
    typeof (team as Record<string, any>).team?.id === 'number' &&
    typeof (team as Record<string, any>).team?.name === 'string'
  )
}

export function isTeamItem (v: unknown): v is TeamResponseItemAPI {
  return typeof v === 'object' && v !== null &&
    typeof (v as Record<string, any>).team?.id === 'number' &&
    typeof (v as Record<string, any>).team?.name === 'string'
}

export type {
  FixtureAPI,
  MatchEventAPI,
  PlayersResponseItemAPI,
  TeamResponseItemAPI
}
