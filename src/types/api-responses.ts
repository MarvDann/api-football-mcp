// API-Football response types
// Based on API-Football v3 documentation

export interface APIFootballResponse<T> {
  get: string
  parameters: Record<string, unknown>
  errors: string[]
  results: number
  paging: {
    current: number
    total: number
  }
  response: T
}

// Rate limiting information from response headers
export interface RateLimitInfo {
  limit: number
  remaining: number
  reset: number
  window: number
}

// Cache information
export interface CacheInfo {
  size: number
  maxSize: number
  hitRate: number
  missRate: number
  entries: number
}

// Cache entry metadata
export interface CacheEntryInfo {
  key: string
  timestamp: number
  lastAccessed: number
  ttl: number
  size: number
  hits: number
}

// Cache statistics
export interface CacheStats {
  size: number
  maxSize: number
  entries: number
  hits: number
  misses: number
  hitRate: string
  memoryUsage: string
  oldestEntry: string | null
  newestEntry: string | null
}

// Configuration types
export interface ServerConfig {
  name: string
  version: string
  apiKey: string
  baseUrl: string
  timeout: number
  retryAttempts: number
  retryDelay: number
  cacheDefaultTtl: number
  cacheMaxSize: number
  cacheCheckInterval: number
  logLevel: string
  logPretty: boolean
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: string
  }
  api: {
    connected: boolean
    rateLimit: RateLimitInfo
  }
  cache: {
    status: string
    size: number
    maxSize: number
    hitRate: string
  }
}

// Tool execution result
export interface ToolResult<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
  metadata?: {
    cached: boolean
    executionTime: number
    rateLimit?: RateLimitInfo
  }
}

// Generic query parameters
export interface QueryParams {
  season?: number
  team?: number
  from?: string
  to?: string
  date?: string
  status?: string
  limit?: number
  page?: number
  search?: string
  position?: string
  [key: string]: unknown
}

