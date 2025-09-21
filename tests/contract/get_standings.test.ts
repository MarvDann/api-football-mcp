import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GetStandingsTool } from '../../src/lib/tools/get-standings'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { getToolContract } from '../helpers/contract_spec'
import { sampleStandingsApiResponse } from '../helpers/sample-responses'

describe('Contract: get_standings tool', () => {
  let cache: LRUCache
  let getStandingsTool: GetStandingsTool
  let mockApiClient: { getStandings: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 10, defaultTtl: 1000 })
    mockApiClient = {
      getStandings: vi.fn()
    }

    getStandingsTool = new GetStandingsTool(mockApiClient as any, cache)
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  it('matches the documented contract metadata', () => {
    const contract = getToolContract('get_standings')

    expect(getStandingsTool.name).toBe(contract.name)
    expect(getStandingsTool.description).toBe(contract.description)
    expect(getStandingsTool.inputSchema).toEqual(contract.inputSchema)
  })

  it('produces output that satisfies the contract schema', async () => {
    mockApiClient.getStandings.mockResolvedValue(sampleStandingsApiResponse)

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))

    const result = await getStandingsTool.call({ params: { season: 2024 } } as any)

    vi.useRealTimers()

    expect(result.isError).toBeUndefined()
    expect(result.content).toHaveLength(1)

    const payload = JSON.parse(result.content[0].text)

    expect(payload).toHaveProperty('standings')
    expect(Array.isArray(payload.standings)).toBe(true)
    expect(payload.standings.length).toBeGreaterThan(0)

    const standing = payload.standings[0]
    expect(standing).toMatchObject({
      rank: expect.any(Number),
      team: {
        id: expect.any(Number),
        name: expect.any(String),
        logo: expect.any(String)
      },
      points: expect.any(Number),
      goalsDiff: expect.any(Number),
      group: expect.any(String),
      form: expect.any(String),
      status: expect.any(String),
      all: {
        played: expect.any(Number),
        win: expect.any(Number),
        draw: expect.any(Number),
        lose: expect.any(Number),
        goals: {
          for: expect.any(Number),
          against: expect.any(Number)
        }
      },
      home: {
        played: expect.any(Number),
        win: expect.any(Number),
        draw: expect.any(Number),
        lose: expect.any(Number),
        goals: {
          for: expect.any(Number),
          against: expect.any(Number)
        }
      },
      away: {
        played: expect.any(Number),
        win: expect.any(Number),
        draw: expect.any(Number),
        lose: expect.any(Number),
        goals: {
          for: expect.any(Number),
          against: expect.any(Number)
        }
      },
      update: expect.any(String)
    })

    expect(payload).toHaveProperty('lastUpdated', '2025-01-15T12:00:00.000Z')

    // Ensure we called the API client with the requested season
    expect(mockApiClient.getStandings).toHaveBeenCalledWith(2024)
  })

  it('returns a contract-compliant error when season exceeds documented limits', async () => {
    const result = await getStandingsTool.call({ params: { season: 1980 } } as any)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Season must be between')
  })
})
