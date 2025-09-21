import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { APIFootballClient } from '../../src/lib/api-client/client'
import { sampleTeamByIdResponse } from '../helpers/sample-responses'

function createFetchMock () {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(sampleTeamByIdResponse), {
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

describe('API Contract: teams endpoint', () => {
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

  it('fetches teams for the Premier League when requesting a season roster', async () => {
    await client.getTeams(2024)

    const [rawUrl] = fetchMock.mock.calls[0]!
    const url = new URL(rawUrl as string)

    expect(url.pathname).toBe('/teams')
    expect(url.searchParams.get('league')).toBe('39')
    expect(url.searchParams.get('season')).toBe('2024')
  })

  it('fetches a specific team by id without unnecessary parameters', async () => {
    await client.getTeam(33, 2024)

    const [rawUrl] = fetchMock.mock.calls[0]!
    const url = new URL(rawUrl as string)

    expect(url.searchParams.get('id')).toBe('33')
    expect(url.searchParams.get('season')).toBe('2024')
    expect(url.searchParams.get('league')).toBeNull()
  })

  it('scopes team search to the Premier League', async () => {
    await client.searchTeams('Arsenal')

    const [rawUrl] = fetchMock.mock.calls[0]!
    const url = new URL(rawUrl as string)

    expect(url.pathname).toBe('/teams')
    expect(url.searchParams.get('search')).toBe('Arsenal')
    expect(url.searchParams.get('league')).toBe('39')
  })
})
