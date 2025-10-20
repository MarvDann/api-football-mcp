import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GetLiveMatchesTool } from '../../src/lib/tools/get-live-matches'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { getToolContract } from '../helpers/contract_spec'
import { sampleLiveFixturesResponse } from '../helpers/sample-responses'

describe('Contract: get_live_matches tool', () => {
  let cache: LRUCache
  let getLiveMatchesTool: GetLiveMatchesTool
  let mockApiClient: { getLiveFixtures: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 10, defaultTtl: 100 })
    mockApiClient = {
      getLiveFixtures: vi.fn().mockResolvedValue(sampleLiveFixturesResponse)
    }

    getLiveMatchesTool = new GetLiveMatchesTool(mockApiClient as any, cache)
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  it('matches the documented contract metadata', () => {
    const contract = getToolContract('get_live_matches')

    expect(getLiveMatchesTool.name).toBe(contract.name)
    expect(getLiveMatchesTool.description).toBe(contract.description)
    expect(getLiveMatchesTool.inputSchema).toEqual(contract.inputSchema)
  })

  it('returns compact table output by default', async () => {
    const result = await getLiveMatchesTool.call({ params: {} } as any)

    expect(result.isError).toBeUndefined()
    const text = ((result.content[0] as any).text as string)
    expect(typeof text).toBe('string')
    expect(text).toContain('ID')
    expect(text).toContain('Min')
    expect(text).toContain('Home')
    expect(text).toContain('Away')
    expect(text).toContain('Score')
    expect(text).toContain('St')

    expect(mockApiClient.getLiveFixtures).toHaveBeenCalled()
  })

  it('returns full JSON when format is explicitly json', async () => {
    const result = await getLiveMatchesTool.call({ params: { format: 'json' } } as any)
    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(((result.content[0] as any).text as string))
    expect(Array.isArray(payload.fixtures)).toBe(true)
    expect(payload.total).toBe(payload.fixtures.length)
    expect(payload.fixtures.length).toBeGreaterThan(0)
  })
})
