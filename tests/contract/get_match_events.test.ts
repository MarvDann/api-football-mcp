import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GetMatchGoalsTool } from '../../src/lib/tools/get-match-goals'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { getToolContract } from '../helpers/contract_spec'
import {
  sampleFixturesApiResponse,
  sampleMatchEventsResponse
} from '../helpers/sample-responses'

describe('Contract: get_match_goals tool', () => {
  let cache: LRUCache
  let getMatchEventsTool: GetMatchGoalsTool
  let mockApiClient: {
    getFixtureEvents: ReturnType<typeof vi.fn>
    getFixtures: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 10, defaultTtl: 1000 })
    mockApiClient = {
      getFixtureEvents: vi.fn().mockResolvedValue(sampleMatchEventsResponse),
      getFixtures: vi.fn().mockResolvedValue(sampleFixturesApiResponse)
    }

    getMatchEventsTool = new GetMatchGoalsTool(mockApiClient as any, cache)
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  it('matches the documented contract metadata', () => {
    const contract = getToolContract('get_match_goals')

    expect(getMatchEventsTool.name).toBe(contract.name)
    expect(getMatchEventsTool.description).toBe(contract.description)
    expect(getMatchEventsTool.inputSchema).toEqual(contract.inputSchema)
  })

  it('returns fixture and event data that satisfy the documented schema', async () => {
    const result = await getMatchEventsTool.call({ params: { fixtureId: 1200001 } } as any)

    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0].text)

    expect(payload.fixture).toMatchObject({
      id: 1200001,
      referee: expect.any(String),
      timezone: expect.any(String),
      date: expect.any(String),
      status: {
        long: expect.any(String),
        short: expect.any(String)
      },
      teams: {
        home: {
          id: expect.any(Number),
          name: expect.any(String)
        },
        away: {
          id: expect.any(Number),
          name: expect.any(String)
        }
      }
    })

    expect(Array.isArray(payload.events)).toBe(true)
    expect(payload.events.length).toBeGreaterThan(0)
    expect(payload.events[0]).toMatchObject({
      time: {
        elapsed: expect.any(Number)
      },
      team: {
        id: expect.any(Number),
        name: expect.any(String)
      },
      player: {
        id: expect.any(Number),
        name: expect.any(String)
      },
      type: expect.any(String),
      detail: expect.any(String)
    })

    expect(mockApiClient.getFixtureEvents).toHaveBeenCalledWith(1200001)
    expect(mockApiClient.getFixtures).toHaveBeenCalledWith({ id: 1200001 })
  })

  it('rejects invalid fixture identifiers before hitting the API', async () => {
    const result = await getMatchEventsTool.call({ params: { fixtureId: -5 } } as any)
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('fixtureId must be a positive number')
    expect(mockApiClient.getFixtureEvents).not.toHaveBeenCalled()
  })
})
