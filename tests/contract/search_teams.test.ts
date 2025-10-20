import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SearchTeamsTool } from '../../src/lib/tools/search-teams'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { getToolContract } from '../helpers/contract_spec'
import { sampleTeamByIdResponse, sampleTeamSearchResponse } from '../helpers/sample-responses'

describe('Contract: search_teams tool', () => {
  let cache: LRUCache
  let searchTeamsTool: SearchTeamsTool
  let mockApiClient: {
    searchTeams: ReturnType<typeof vi.fn>
    getTeams: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 10, defaultTtl: 1000 })
    mockApiClient = {
      searchTeams: vi.fn().mockResolvedValue(sampleTeamSearchResponse),
      getTeams: vi.fn().mockResolvedValue(sampleTeamByIdResponse)
    }

    searchTeamsTool = new SearchTeamsTool(mockApiClient as any, cache)
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  it('matches the documented contract metadata', () => {
    const contract = getToolContract('search_teams')

    expect(searchTeamsTool.name).toBe(contract.name)
    expect(searchTeamsTool.description).toBe(contract.description)
    expect(searchTeamsTool.inputSchema).toEqual(contract.inputSchema)
  })

  it('returns compact table output by default', async () => {
    const result = await searchTeamsTool.call({ params: { query: 'Arsenal' } } as any)

    expect(result.isError).toBeUndefined()
    const text = ((result.content[0] as any).text as string)
    expect(typeof text).toBe('string')
    expect(text).toContain('ID')
    expect(text).toContain('Name')
    expect(text).toContain('Country')
    expect(text).toContain('Founded')
    expect(mockApiClient.searchTeams).toHaveBeenCalledWith('Arsenal')
  })

  it('returns full JSON when format is explicitly json', async () => {
    const result = await searchTeamsTool.call({ params: { query: 'Arsenal', format: 'json' } } as any)

    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(((result.content[0] as any).text as string))
    expect(Array.isArray(payload.teams)).toBe(true)
    expect(payload.total).toBe(payload.teams.length)
    expect(payload.teams.length).toBeGreaterThan(0)
  })

  it('returns all teams as table by default when no query is supplied', async () => {
    const result = await searchTeamsTool.call({ params: { season: 2024 } } as any)

    expect(result.isError).toBeUndefined()
    const text = ((result.content[0] as any).text as string)
    expect(typeof text).toBe('string')
    expect(text).toContain('ID')
    expect(text).toContain('Name')
    expect(mockApiClient.getTeams).toHaveBeenCalledWith(2024)
  })
})
