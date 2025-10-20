import type { Fixture } from '../../models/fixture'
import type { ToolTeam, PlayerProfile } from '../../types/tool-results'

export function summarizeFixture (f: Fixture) {
  return {
    id: f.id,
    date: (f.date || '').slice(0, 10),
    home: f.teams.home.name,
    away: f.teams.away.name,
    score: `${f.goals.home ?? '-'}-${f.goals.away ?? '-'}`,
    st: f.status.short,
    rnd: f.league.round
  }
}

export function summarizeLiveFixture (f: Fixture) {
  return {
    id: f.id,
    min: f.status.elapsed ?? 0,
    home: f.teams.home.name,
    away: f.teams.away.name,
    score: `${f.goals.home ?? '-'}-${f.goals.away ?? '-'}`,
    st: f.status.short
  }
}

export function summarizeTeam (t: ToolTeam) {
  return {
    id: t.id,
    name: t.name,
    country: t.country,
    founded: t.founded ?? ''
  }
}

export function summarizePlayer (p: PlayerProfile) {
  return {
    id: p.id,
    name: p.name,
    age: p.age,
    nat: p.nationality,
    pos: p.position ?? '',
    no: p.number ?? ''
  }
}

