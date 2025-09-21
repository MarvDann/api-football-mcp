import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parsePlayer } from '../api-client/parser'
import { logger } from '../logger/logger'

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
          const data = apiResponse.response[0]
          if (data) {
            team = {
              ...data.team,
              venue: data.venue || null
            }
            teamId = data.team.id
          }
        }
      } else if (params.name) {
        // Search for team by name
        const searchResponse = await this.apiClient.searchTeams(params.name)

        if (searchResponse.response && searchResponse.response.length > 0) {
          // Find exact match or closest match
          const queryName = params.name.toLowerCase()
          const exactMatch = searchResponse.response.find((t: any) =>
            t.team.name.toLowerCase() === queryName
          )

          const chosen = exactMatch ?? searchResponse.response[0]
          if (chosen) {
            team = {
              ...chosen.team,
              venue: chosen.venue || null
            }
            teamId = chosen.team.id
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

      // Fetch season-specific squad via /players if season is provided and we have a teamId
      if (params.season && teamId) {
        try {
          const squadResponse = await this.apiClient.getPlayers({ team: teamId, season: params.season, page: 1 })

          if (squadResponse.response && squadResponse.response.length > 0) {
            const squad = squadResponse.response.map((playerData: any) => {
              const parsed = parsePlayer(playerData.player)
              return {
                id: parsed.id,
                name: parsed.name,
                firstname: parsed.firstname,
                lastname: parsed.lastname,
                age: parsed.age,
                birthDate: parsed.birth.date,
                birthPlace: parsed.birth.place,
                birthCountry: parsed.birth.country,
                nationality: parsed.nationality,
                height: parsed.height,
                weight: parsed.weight,
                injured: parsed.injured,
                photo: parsed.photo
              }
            })

            result.squad = squad
          }
        } catch (squadError) {
          logger.warn('Could not fetch squad data', squadError as Error)
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
      logger.error('Error in get_team', error as Error)

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
