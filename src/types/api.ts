// Shared API and client types

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitterMax: number
}

export interface ApiEndpointParams {
  league?: number
  season?: number
  team?: number
  player?: number
  fixture?: number
  from?: string
  to?: string
  date?: string
  status?: string
  round?: string
  search?: string
  limit?: number
  page?: number
  id?: number
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
}

export interface ApiResponse<T> {
  get: string
  parameters: Record<string, string>
  errors: unknown[]
  results: number
  paging: {
    current: number
    total: number
  }
  response: T
}

export interface ApiError {
  message: string
  status: number
  headers?: Record<string, string>
}
