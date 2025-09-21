import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GetPlayerTool } from '../../src/lib/tools/get-player'
import { LRUCache } from '../../src/lib/cache/lru-cache'
import { getToolContract } from '../helpers/contract_spec'
import { samplePlayerResponse, samplePlayerSearchResponse } from '../helpers/sample-responses'

interface MockApiClient {
  getPlayer: ReturnType<typeof vi.fn>
  searchPlayers: ReturnType<typeof vi.fn>
}

describe('Contract: get_player tool', () => {
  let cache: LRUCache
  let getPlayerTool: GetPlayerTool
  let mockApiClient: MockApiClient

  beforeEach(() => {
    cache = new LRUCache({ maxSize: 10, defaultTtl: 1000 })
    mockApiClient = {
      getPlayer: vi.fn().mockResolvedValue(samplePlayerResponse),
      searchPlayers: vi.fn().mockResolvedValue(samplePlayerSearchResponse)
    }

    getPlayerTool = new GetPlayerTool(mockApiClient as any, cache)
  })

  afterEach(() => {
    cache.destroy()
    vi.restoreAllMocks()
  })

  it('matches the documented contract metadata', () => {
    const contract = getToolContract('get_player')

    expect(getPlayerTool.name).toBe(contract.name)
    expect(getPlayerTool.description).toBe(contract.description)
    expect(getPlayerTool.inputSchema).toEqual(contract.inputSchema)
  })

  it('returns player data and statistics that satisfy the documented schema', async () => {
    const result = await getPlayerTool.call({ params: { playerId: 278, season: 2024 } } as any)

    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0].text)

    expect(payload.player).toMatchObject({
      id: 278,
      name: 'Erling Haaland',
      firstname: 'Erling',
      lastname: 'Haaland',
      age: expect.any(Number),
      birthDate: expect.any(String),
      birthPlace: expect.any(String),
      birthCountry: expect.any(String),
      nationality: 'Norway',
      height: expect.any(String),
      weight: expect.any(String),
      photo: expect.any(String)
    })

    expect(payload.statistics).toMatchObject({
      playerId: 278,
      teamId: 50,
      season: 2024,
      appearances: expect.any(Number),
      lineups: expect.any(Number),
      minutes: expect.any(Number),
      goals: expect.any(Number),
      assists: expect.any(Number),
      yellowCards: expect.any(Number),
      redCards: expect.any(Number),
      rating: expect.any(Number)
    })

    expect(mockApiClient.getPlayer).toHaveBeenCalledWith(278, 2024)
  })

  it('supports lookups by player name through the documented contract', async () => {
    const result = await getPlayerTool.call({ params: { name: 'Marcus Rashford', season: 2024 } } as any)

    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0].text)

    expect(payload.player.name).toBe('Marcus Rashford')
    expect(mockApiClient.searchPlayers).toHaveBeenCalledWith('Marcus Rashford', {
      season: 2024,
      page: 1
    })
  })

  it('rejects requests without identifiers as required by the contract', async () => {
    const result = await getPlayerTool.call({ params: {} } as any)

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('Either playerId or name must be provided')
  })
})
