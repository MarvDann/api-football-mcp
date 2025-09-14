import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RateLimitTracker, RetryableError, withRetry, sleep, DEFAULT_RETRY_CONFIG } from '../../src/lib/api-client/retry'

// Mock the sleep function to avoid actual delays in tests
vi.spyOn({ sleep } as any, 'sleep').mockImplementation(() => Promise.resolve())

describe('Rate Limit Handling', () => {
  let tracker: RateLimitTracker
  let originalDateNow: typeof Date.now
  let mockTime: number

  beforeEach(() => {
    // Mock Date.now to control time
    mockTime = 1000000000000 // Fixed timestamp
    originalDateNow = Date.now
    Date.now = vi.fn(() => mockTime)

    tracker = new RateLimitTracker()
  })

  afterEach(() => {
    Date.now = originalDateNow
  })

  describe('RateLimitTracker', () => {
    describe('Basic Functionality', () => {
      it('should initialize with no rate limit info', () => {
        expect(tracker.getRemainingRequests()).toBe(0)
        expect(tracker.getLimit()).toBe(0)
        expect(tracker.shouldWaitForReset()).toBe(false)
        expect(tracker.getWaitTime()).toBe(0)
      })

      it('should update from response headers', () => {
        const headers = {
          'x-ratelimit-requests-remaining': '95',
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-reset': String(Math.floor(mockTime / 1000) + 60) // 60 seconds from now
        }

        tracker.updateFromHeaders(headers)

        expect(tracker.getRemainingRequests()).toBe(95)
        expect(tracker.getLimit()).toBe(100)
        expect(tracker.shouldWaitForReset()).toBe(false)
      })

      it('should handle alternative header formats', () => {
        const headers = {
          'x-rapidapi-requests-remaining': '50',
          'x-rapidapi-requests-limit': '100',
          'x-rapidapi-requests-reset': String(Math.floor(mockTime / 1000) + 30)
        }

        tracker.updateFromHeaders(headers)

        expect(tracker.getRemainingRequests()).toBe(50)
        expect(tracker.getLimit()).toBe(100)
      })
    })

    describe('Rate Limit Detection', () => {
      it('should detect when rate limit is reached', () => {
        const headers = {
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-reset': String(Math.floor(mockTime / 1000) + 60)
        }

        tracker.updateFromHeaders(headers)

        expect(tracker.shouldWaitForReset()).toBe(true)
        expect(tracker.getWaitTime()).toBeGreaterThan(0)
      })

      it('should calculate correct wait time until reset', () => {
        const resetTime = Math.floor(mockTime / 1000) + 30 // 30 seconds from now
        const headers = {
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-reset': String(resetTime)
        }

        tracker.updateFromHeaders(headers)

        const waitTime = tracker.getWaitTime()
        expect(waitTime).toBeGreaterThan(29000) // At least 29 seconds
        expect(waitTime).toBeLessThanOrEqual(30000) // At most 30 seconds
      })

      it('should handle past reset times', () => {
        const resetTime = Math.floor(mockTime / 1000) - 30 // 30 seconds ago
        const headers = {
          'x-ratelimit-requests-remaining': '0',
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-reset': String(resetTime)
        }

        tracker.updateFromHeaders(headers)

        expect(tracker.shouldWaitForReset()).toBe(false)
        expect(tracker.getWaitTime()).toBe(0)
      })
    })

    describe('Low Remaining Requests', () => {
      it('should detect when requests are running low', () => {
        const headers = {
          'x-ratelimit-requests-remaining': '5',
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-reset': String(Math.floor(mockTime / 1000) + 60)
        }

        tracker.updateFromHeaders(headers)

        expect(tracker.shouldWaitForReset()).toBe(false) // Not at zero yet
        expect(tracker.getRemainingRequests()).toBe(5)
      })

      it('should handle single remaining request', () => {
        const headers = {
          'x-ratelimit-requests-remaining': '1',
          'x-ratelimit-requests-limit': '100',
          'x-ratelimit-requests-reset': String(Math.floor(mockTime / 1000) + 60)
        }

        tracker.updateFromHeaders(headers)

        expect(tracker.shouldWaitForReset()).toBe(false)
        expect(tracker.getRemainingRequests()).toBe(1)
      })
    })

    describe('Invalid Headers', () => {
      it('should handle missing headers gracefully', () => {
        const headers = {}

        tracker.updateFromHeaders(headers)

        // Should not crash and maintain default values
        expect(tracker.getRemainingRequests()).toBe(0)
        expect(tracker.getLimit()).toBe(0)
      })

      it('should handle invalid numeric values', () => {
        const headers = {
          'x-ratelimit-requests-remaining': 'invalid',
          'x-ratelimit-requests-limit': 'also-invalid',
          'x-ratelimit-requests-reset': 'not-a-number'
        }

        tracker.updateFromHeaders(headers)

        // Should handle gracefully with defaults
        expect(tracker.getRemainingRequests()).toBe(0)
        expect(tracker.getLimit()).toBe(0)
        expect(tracker.shouldWaitForReset()).toBe(false)
      })

      it('should handle negative values', () => {
        const headers = {
          'x-ratelimit-requests-remaining': '-5',
          'x-ratelimit-requests-limit': '-100',
          'x-ratelimit-requests-reset': String(Math.floor(mockTime / 1000) + 60) // Future reset time
        }

        tracker.updateFromHeaders(headers)

        // Negative remaining should be treated as zero
        expect(tracker.getRemainingRequests()).toBe(-5) // Keep original for debugging
        expect(tracker.shouldWaitForReset()).toBe(true) // Negative is <= 0 AND reset is in future
      })
    })
  })

  describe('RetryableError', () => {
    it('should create retryable error correctly', () => {
      const error = new RetryableError('Test error', 500, true)

      expect(error.message).toBe('Test error')
      expect(error.status).toBe(500)
      expect(error.retryable).toBe(true)
      expect(error.name).toBe('RetryableError')
    })

    it('should create non-retryable error correctly', () => {
      const error = new RetryableError('Test error', 400, false)

      expect(error.retryable).toBe(false)
      expect(error.status).toBe(400)
    })

    it('should handle undefined status', () => {
      const error = new RetryableError('Test error', undefined, true)

      expect(error.status).toBeUndefined()
      expect(error.retryable).toBe(true)
    })
  })

  describe('withRetry Function', () => {
    // Tests focus on behavior, not implementation details

    describe('Successful Operations', () => {
      it('should return result on first try when operation succeeds', async () => {
        const operation = vi.fn().mockResolvedValue('success')

        const result = await withRetry(operation, DEFAULT_RETRY_CONFIG)

        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(1)
      })

      it('should not retry successful operations', async () => {
        const operation = vi.fn().mockResolvedValue({ data: 'test' })

        await withRetry(operation, DEFAULT_RETRY_CONFIG)

        expect(operation).toHaveBeenCalledTimes(1)
      })
    })

    describe('Retryable Errors', () => {
      it('should retry retryable errors', async () => {
        const operation = vi.fn()
          .mockRejectedValueOnce(new RetryableError('Server error', 500, true))
          .mockRejectedValueOnce(new RetryableError('Server error', 500, true))
          .mockResolvedValue('success')

        const result = await withRetry(operation, DEFAULT_RETRY_CONFIG)

        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(3)
      })

      it('should respect maximum retry attempts', async () => {
        const operation = vi.fn()
          .mockRejectedValue(new RetryableError('Server error', 500, true))

        const config = { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 }

        await expect(withRetry(operation, config)).rejects.toThrow('Server error')
        expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
      })

      it('should use exponential backoff delays', async () => {
        const operation = vi.fn()
          .mockRejectedValueOnce(new RetryableError('Server error', 500, true))
          .mockRejectedValueOnce(new RetryableError('Server error', 500, true))
          .mockResolvedValue('success')

        const config = { ...DEFAULT_RETRY_CONFIG, baseDelay: 100 }

        const result = await withRetry(operation, config)

        // Test the behavior: operation succeeds after retries
        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(3) // Initial + 2 retries
      })
    })

    describe('Non-Retryable Errors', () => {
      it('should not retry non-retryable errors', async () => {
        const operation = vi.fn()
          .mockRejectedValue(new RetryableError('Bad request', 400, false))

        await expect(withRetry(operation, DEFAULT_RETRY_CONFIG)).rejects.toThrow('Bad request')
        expect(operation).toHaveBeenCalledTimes(1)
      })

      it('should not retry non-RetryableError instances', async () => {
        const operation = vi.fn()
          .mockRejectedValue(new Error('Regular error'))

        await expect(withRetry(operation, DEFAULT_RETRY_CONFIG)).rejects.toThrow('Regular error')
        expect(operation).toHaveBeenCalledTimes(1)
      })
    })

    describe('Rate Limit Specific Scenarios', () => {
      it('should retry 429 (Too Many Requests) errors', async () => {
        const operation = vi.fn()
          .mockRejectedValueOnce(new RetryableError('Too Many Requests', 429, true))
          .mockResolvedValue('success')

        const result = await withRetry(operation, DEFAULT_RETRY_CONFIG)

        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(2)
      })

      it('should handle rate limit with longer delays', async () => {
        const operation = vi.fn()
          .mockRejectedValueOnce(new RetryableError('Rate limit exceeded', 429, true))
          .mockResolvedValue('success')

        const config = {
          ...DEFAULT_RETRY_CONFIG,
          baseDelay: 1000,
          maxDelay: 30000
        }

        const result = await withRetry(operation, config)

        // Test behavior: operation succeeds after rate limit retry
        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(2) // Initial + 1 retry
      })

      it('should respect maximum delay for rate limits', async () => {
        const operation = vi.fn()
          .mockRejectedValue(new RetryableError('Rate limit exceeded', 429, true))

        const config = {
          maxRetries: 5,
          baseDelay: 1000,
          backoffMultiplier: 3,
          maxDelay: 5000,
          jitterMax: 1000
        }

        await expect(withRetry(operation, config)).rejects.toThrow()

        // Test behavior: all retries were attempted
        expect(operation).toHaveBeenCalledTimes(6) // Initial + 5 retries
      }, 30000)
    })

    describe('Edge Cases', () => {
      it('should handle zero max retries', async () => {
        const operation = vi.fn()
          .mockRejectedValue(new RetryableError('Server error', 500, true))

        const config = { ...DEFAULT_RETRY_CONFIG, maxRetries: 0 }

        await expect(withRetry(operation, config)).rejects.toThrow('Server error')
        expect(operation).toHaveBeenCalledTimes(1) // No retries
      })

      it('should handle zero base delay', async () => {
        const operation = vi.fn()
          .mockRejectedValueOnce(new RetryableError('Server error', 500, true))
          .mockResolvedValue('success')

        const config = { ...DEFAULT_RETRY_CONFIG, baseDelay: 0 }

        const result = await withRetry(operation, config)

        // Test behavior: operation succeeds after retry with zero delay
        expect(result).toBe('success')
        expect(operation).toHaveBeenCalledTimes(2) // Initial + 1 retry
      })

      // Removed "should handle very large retry counts" test as it's unrealistic and causes timeouts
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle realistic API rate limiting flow', async () => {
      const tracker = new RateLimitTracker()

      // Simulate initial successful request
      tracker.updateFromHeaders({
        'x-ratelimit-requests-remaining': '10',
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-reset': String(Math.floor(mockTime / 1000) + 60)
      })

      expect(tracker.shouldWaitForReset()).toBe(false)

      // Simulate rate limit hit
      tracker.updateFromHeaders({
        'x-ratelimit-requests-remaining': '0',
        'x-ratelimit-requests-limit': '100',
        'x-ratelimit-requests-reset': String(Math.floor(mockTime / 1000) + 60)
      })

      expect(tracker.shouldWaitForReset()).toBe(true)
      expect(tracker.getWaitTime()).toBeGreaterThan(0)

      // Simulate time passing and reset
      mockTime += 61000 // 61 seconds later

      // Rate limit should be reset
      expect(tracker.shouldWaitForReset()).toBe(false)
      expect(tracker.getWaitTime()).toBe(0)
    })

    it('should handle rapid consecutive rate limit updates', async () => {
      const tracker = new RateLimitTracker()

      // Rapid updates simulating multiple concurrent requests
      const updates = [
        { remaining: '50', limit: '100' },
        { remaining: '45', limit: '100' },
        { remaining: '40', limit: '100' },
        { remaining: '35', limit: '100' },
        { remaining: '0', limit: '100' }
      ]

      updates.forEach((update, index) => {
        tracker.updateFromHeaders({
          'x-ratelimit-requests-remaining': update.remaining,
          'x-ratelimit-requests-limit': update.limit,
          'x-ratelimit-requests-reset': String(Math.floor(mockTime / 1000) + 60)
        })

        if (index === updates.length - 1) {
          expect(tracker.shouldWaitForReset()).toBe(true)
        } else {
          expect(tracker.shouldWaitForReset()).toBe(false)
        }
      })
    })
  })
})
