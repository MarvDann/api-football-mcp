import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'
import { CacheKeys } from '../cache/keys'
import { getCachePolicy } from '../cache/policies'
import { parsePlayer } from '../api-client/parser'

export interface GetSquadParams {
  teamId: number
  season: number
}

export class GetSquadTool implements Tool {
  [key: string]: unknown
  name = 'get_squad'
  description = 'Get a team\'s squad for a given season'

  inputSchema = {
    type: 'object',
    properties: {
      teamId: { type: 'number', description: 'Team ID' },
      season: { type: 'number', description: 'Season year (YYYY)' }
    },
    required: ['teamId', 'season'] as string[]
  } as any

  constructor (
    private apiClient: APIFootballClient,
    private cache: LRUCache
  ) {}

  async call (request: CallToolRequest): Promise<CallToolResult> {
    try {
      const params = (request.params || {}) as Partial<GetSquadParams>

      if (!params.teamId || !params.season) {
        return {
          content: [{ type: 'text', text: 'Error: teamId and season are required' }],
          isError: true
        }
      }

      const cacheKey = CacheKeys.players({ team: params.teamId, season: params.season, page: 1 })
      const cached = this.cache.get(cacheKey)
      if (cached) {
        return { content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }] }
      }

      const apiResponse = await this.apiClient.getPlayers({ team: params.teamId, season: params.season, page: 1 })

      const squad = (apiResponse.response || []).map((playerData: any) => {
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

      const result = { squad, total: squad.length }

      const policy = getCachePolicy('players', params.season)
      this.cache.set(cacheKey, result, policy.ttl)

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (error) {
      console.error('Error in get_squad:', error)
      return { content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }], isError: true }
    }
  }
}
