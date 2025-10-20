import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GetFixturesTool } from '../../src/lib/tools/get-fixtures'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { getToolContract } from '../helpers/contract_spec'
import { sampleFixturesApiResponse } from '../helpers/sample-responses'

describe('Contract: get_fixtures tool', () => {
  let cache: LRUCache
  let getFixturesTool: GetFixturesTool
  let mockApiClient: { getFixtures: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 10, defaultTtl: 1000 })
    mockApiClient = {
      getFixtures: vi.fn().mockResolvedValue(sampleFixturesApiResponse)
    }

    getFixturesTool = new GetFixturesTool(mockApiClient as any, cache)
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  it('matches the documented contract metadata', () => {
    const contract = getToolContract('get_fixtures')

    expect(getFixturesTool.name).toBe(contract.name)
    expect(getFixturesTool.description).toBe(contract.description)
    expect(getFixturesTool.inputSchema).toEqual(contract.inputSchema)
  })

  it('returns compact table output by default', async () => {
    const result = await getFixturesTool.call({ params: { season: 2024, teamId: 33 } } as any)

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(1)

    const text = ((result.content[0] as any).text as string)
    expect(typeof text).toBe('string')
    expect(text).toContain('ID')
    expect(text).toContain('Date')
    expect(text).toContain('Home')
    expect(text).toContain('Away')
    expect(text).toContain('Score')
    expect(text).toContain('St')
    expect(text).toContain('Rnd')

    expect(mockApiClient.getFixtures).toHaveBeenCalledWith({
      season: 2024,
      team: 33
    })
  })

  it('returns full JSON when format is explicitly json', async () => {
    const result = await getFixturesTool.call({ params: { season: 2024, teamId: 33, format: 'json' } } as any)

    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(((result.content[0] as any).text as string))

    expect(payload).toHaveProperty('fixtures')
    expect(Array.isArray(payload.fixtures)).toBe(true)
    expect(payload.total).toBe(payload.fixtures.length)
    expect(payload.fixtures.length).toBeGreaterThan(0)
  })

  it('rejects invalid date ranges before hitting the API', async () => {
    const result = await getFixturesTool.call({
      params: {
        from: '2025-01-31',
        to: '2025-01-01'
      }
    } as any)

    expect(result.isError).toBe(true)
    expect(((result.content[0] as any).text as string)).toContain('from" date must be before or equal to')
    expect(mockApiClient.getFixtures).not.toHaveBeenCalled()
  })
})
