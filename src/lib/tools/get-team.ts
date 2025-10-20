import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parsePlayer } from '../api-client/parser'
import { logger } from '../logger/logger'
import { getToolArguments } from './params'
import { GetTeamResult, PlayerProfile, ToolTeam } from '../../types/tool-results'
import { createOptionalObject } from '../utils/object-utils'
import { TeamResponseItemAPI } from '../../types/api-football'

export interface GetTeamParams {
  teamId?: number
  name?: string
  season?: number
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
    }
  } as const

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = getToolArguments<GetTeamParams>(request)

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

      let team: ToolTeam | null = null
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
            team = createOptionalObject({
              id: data.team.id,
              name: data.team.name,
              code: data.team.code ?? null,
              country: data.team.country,
              logo: data.team.logo,
              ...(data.team.founded !== undefined ? { founded: data.team.founded } : {}),
              venue: data.venue
                ? createOptionalObject({
                  id: data.venue.id,
                  name: data.venue.name,
                  city: data.venue.city,
                  ...(data.venue.capacity !== undefined ? { capacity: data.venue.capacity } : {}),
                  ...(data.venue.surface !== undefined ? { surface: data.venue.surface } : {}),
                  ...(data.venue.image !== undefined ? { image: data.venue.image } : {}),
                  ...(data.venue.address !== undefined ? { address: data.venue.address } : {})
                })
                : null
            }) as ToolTeam
            teamId = data.team.id
          }
        }
      } else if (params.name) {
        // Search for team by name
        const searchResponse = await this.apiClient.searchTeams(params.name)

        if (searchResponse.response && searchResponse.response.length > 0) {
          // Find exact match or closest match
          const queryName = params.name.toLowerCase()
          const exactMatch = searchResponse.response.find((t: TeamResponseItemAPI) =>
            t.team.name.toLowerCase() === queryName
          )

          const chosen = exactMatch ?? searchResponse.response[0]
          if (chosen) {
            team = createOptionalObject({
              id: chosen.team.id,
              name: chosen.team.name,
              code: chosen.team.code ?? null,
              country: chosen.team.country,
              logo: chosen.team.logo,
              ...(chosen.team.founded !== undefined ? { founded: chosen.team.founded } : {}),
              venue: chosen.venue
                ? createOptionalObject({
                  id: chosen.venue.id,
                  name: chosen.venue.name,
                  city: chosen.venue.city,
                  ...(chosen.venue.capacity !== undefined ? { capacity: chosen.venue.capacity } : {}),
                  ...(chosen.venue.surface !== undefined ? { surface: chosen.venue.surface } : {}),
                  ...(chosen.venue.image !== undefined ? { image: chosen.venue.image } : {}),
                  ...(chosen.venue.address !== undefined ? { address: chosen.venue.address } : {})
                })
                : null
            }) as ToolTeam
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
            const squad: PlayerProfile[] = squadResponse.response.map((playerData) => {
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
