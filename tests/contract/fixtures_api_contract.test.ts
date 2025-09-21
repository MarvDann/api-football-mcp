import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { APIFootballClient } from '../../src/lib/api-client/client'
import { sampleFixturesApiResponse } from '../helpers/sample-responses'

function createFetchMock () {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(sampleFixturesApiResponse), {
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

describe('API Contract: fixtures endpoint', () => {
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

  it('includes required league and season parameters', async () => {
    await client.getFixtures({ season: 2024, status: 'FT', team: 33 })

    expect(fetchMock).toHaveBeenCalled()
    const [rawUrl, options] = fetchMock.mock.calls[0]!
    const url = new URL(rawUrl as string)

    expect(url.pathname).toBe('/fixtures')
    expect(url.searchParams.get('league')).toBe('39')
    expect(url.searchParams.get('season')).toBe('2024')
    expect(url.searchParams.get('team')).toBe('33')
    expect(url.searchParams.get('status')).toBe('FT')

    expect(options?.headers).toMatchObject({
      'x-apisports-key': 'test-key',
      'x-apisports-host': 'v3.football.api-sports.io'
    })
  })

  it('adds season automatically when querying by date range per API expectations', async () => {
    await client.getFixtures({ from: '2025-01-01', to: '2025-01-05' })

    const [rawUrl] = fetchMock.mock.calls[0]!
    const url = new URL(rawUrl as string)

    expect(url.searchParams.get('season')).toBe(String(new Date().getFullYear()))
    expect(url.searchParams.get('from')).toBe('2025-01-01')
    expect(url.searchParams.get('to')).toBe('2025-01-05')
  })
})
