import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GetTeamTool } from '../../src/lib/tools/get-team'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { getToolContract } from '../helpers/contract_spec'
import {
  sampleTeamByIdResponse,
  sampleTeamSearchResponse,
  samplePlayerSearchResponse
} from '../helpers/sample-responses'

describe('Contract: get_team tool', () => {
  let cache: LRUCache
  let getTeamTool: GetTeamTool
  let mockApiClient: {
    getTeam: ReturnType<typeof vi.fn>
    getPlayers: ReturnType<typeof vi.fn>
    searchTeams: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 10, defaultTtl: 1000 })
    mockApiClient = {
      getTeam: vi.fn().mockResolvedValue(sampleTeamByIdResponse),
      getPlayers: vi.fn().mockResolvedValue(samplePlayerSearchResponse),
      searchTeams: vi.fn().mockResolvedValue(sampleTeamSearchResponse)
    }

    getTeamTool = new GetTeamTool(mockApiClient as any, cache)
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  it('matches the documented contract metadata', () => {
    const contract = getToolContract('get_team')

    expect(getTeamTool.name).toBe(contract.name)
    expect(getTeamTool.description).toBe(contract.description)
    expect(getTeamTool.inputSchema).toEqual(contract.inputSchema)
  })

  it('returns team details and squad that satisfy the documented schema', async () => {
    const result = await getTeamTool.call({ params: { teamId: 33, season: 2024 } } as any)

    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0].text)

    expect(payload.team).toMatchObject({
      id: 33,
      name: 'Manchester United',
      code: 'MUN',
      founded: 1878,
      logo: expect.any(String),
      venue: {
        id: 556,
        name: 'Old Trafford',
        city: 'Manchester',
        capacity: 74879,
        surface: 'Grass',
        image: expect.any(String)
      }
    })

    expect(Array.isArray(payload.squad)).toBe(true)
    expect(payload.squad.length).toBeGreaterThan(0)
    expect(payload.squad[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      firstname: expect.any(String),
      lastname: expect.any(String),
      age: expect.any(Number),
      birthDate: expect.any(String),
      birthPlace: expect.any(String),
      birthCountry: expect.any(String),
      nationality: expect.any(String),
      height: expect.any(String),
      weight: expect.any(String),
      injured: expect.any(Boolean),
      photo: expect.any(String)
    })

    expect(mockApiClient.getTeam).toHaveBeenCalledWith(33, 2024)
    expect(mockApiClient.getPlayers).toHaveBeenCalledWith({ team: 33, season: 2024, page: 1 })
  })

  it('supports lookups by team name through the documented contract', async () => {
    const result = await getTeamTool.call({ params: { name: 'Arsenal', season: 2024 } } as any)

    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0].text)

    expect(payload.team.name).toBe('Arsenal')
    expect(mockApiClient.searchTeams).toHaveBeenCalledWith('Arsenal')
    expect(mockApiClient.getPlayers).toHaveBeenCalledWith({ team: 42, season: 2024, page: 1 })
  })

  it('rejects requests without identifiers as required by the contract', async () => {
    const result = await getTeamTool.call({ params: {} } as any)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Either teamId or name must be provided')
  })
})
