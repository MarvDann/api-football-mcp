import { API_ENDPOINTS, API_HEADERS, PREMIER_LEAGUE_ID, ApiEndpointParams, ApiResponse, ApiError } from './endpoints'
import { withRetry, RetryConfig, DEFAULT_RETRY_CONFIG, RetryableError, RateLimitTracker, sleep } from './retry'

export interface APIFootballClientConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
  retryConfig?: RetryConfig
}

export class APIFootballClient {
  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly timeout: number
  private readonly retryConfig: RetryConfig
  private readonly rateLimitTracker: RateLimitTracker

  constructor (config: APIFootballClientConfig) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl ?? API_ENDPOINTS.BASE_URL
    this.timeout = config.timeout ?? 10000
    this.retryConfig = config.retryConfig ?? DEFAULT_RETRY_CONFIG
    this.rateLimitTracker = new RateLimitTracker()

    if (!this.apiKey) {
      throw new Error('API key is required')
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    params: ApiEndpointParams = {}
  ): Promise<ApiResponse<T>> {
    // Check if we need to wait for rate limit reset
    if (this.rateLimitTracker.shouldWaitForReset()) {
      const waitTime = this.rateLimitTracker.getWaitTime()
      // eslint-disable-next-line no-console
      console.warn(`Rate limit reached, waiting ${waitTime}ms`)
      await sleep(waitTime)
    }

    const url = new URL(endpoint, this.baseUrl)

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString())
      }
    })

    const operation = async (): Promise<ApiResponse<T>> => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => { controller.abort() }, this.timeout)

      try {
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            ...API_HEADERS,
            'x-apisports-key': this.apiKey
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        // Update rate limit tracker
        this.rateLimitTracker.updateFromHeaders(
          Object.fromEntries(response.headers.entries())
        )

        if (!response.ok) {
          const error: ApiError = {
            message: `HTTP ${response.status}: ${response.statusText}`,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()) as any
          }

          if (response.status === 429) {
            throw new RetryableError(error.message, response.status, true)
          }

          if (response.status >= 400 && response.status < 500) {
            // Client errors are not retryable (except 429)
            throw new RetryableError(error.message, response.status, false)
          }

          throw new RetryableError(error.message, response.status, true)
        }

        const data = await response.json() as ApiResponse<T>

        // Check for API errors in response
        if (data.errors && data.errors.length > 0) {
          throw new RetryableError(
            `API Error: ${data.errors.map(e => JSON.stringify(e)).join(', ')}`,
            response.status,
            false
          )
        }

        return data
      } catch (error) {
        clearTimeout(timeoutId)

        if (error instanceof RetryableError) {
          throw error
        }

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new RetryableError('Request timeout', 408, true)
          }
          throw new RetryableError(error.message, undefined, true)
        }

        throw new RetryableError('Unknown error occurred', undefined, true)
      }
    }

    return withRetry(operation, this.retryConfig)
  }

  // Standings
  async getStandings (season?: number): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.STANDINGS, {
      league: PREMIER_LEAGUE_ID,
      season: season ?? new Date().getFullYear()
    })
  }

  // Fixtures
  async getFixtures (params: {
    season?: number
    team?: number
    from?: string
    to?: string
    date?: string
    status?: string
    limit?: number
  } = {}): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.FIXTURES, {
      league: PREMIER_LEAGUE_ID,
      ...params
    })
  }

  async getLiveFixtures (): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.FIXTURES_LIVE, {
      league: PREMIER_LEAGUE_ID
    })
  }

  // Teams
  async getTeams (season?: number): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.TEAMS, {
      league: PREMIER_LEAGUE_ID,
      season: season ?? new Date().getFullYear()
    })
  }

  async getTeam (teamId: number, season?: number): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.TEAMS, {
      id: teamId,
      ...(season && { season })
    })
  }

  async searchTeams (query: string, season?: number): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.TEAMS, {
      league: PREMIER_LEAGUE_ID,
      search: query,
      ...(season && { season })
    })
  }

  // Players
  async getPlayers (params: {
    team?: number
    season?: number
    search?: string
    page?: number
  } = {}): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.PLAYERS, {
      league: PREMIER_LEAGUE_ID,
      ...params
    })
  }

  async getPlayer (playerId: number, season?: number): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.PLAYERS, {
      id: playerId,
      ...(season && { season })
    })
  }

  async searchPlayers (query: string, params: {
    team?: number
    season?: number
    page?: number
  } = {}): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.PLAYERS, {
      league: PREMIER_LEAGUE_ID,
      search: query,
      ...params
    })
  }

  async getSquad (teamId: number, season?: number): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.PLAYERS_SQUADS, {
      team: teamId,
      ...(season && { season })
    })
  }

  // Match Events
  async getFixtureEvents (fixtureId: number): Promise<ApiResponse<any[]>> {
    return this.makeRequest(API_ENDPOINTS.FIXTURES_EVENTS, {
      fixture: fixtureId
    })
  }

  // Rate limit information
  getRateLimitInfo (): {
    remaining: number
    limit: number
    shouldWait: boolean
    waitTime: number
  } {
    return {
      remaining: this.rateLimitTracker.getRemainingRequests(),
      limit: this.rateLimitTracker.getLimit(),
      shouldWait: this.rateLimitTracker.shouldWaitForReset(),
      waitTime: this.rateLimitTracker.getWaitTime()
    }
  }
}
