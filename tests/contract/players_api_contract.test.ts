import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { APIFootballClient } from '../../src/lib/api-client/client'
import { samplePlayerResponse } from '../helpers/sample-responses'

function createFetchMock () {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(samplePlayerResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '59',
        'X-RateLimit-Reset': `${Date.now() + 60_000}`
      }
    })
  )
}

describe('API Contract: players endpoint', () => {
  let fetchMock: ReturnType<typeof createFetchMock>
  let client: APIFootballClient

  beforeEach(() => {
    fetchMock = createFetchMock()
    vi.spyOn(globalThis, 'fetch').mockImplementation(fetchMock as any)

    client = new APIFootballClient({
      apiKey: 'test-key',
      baseUrl: 'https://example.test'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('enforces league parameter when searching players', async () => {
    await client.searchPlayers('Haaland', { season: 2024 })

    const [rawUrl] = fetchMock.mock.calls[0]!
    const url = new URL(rawUrl as string)

    expect(url.pathname).toBe('/players')
    expect(url.searchParams.get('search')).toBe('Haaland')
    expect(url.searchParams.get('league')).toBe('39')
    expect(url.searchParams.get('season')).toBe('2024')
  })

  it('requires season when fetching player by id per API documentation', async () => {
    await client.getPlayer(278, 2024)

    const [rawUrl] = fetchMock.mock.calls[0]!
    const url = new URL(rawUrl as string)

    expect(url.searchParams.get('id')).toBe('278')
    expect(url.searchParams.get('season')).toBe('2024')
  })

  it('supports querying player lists by team and season', async () => {
    await client.getPlayers({ team: 33, season: 2024, page: 2 })

    const [rawUrl] = fetchMock.mock.calls[0]!
    const url = new URL(rawUrl as string)

    expect(url.searchParams.get('team')).toBe('33')
    expect(url.searchParams.get('season')).toBe('2024')
    expect(url.searchParams.get('page')).toBe('2')
    expect(url.searchParams.get('league')).toBe('39')
  })
})
