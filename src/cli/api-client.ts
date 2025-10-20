#!/usr/bin/env node

import { APIFootballClient } from '../lib/api-client/client'
import { createConsoleLogger } from '../lib/logger/logger'
import { isEventArray, isPlayersArray, isFixtureArray, isTeamArray, isTeamItem, MatchEventAPI, PlayersResponseItemAPI, FixtureAPI, TeamResponseItemAPI } from '../types/guards'
import { ValidationError, safeAsync } from '../lib/errors/errors'
import { safeString } from '../lib/utils/string-utils'
import { getNextArg, parseKeyValuePair, validateChoice } from '../lib/utils/cli-args'
import type { ApiClientOptions } from '../types/cli'

function parseArgs (args: string[]): ApiClientOptions {
  const options: ApiClientOptions = {
    apiKey: process.env.API_FOOTBALL_KEY ?? '',
    endpoint: '',
    params: {},
    format: 'table',
    verbose: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--api-key':
        options.apiKey = getNextArg(args, i, '--api-key')
        i++ // Skip the next arg since we consumed it
        break
      case '--endpoint':
        options.endpoint = getNextArg(args, i, '--endpoint')
        i++ // Skip the next arg since we consumed it
        break
      case '--format': {
        const format = getNextArg(args, i, '--format')
        options.format = validateChoice(format, ['json', 'table'], '--format')
        i++ // Skip the next arg since we consumed it
        break
      }
      case '--verbose':
        options.verbose = true
        break
      case '--help':
        showHelp()
        process.exit(0)
        break
      default:
        // Parse key=value parameters
        if (arg?.includes('=')) {
          const [key, value] = parseKeyValuePair(arg)
          options.params[key] = value
        }
    }
  }

  return options
}

function showHelp (): void {
  const logger = createConsoleLogger()
  logger.info(`
API Football CLI

Usage:
  api-client --endpoint <endpoint> [options] [params]

Options:
  --api-key <key>      API key (default: API_FOOTBALL_KEY env var)
  --endpoint <name>    Endpoint to call (required)
  --format <format>    Output format: json|table (default: table)
  --verbose           Show detailed output
  --help              Show this help

Endpoints:
  standings           Get current season standings
  fixtures            Get fixtures (season=YYYY team=ID date=YYYY-MM-DD from=YYYY-MM-DD to=YYYY-MM-DD round="Regular Season - N")
  live-fixtures       Get live fixtures
  teams               Get teams (season=YYYY search=query)
  team                Get single team (id=ID season=YYYY)
  players             Get players (team=ID season=YYYY search=query page=N)
  player              Get single player (id=ID season=YYYY)
  squad               Get team squad (team=ID season=YYYY)
  goals               Get match goal events (fixture=ID)
  rate-limit          Show rate limit info

Parameters:
  Use key=value format: season=2023 team=1 from=2023-01-01

Examples:
  api-client --endpoint standings
  api-client --endpoint fixtures season=2023 from=2023-01-01 to=2023-01-31
  api-client --endpoint team id=1
  api-client --endpoint players team=1 season=2023
  api-client --endpoint rate-limit --format table
`)
}

