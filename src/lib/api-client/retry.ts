export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitterMax: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitterMax: 1000 // Up to 1 second of jitter
}

export class RetryableError extends Error {
  public readonly statusCode: number | undefined
  public readonly isRetryable: boolean

  constructor (message: string, statusCode?: number, isRetryable = true) {
    super(message)
    this.name = 'RetryableError'
    this.statusCode = statusCode
    this.isRetryable = isRetryable
  }

  // Aliases for compatibility with different test patterns
  get status (): number | undefined {
    return this.statusCode
  }

  get retryable (): boolean {
    return this.isRetryable
  }
}

export function isRetryableStatusCode (statusCode: number): boolean {
  // Retry on these HTTP status codes
  return [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
    520, // Cloudflare: Web Server Returned an Unknown Error
    521, // Cloudflare: Web Server Is Down
    522, // Cloudflare: Connection Timed Out
    523, // Cloudflare: Origin Is Unreachable
    524 // Cloudflare: A Timeout Occurred
  ].includes(statusCode)
}

export function calculateDelay (attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * (backoffMultiplier ^ attempt)
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt)

  // Cap at maxDelay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay)

  // Add jitter to avoid thundering herd
  const jitter = Math.random() * config.jitterMax

  return cappedDelay + jitter
}

export async function sleep (ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function withRetry<T> (
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break
      }

      // Check if error is retryable
      if (error instanceof RetryableError) {
        if (!error.isRetryable) {
          throw error
        }
        // RetryableError is explicitly retryable, continue to retry
      } else {
        // For non-RetryableError instances, check if status code is retryable
        const statusCode = (error as any).statusCode || (error as any).status
        if (!statusCode || !isRetryableStatusCode(statusCode)) {
          throw error // Don't retry regular errors without retryable status codes
        }
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, config)
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message)
      await sleep(delay)
    }
  }

  throw lastError || new Error('Operation failed')
}

export class RateLimitTracker {
  private remaining = 0
  private resetTime = 0
  private limit = 0

  updateFromHeaders (headers: Record<string, string>): void {
    const remaining = headers['x-ratelimit-remaining'] ||
                     headers['X-RateLimit-Remaining'] ||
                     headers['x-ratelimit-requests-remaining'] ||
                     headers['x-rapidapi-requests-remaining']

    const reset = headers['x-ratelimit-reset'] ||
                 headers['X-RateLimit-Reset'] ||
                 headers['x-ratelimit-requests-reset'] ||
                 headers['x-rapidapi-requests-reset']

    const limit = headers['x-ratelimit-limit'] ||
                 headers['X-RateLimit-Limit'] ||
                 headers['x-ratelimit-requests-limit'] ||
                 headers['x-rapidapi-requests-limit']

    if (remaining) {
      const remainingNum = parseInt(remaining, 10)
      if (!isNaN(remainingNum)) this.remaining = remainingNum
    }
    if (reset) {
      const resetNum = parseInt(reset, 10)
      if (!isNaN(resetNum)) this.resetTime = resetNum * 1000 // Convert to milliseconds
    }
    if (limit) {
      const limitNum = parseInt(limit, 10)
      if (!isNaN(limitNum)) this.limit = limitNum
    }
  }

  shouldWaitForReset (): boolean {
    return this.remaining <= 0 && Date.now() < this.resetTime
  }

  getWaitTime (): number {
    if (!this.shouldWaitForReset()) return 0
    return Math.max(0, this.resetTime - Date.now())
  }

  getRemainingRequests (): number {
    return this.remaining
  }

  getLimit (): number {
    return this.limit
  }
}
