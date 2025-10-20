import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SearchPlayersTool } from '../../src/lib/tools/search-players'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { getToolContract } from '../helpers/contract_spec'
import {
  samplePlayerSearchResponse,
  samplePlayerResponse
} from '../helpers/sample-responses'

describe('Contract: search_players tool', () => {
  let cache: LRUCache
  let searchPlayersTool: SearchPlayersTool
  let mockApiClient: {
    searchPlayers: ReturnType<typeof vi.fn>
    getPlayers: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 10, defaultTtl: 1000 })
    mockApiClient = {
      searchPlayers: vi.fn().mockResolvedValue(samplePlayerSearchResponse),
      getPlayers: vi.fn().mockResolvedValue(samplePlayerResponse)
    }

    searchPlayersTool = new SearchPlayersTool(mockApiClient as any, cache)
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  it('matches the documented contract metadata', () => {
    const contract = getToolContract('search_players')

    expect(searchPlayersTool.name).toBe(contract.name)
    expect(searchPlayersTool.description).toBe(contract.description)
    expect(searchPlayersTool.inputSchema).toEqual(contract.inputSchema)
  })

  it('returns compact table output by default', async () => {
    const result = await searchPlayersTool.call({
      params: { query: 'Rashford', season: 2024 }
    } as any)

    expect(result.isError).toBeUndefined()
    const text = ((result.content[0] as any).text as string)
    expect(typeof text).toBe('string')
    expect(text).toContain('ID')
    expect(text).toContain('Name')
    expect(text).toContain('Age')
    expect(text).toContain('Nat')
    expect(text).toContain('Pos')

    expect(mockApiClient.searchPlayers).toHaveBeenCalledWith('Rashford', {
      season: 2024,
      page: 1
    })
  })

  it('returns full JSON when format is explicitly json', async () => {
    const result = await searchPlayersTool.call({
      params: { query: 'Rashford', season: 2024, format: 'json' }
    } as any)
    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(((result.content[0] as any).text as string))
    expect(Array.isArray(payload.players)).toBe(true)
    expect(payload.total).toBe(payload.players.length)
  })

  it('filters players by team when requested', async () => {
    await searchPlayersTool.call({
      params: { teamId: 33, season: 2024 }
    } as any)

    expect(mockApiClient.getPlayers).toHaveBeenCalledWith({
      team: 33,
      season: 2024,
      page: 1
    })
  })

  it('applies position filter after retrieving candidates (json format)', async () => {
    const result = await searchPlayersTool.call({
      params: { query: 'Rashford', position: 'Attacker', season: 2024, format: 'json' }
    } as any)

    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(((result.content[0] as any).text as string))

    expect(payload.players.every((player: any) => player.position === 'Attacker')).toBe(true)
  })
})