function formatOutput (data: unknown, format: 'json' | 'table'): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2)
  }

  if (format === 'table' && Array.isArray(data)) {
    if (data.length === 0) return 'No data'

    const firstItem = data[0]
    if (typeof firstItem !== 'object' || firstItem === null) {
      return JSON.stringify(data, null, 2)
    }

    const record = firstItem as Record<string, unknown>
    const headers = Object.keys(record)
    const rows = data.map(item => {
      const itemRecord = item as Record<string, unknown>
      return headers.map(h => safeString(itemRecord[h]))
    })

    const colWidths = headers.map((h, i) =>
      Math.max(h.length, ...rows.map(r => r[i]?.length ?? 0))
    )

    let table = headers.map((h, i) => h.padEnd(colWidths[i] ?? 0)).join(' | ') + '\n'
    table += colWidths.map(w => '-'.repeat(w ?? 0)).join('-|-') + '\n'
    table += rows.map(row =>
      row.map((cell, i) => cell.padEnd(colWidths[i] ?? 0)).join(' | ')
    ).join('\n')

    return table
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Safely converts string parameter to number, returns undefined if not present
 */
function safeParseInt (value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? undefined : parsed
}

/**
 * Creates fixtures query parameters with proper optional handling
 */
function createFixturesParams (params: Record<string, string>) {
  const result: {
    season?: number
    team?: number
    from?: string
    to?: string
    date?: string
    status?: string
    round?: string
    limit?: number
  } = {}

  if (params.season) {
    const season = safeParseInt(params.season)
    if (season) result.season = season
  }

  if (params.team) {
    const team = safeParseInt(params.team)
    if (team) result.team = team
  }

  if (params.from) result.from = params.from
  if (params.to) result.to = params.to
  if (params.date) result.date = params.date
  if (params.status) result.status = params.status
  if (params.round) result.round = params.round

  if (params.limit) {
    const limit = safeParseInt(params.limit)
    if (limit) result.limit = limit
  }

  return result
}

/**
 * Creates players query parameters with proper optional handling
 */
function createPlayersParams (params: Record<string, string>) {
  const result: {
    team?: number
    season?: number
    search?: string
    page?: number
  } = {}

  if (params.team) {
    const team = safeParseInt(params.team)
    if (team) result.team = team
  }

  if (params.season) {
    const season = safeParseInt(params.season)
    if (season) result.season = season
  }

  if (params.search) result.search = params.search

  if (params.page) {
    const page = safeParseInt(params.page)
    if (page) result.page = page
  }

  return result
}

const main = safeAsync(async (): Promise<void> => {
  const logger = createConsoleLogger()

  const args = process.argv.slice(2)

  if (args.length === 0) {
    showHelp()
    process.exit(1)
  }

  const options = parseArgs(args)

  if (!options.apiKey) {
    logger.error('Error: API key required. Set API_FOOTBALL_KEY env var or use --api-key option')
    process.exit(1)
  }

  if (!options.endpoint) {
    logger.error('Error: Endpoint required. Use --endpoint option')
    process.exit(1)
  }

  const client = new APIFootballClient({ apiKey: options.apiKey })

  if (options.verbose) {
    logger.info(`Calling endpoint: ${options.endpoint}`)
    logger.info('Parameters:', options.params)
  }

  interface APIResponse {
    response?: unknown
    paging?: unknown
  }

  let response: APIResponse

  switch (options.endpoint) {
    case 'standings':
      response = await client.getStandings(safeParseInt(options.params.season))
      break

    case 'fixtures':
      response = await client.getFixtures(createFixturesParams(options.params))
      break

    case 'live-fixtures':
      response = await client.getLiveFixtures()
      break

    case 'teams':
      response = await client.getTeams(safeParseInt(options.params.season))
      break

    case 'team': {
      if (!options.params.id) {
        logger.error('Error: team endpoint requires id parameter')
        process.exit(1)
      }
      const teamId = safeParseInt(options.params.id)
      if (!teamId) {
        logger.error('Error: team id must be a valid number')
        process.exit(1)
      }
      response = await client.getTeam(
        teamId,
        safeParseInt(options.params.season)
      )
      break
    }

    case 'players':
      response = await client.getPlayers(createPlayersParams(options.params))
      break

    case 'player': {
      if (!options.params.id) {
        logger.error('Error: player endpoint requires id parameter')
        process.exit(1)
      }
      const playerId = safeParseInt(options.params.id)
      if (!playerId) {
        logger.error('Error: player id must be a valid number')
        process.exit(1)
      }
      response = await client.getPlayer(
        playerId,
        safeParseInt(options.params.season)
      )
      break
    }

    case 'squad': {
      if (!options.params.team) {
        logger.error('Error: squad endpoint requires team parameter')
        process.exit(1)
      }
      if (!options.params.season) {
        logger.error('Error: squad endpoint now requires season parameter (e.g., season=2025)')
        process.exit(1)
      }
      const teamId = safeParseInt(options.params.team)
      const season = safeParseInt(options.params.season)
      if (!teamId) {
        logger.error('Error: team id must be a valid number')
        process.exit(1)
      }
      if (!season) {
        logger.error('Error: season must be a valid number (e.g., 2025)')
        process.exit(1)
      }
      const allPlayers: PlayersResponseItemAPI[] = []
      let currentPage = 1
      let totalPages = 1
      let lastPaging: APIResponse['paging']

      do {
        const pageResponse = await client.getPlayers({ team: teamId, season, page: currentPage })
        if (Array.isArray(pageResponse.response)) {
          allPlayers.push(...pageResponse.response)
        }
        lastPaging = pageResponse.paging
        totalPages = pageResponse.paging?.total ?? 1
        if ((pageResponse.response ?? []).length === 0) {
          break
        }
        currentPage += 1
      } while (currentPage <= totalPages)

      response = {
        response: allPlayers,
        paging: lastPaging
      }
      break
    }

    case 'goals': {
      if (!options.params.fixture) {
        logger.error('Error: goals endpoint requires fixture parameter')
        process.exit(1)
      }
      const fixtureId = safeParseInt(options.params.fixture)
      if (!fixtureId) {
        logger.error('Error: fixture id must be a valid number')
        process.exit(1)
      }
      response = await client.getFixtureEvents(fixtureId)
      break
    }

    case 'rate-limit': {
      const rateLimitInfo = client.getRateLimitInfo()
      response = { response: [rateLimitInfo] }
      break
    }

    default:
      throw new ValidationError(`Unknown endpoint: ${options.endpoint}`, 'endpoint')
  }

  if (options.verbose) {
    logger.info('\n--- Response ---')
  }

  if (response.response) {
    let payload: unknown = response.response

    // Smart table formatting for fixtures
    if (options.endpoint === 'fixtures' && options.format === 'table' && isFixtureArray(payload)) {
      const fixtures: FixtureAPI[] = payload
      payload = fixtures.map(f => ({
        ID: f.fixture.id,
        Date: (f.fixture.date || '').slice(0, 10),
        Home: f.teams.home.name,
        Away: f.teams.away.name,
        Score: `${f.goals.home ?? '-'}-${f.goals.away ?? '-'}`,
        St: f.fixture.status.short,
        Rnd: f.league.round
      }))
    }

    // Filter events to goals only, and optionally render a concise table
    if (options.endpoint === 'goals' && isEventArray(payload)) {
      const events: MatchEventAPI[] = payload.filter(e => (e.type || '').toLowerCase() === 'goal')

      if (options.format === 'table') {
        payload = events.map(e => ({
          min: e.time.elapsed,
          team: e.team.name,
          scorer: e.player.name,
          assist: e.assist?.name || '',
          detail: e.detail
        }))
      } else {
        payload = events
      }
    }

    // Transform squad output (derived from /players) to match players/squads fields
    if (options.endpoint === 'squad' && isPlayersArray(payload)) {
      const players: PlayersResponseItemAPI[] = payload
      const basic = players.map(p => ({
        id: p.player.id,
        name: p.player.name,
        firstname: p.player.firstname,
        lastname: p.player.lastname,
        number: p.statistics?.[0]?.games?.number ?? '',
        position: p.statistics?.[0]?.games?.position ?? '',
        age: p.player.age,
        birthDate: p.player.birth.date,
        birthPlace: p.player.birth.place,
        birthCountry: p.player.birth.country,
        nationality: p.player.nationality,
        height: p.player.height,
        weight: p.player.weight,
        injured: p.player.injured
      }))

      payload = basic
    }

    if ((options.endpoint === 'teams' || options.endpoint === 'team') &&
      options.format === 'table') {
      const teams: TeamResponseItemAPI[] =
        isTeamArray(payload)
          ? payload
          : isTeamItem(payload)
            ? [payload]
            : []

      if (teams.length > 0) {
        payload = teams.map(t => ({
          ID: t.team.id,
          Name: t.team.name,
          Code: t.team.code ?? '',
          Country: t.team.country,
          Founded: t.team.founded ?? '',
          Venue: t.venue?.name ?? '',
          City: t.venue?.city ?? '',
          Capacity: t.venue?.capacity ?? '',
          Surface: t.venue?.surface ?? ''
        }))
      }
    }

    {
      const output = formatOutput(payload, options.format)
      if (options.format === 'table') {
        // Print raw table without the INFO: prefix so columns align
        process.stdout.write(`\n${output}\n`)
      } else {
        logger.info(output)
      }
    }
  } else {
    const output = formatOutput(response, options.format)
    if (options.format === 'table') {
      process.stdout.write(`\n${output}\n`)
    } else {
      logger.info(output)
    }
  }

  if (options.verbose && response.paging) {
    logger.info('\n--- Paging ---')
    logger.info(JSON.stringify(response.paging, null, 2))
  }
})

if (require.main === module) {
  main().catch((error: unknown) => {
    const logger = createConsoleLogger()
    logger.error('Fatal CLI error:', error)
    process.exit(1)
  })
}

export { main }
