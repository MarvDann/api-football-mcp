import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parsePlayer } from '../api-client/parser'

export interface GetTeamParams {
  teamId?: number
  name?: string
  season?: number
}

export interface GetTeamResult {
  team: any
  squad?: any[]
}

export class GetTeamTool implements Tool {
  [key: string]: unknown
  name = 'get_team'
  description = 'Get detailed team information'

  inputSchema = {
    type: 'object' as const,
    properties: {
      teamId: {
        type: 'number',
        description: 'Team ID (optional if name provided)'
      },
      name: {
        type: 'string',
        description: 'Team name (optional if ID provided)'
      },
      season: {
        type: 'number',
        description: 'Season year for squad information'
      }
    },
    anyOf: [
      { required: ['teamId'] },
      { required: ['name'] }
    ]
  } as const

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = request.params as GetTeamParams || {}

      // Validate that either teamId or name is provided
      if (!params.teamId && !params.name) {
        return {
          content: [{
            type: 'text',
            text: 'Error: Either teamId or name must be provided'
          }],
          isError: true
        }
      }

      let team: any = null
      let teamId: number | undefined = params.teamId

      // If we have a team ID, fetch team directly
      if (teamId) {
        const cacheKey = CacheKeys.team(teamId, params.season)
        const cachedResult = this.cache.get(cacheKey)

        if (cachedResult) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(cachedResult, null, 2)
            }]
          }
        }

        const apiResponse = await this.apiClient.getTeam(teamId, params.season)

        if (apiResponse.response && apiResponse.response.length > 0) {
          team = apiResponse.response[0].team
          teamId = team.id
        }
      } else if (params.name) {
        // Search for team by name
        const searchResponse = await this.apiClient.searchTeams(params.name, params.season)

        if (searchResponse.response && searchResponse.response.length > 0) {
          // Find exact match or closest match
          const exactMatch = searchResponse.response.find((t: any) =>
            t.team.name.toLowerCase() === params.name!.toLowerCase()
          )

          if (exactMatch) {
            team = exactMatch.team
            teamId = team.id
          } else {
            // Use first result as closest match
            team = searchResponse.response[0].team
            teamId = team.id
          }
        }
      }

      if (!team) {
        const identifier = params.teamId ? `ID ${params.teamId}` : `name "${params.name}"`
        return {
          content: [{
            type: 'text',
            text: `Error: No team found for ${identifier}`
          }],
          isError: true
        }
      }

      const result: GetTeamResult = { team }

      // Fetch squad if season is provided and we have a teamId
      if (params.season && teamId) {
        try {
          const squadResponse = await this.apiClient.getSquad(teamId, params.season)

          if (squadResponse.response && squadResponse.response.length > 0) {
            const squad = squadResponse.response[0].players?.map((playerData: any) =>
              parsePlayer(playerData.player)
            ) || []

            result.squad = squad
          }
        } catch (squadError) {
          console.warn('Could not fetch squad data:', squadError)
          // Continue without squad data
        }
      }

      // Cache the result
      if (teamId) {
        const policy = getCachePolicy('teams', params.season)
        const cacheKey = CacheKeys.team(teamId, params.season)
        this.cache.set(cacheKey, result, policy.ttl)
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }]
      }

    } catch (error) {
      console.error('Error in get_team:', error)

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
