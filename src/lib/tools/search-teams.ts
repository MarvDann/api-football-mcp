import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { logger } from '../logger/logger'
import { SearchTeamsResult, ToolTeam } from '../../types/tool-results'
import { TeamResponseItemAPI } from '../../types/api-football'
import { getToolArguments } from './params'
import { createOptionalObject } from '../utils/object-utils'
import { getDefaultFormat, getDefaultMaxRows } from '../utils/format-config'
import { renderTable } from '../utils/table'
import { summarizeTeam } from '../utils/summarize'

export interface SearchTeamsParams {
  query?: string
  season?: number
  // output options (optional; supported by inputSchema and rendering logic)
  format?: 'json' | 'table'
  limit?: number
  detail?: boolean
}

// Result shape imported from ../../types/tool-results

export class SearchTeamsTool implements Tool {
  [key: string]: unknown
  name = 'search_teams'
  description = 'Search for teams by name or get all EPL teams for a season'

  inputSchema = {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Search query for team name'
      },
      season: {
        type: 'number',
        description: 'Season year to get all teams from'
      },
      format: {
        type: 'string' as const,
        enum: ['json', 'table'] as const,
        description: 'Output format (default: table)'
      },
      limit: {
        type: 'number' as const,
        description: 'Maximum number of rows when using table format'
      },
      detail: {
        type: 'boolean' as const,
        description: 'Return full JSON even for lists (overrides default table)'
      }
    }
  } as const

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = getToolArguments<SearchTeamsParams>(request)

      // Generate cache key
      const cacheKey = params.query
        ? CacheKeys.searchTeams(params.query, params.season)
        : CacheKeys.teams(params.season)

      // Try to get from cache first
      const cachedResult = this.cache.get(cacheKey)
      if (cachedResult) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(cachedResult, null, 2)
          }]
        }
      }

      let apiResponse: { response?: TeamResponseItemAPI[] }

      if (params.query) {
        // Search for specific teams by name
        apiResponse = await this.apiClient.searchTeams(params.query)
      } else {
        // Get all teams for the season (or current season)
        apiResponse = await this.apiClient.getTeams(params.season)
      }

      if (!apiResponse.response) {
        return {
          content: [{
            type: 'text',
            text: `Error: No teams found${params.query ? ` for query "${params.query}"` : ''}`
          }],
          isError: true
        }
      }

      // Extract team data
      const teams: ToolTeam[] = (apiResponse.response || []).map((teamData) => createOptionalObject({
        id: teamData.team.id,
        name: teamData.team.name,
        code: teamData.team.code ?? null,
        country: teamData.team.country,
        logo: teamData.team.logo,
        ...(teamData.team.founded !== undefined ? { founded: teamData.team.founded } : {}),
        venue: teamData.venue
          ? createOptionalObject({
            id: teamData.venue.id,
            name: teamData.venue.name,
            city: teamData.venue.city,
            ...(teamData.venue.capacity !== undefined ? { capacity: teamData.venue.capacity } : {}),
            ...(teamData.venue.surface !== undefined ? { surface: teamData.venue.surface } : {}),
            ...(teamData.venue.image !== undefined ? { image: teamData.venue.image } : {}),
            ...(teamData.venue.address !== undefined ? { address: teamData.venue.address } : {})
          })
          : null
      })) as unknown as ToolTeam[]

      const result: SearchTeamsResult = {
        teams,
        total: teams.length
      }

      // Cache the result
      const policy = getCachePolicy('search_teams', params.season)
      this.cache.set(cacheKey, result, policy.ttl)

      const format = params.detail ? 'json' : (params.format ?? getDefaultFormat())
      if (format === 'json') {
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
      }

      const rows = teams.map(t => summarizeTeam(t))
      const table = renderTable(
        [
          { key: 'id', header: 'ID' },
          { key: 'name', header: 'Name' },
          { key: 'country', header: 'Country' },
          { key: 'founded', header: 'Founded' }
        ],
        rows,
        { maxRows: params.limit ?? getDefaultMaxRows(), showFooter: true }
      )
      return { content: [{ type: 'text', text: table }] }

    } catch (error) {
      logger.error('Error in search_teams', error as Error)

      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }],
        isError: true
      }
    }
  }
}
