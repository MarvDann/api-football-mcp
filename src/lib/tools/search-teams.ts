import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { logger } from '../logger/logger'

export interface SearchTeamsParams {
  query?: string
  season?: number
}

export interface SearchTeamsResult {
  teams: any[]
  total: number
}

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
      }
    }
  } as const

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = request.params as SearchTeamsParams || {}

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

      let apiResponse: any

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
      const teams = apiResponse.response.map((teamData: any) => ({
        id: teamData.team.id,
        name: teamData.team.name,
        code: teamData.team.code || null,
        country: teamData.team.country,
        logo: teamData.team.logo,
        founded: teamData.team.founded,
        venue: teamData.venue ? {
          id: teamData.venue.id,
          name: teamData.venue.name,
          city: teamData.venue.city,
          capacity: teamData.venue.capacity,
          surface: teamData.venue.surface,
          image: teamData.venue.image
        } : null
      }))

      const result: SearchTeamsResult = {
        teams,
        total: teams.length
      }

      // Cache the result
      const policy = getCachePolicy('search_teams', params.season)
      this.cache.set(cacheKey, result, policy.ttl)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }

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
