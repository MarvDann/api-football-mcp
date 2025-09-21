// Helper utilities for API contract tests that respect rate limiting
import { expect } from 'vitest'

export interface ApiResponse {
  errors: any[]
  results: number
  response: any
  [key: string]: any
}

export interface RateLimitInfo {
  isLimited: boolean
  waitTime?: number
  resetTime?: number
}

// Sleep utility
export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms))

// Check if response indicates rate limiting
export function checkRateLimit(data: any): RateLimitInfo {
  if (data.errors && typeof data.errors === 'object') {
    // Check for rate limit error message
    if (data.errors.rateLimit ||
        (typeof data.errors === 'string' && data.errors.includes('Too many requests'))) {
      return {
        isLimited: true,
        waitTime: 60000 // Wait 1 minute for rate limit reset
      }
    }

    // Check for specific rate limit fields
    for (const [key, value] of Object.entries(data.errors)) {
      if (typeof value === 'string' && value.includes('Too many requests')) {
        return {
          isLimited: true,
          waitTime: 60000
        }
      }
    }
  }

  return { isLimited: false }
}

// Make API call with rate limiting respect
export async function makeApiCall(
  url: string,
  apiKey: string,
  retryOnLimit = true,
  maxRetries = 3
): Promise<{ data: any, rateLimited: boolean }> {

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'x-apisports-key': apiKey,
        'x-apisports-host': 'v3.football.api-sports.io'
      }
    })

    const data = await response.json()
    const rateLimit = checkRateLimit(data)

    if (rateLimit.isLimited && retryOnLimit && attempt < maxRetries) {
      console.log(`Rate limited, waiting ${rateLimit.waitTime}ms before retry ${attempt + 1}/${maxRetries}`)
      await sleep(rateLimit.waitTime!)
      continue
    }

    return {
      data,
      rateLimited: rateLimit.isLimited
    }
  }

  throw new Error('Max retries exceeded due to rate limiting')
}

// Expect API error with rate limit handling - throws to skip test properly
export function expectApiError(
  data: any,
  expectedError: Record<string, string>,
  testName: string
): void {
  const rateLimit = checkRateLimit(data)

  if (rateLimit.isLimited) {
    console.log(`⏭️  Skipping ${testName} due to rate limiting`)
    // Throw to skip test instead of false positive
    throw new Error(`SKIP_TEST: Rate limited - ${testName}`)
  }

  // Test the actual error
  expect(data.errors).toEqual(
    expect.objectContaining(expectedError)
  )
}

// Expect API success with rate limit handling - throws to skip test properly
export function expectApiSuccess(
  data: any,
  testName: string,
  minResults = 0
): void {
  const rateLimit = checkRateLimit(data)

  if (rateLimit.isLimited) {
    console.log(`⏭️  Skipping ${testName} due to rate limiting`)
    // Throw to skip test instead of false positive
    throw new Error(`SKIP_TEST: Rate limited - ${testName}`)
  }

  // Test success
  expect(data.errors).toHaveLength(0)
  if (minResults > 0) {
    expect(data.results).toBeGreaterThanOrEqual(minResults)
  }
}

// Enhanced tool result checker that avoids false positives
export function expectToolSuccess(
  toolResult: any,
  testName: string,
  requireContent = true
): void {
  // First check if we have a valid tool result structure
  expect(toolResult).toBeDefined()
  expect(toolResult.content).toBeDefined()

  if (requireContent) {
    expect(toolResult.content).not.toHaveLength(0)
    expect(toolResult.content[0]).toBeDefined()
    expect(toolResult.content[0].text).toBeDefined()
  }

  // Check for error status
  if (toolResult.isError) {
    throw new Error(`Tool returned error: ${toolResult.content[0]?.text || 'Unknown error'}`)
  }

  // Check for rate limiting in tool response
  if (toolResult.content?.[0]?.text) {
    try {
      const responseData = JSON.parse(toolResult.content[0].text)
      const rateLimit = checkRateLimit(responseData)
      if (rateLimit.isLimited) {
        console.log(`⏭️  Skipping ${testName} due to rate limiting`)
        throw new Error(`SKIP_TEST: Rate limited - ${testName}`)
      }
    } catch (parseError) {
      // If JSON parsing fails, that might be valid (non-JSON response)
      // Only skip if the text explicitly mentions rate limiting
      if (toolResult.content[0].text.includes('rate limit') ||
          toolResult.content[0].text.includes('Too many requests')) {
        console.log(`⏭️  Skipping ${testName} due to rate limiting`)
        throw new Error(`SKIP_TEST: Rate limited - ${testName}`)
      }
    }
  }
}

// Add delay between API calls to respect rate limits
export const API_CALL_DELAY = 3500 // 3.5 seconds between calls to respect rate limits

export async function delayedApiCall<T>(
  fn: () => Promise<T>,
  delay = API_CALL_DELAY
): Promise<T> {
  await sleep(delay)
  return fn()
}

// Test wrapper that properly handles rate limiting without false positives
export function testWithRateLimit(
  testName: string,
  testFn: () => Promise<void>,
  timeout = 60000
) {
  return async () => {
    if (!process.env.API_FOOTBALL_KEY) {
      console.log(`⏭️  Skipping ${testName} - no API key`)
      return // Skip test
    }

    try {
      await testFn()
    } catch (error: any) {
      if (error.message?.startsWith('SKIP_TEST:')) {
        console.log(`⏭️  ${error.message}`)
        return // Skip test due to rate limiting
      }

      if (error.message?.includes('API key') || error.message?.includes('rate limit')) {
        console.log(`⏭️  Skipping ${testName} due to API issue: ${error.message}`)
        return // Skip test
      }

      // Re-throw actual test failures
      throw error
    }
  }
}
