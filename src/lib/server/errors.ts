import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'

export class APIFootballMcpError extends McpError {
  constructor (code: ErrorCode, message: string, data?: unknown) {
    super(code, message, data)
    this.name = 'APIFootballMcpError'
  }
}

// Custom error factory functions for common scenarios
export const MCPErrors = {
  // Invalid request errors (-32600 to -32699)
  invalidRequest: (message: string, data?: unknown) =>
    new APIFootballMcpError(ErrorCode.InvalidRequest, message, data),

  invalidParams: (message: string, data?: unknown) =>
    new APIFootballMcpError(ErrorCode.InvalidParams, message, data),

  // Method errors (-32000 to -32099)
  methodNotFound: (toolName: string) =>
    new APIFootballMcpError(ErrorCode.MethodNotFound, `Tool not found: ${toolName}`),

  // Internal errors (-32603)
  internalError: (message: string, data?: unknown) =>
    new APIFootballMcpError(ErrorCode.InternalError, message, data),

  // Application-specific errors (-32000 to -32099)
  apiKeyMissing: () =>
    new APIFootballMcpError(ErrorCode.InternalError, 'API key is required. Please set API_FOOTBALL_KEY environment variable.'),

  apiKeyInvalid: () =>
    new APIFootballMcpError(ErrorCode.InternalError, 'Invalid API key. Please check your API_FOOTBALL_KEY environment variable.'),

  rateLimitExceeded: (resetTime?: number) =>
    new APIFootballMcpError(
      ErrorCode.InternalError,
      'API rate limit exceeded. Please wait before making more requests.',
      { resetTime }
    ),

  seasonOutOfRange: (season: number, min: number, max: number) =>
    new APIFootballMcpError(
      ErrorCode.InvalidParams,
      `Season ${season} is out of range. Must be between ${min} and ${max}.`,
      { season, validRange: { min, max } }
    ),

  resourceNotFound: (resource: string, identifier: string | number) =>
    new APIFootballMcpError(
      ErrorCode.InternalError,
      `${resource} not found: ${identifier}`,
      { resource, identifier }
    ),

  invalidDateFormat: (field: string, value: string) =>
    new APIFootballMcpError(
      ErrorCode.InvalidParams,
      `Invalid date format for ${field}: ${value}. Expected YYYY-MM-DD.`,
      { field, value, expectedFormat: 'YYYY-MM-DD' }
    ),

  invalidDateRange: (from: string, to: string) =>
    new APIFootballMcpError(
      ErrorCode.InvalidParams,
      `Invalid date range: "from" date (${from}) must be before or equal to "to" date (${to}).`,
      { from, to }
    ),

  limitOutOfRange: (limit: number, min: number, max: number) =>
    new APIFootballMcpError(
      ErrorCode.InvalidParams,
      `Limit ${limit} is out of range. Must be between ${min} and ${max}.`,
      { limit, validRange: { min, max } }
    ),

  apiTimeout: () =>
    new APIFootballMcpError(
      ErrorCode.InternalError,
      'Request to API-Football service timed out. Please try again.'
    ),

  apiUnavailable: () =>
    new APIFootballMcpError(
      ErrorCode.InternalError,
      'API-Football service is currently unavailable. Please try again later.'
    )
}

// Error handler utility
export function handleError (error: unknown): McpError {
  if (error instanceof McpError) {
    return error
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('API key')) {
      return MCPErrors.apiKeyInvalid()
    }

    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return MCPErrors.rateLimitExceeded()
    }

    if (error.message.includes('timeout')) {
      return MCPErrors.apiTimeout()
    }

    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return MCPErrors.apiUnavailable()
    }

    // Generic error wrapper
    return MCPErrors.internalError(error.message, {
      originalError: error.name,
      stack: error.stack
    })
  }

  // Unknown error type
  return MCPErrors.internalError('An unknown error occurred', { error })
}

// Validation helpers
export function validateRequiredParam (value: unknown, paramName: string): asserts value is NonNullable<typeof value> {
  if (value === null || value === undefined) {
    throw MCPErrors.invalidParams(`Parameter "${paramName}" is required`)
  }
}

export function validateNumberParam (value: unknown, paramName: string, options: {
  required?: boolean
  min?: number
  max?: number
} = {}): number | undefined {
  if (value === null || value === undefined) {
    if (options.required) {
      throw MCPErrors.invalidParams(`Parameter "${paramName}" is required`)
    }
    return undefined
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw MCPErrors.invalidParams(`Parameter "${paramName}" must be a valid number`)
  }

  if (options.min !== undefined && value < options.min) {
    throw MCPErrors.invalidParams(`Parameter "${paramName}" must be at least ${options.min}`)
  }

  if (options.max !== undefined && value > options.max) {
    throw MCPErrors.invalidParams(`Parameter "${paramName}" must be at most ${options.max}`)
  }

  return value
}

export function validateStringParam (value: unknown, paramName: string, options: {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
} = {}): string | undefined {
  if (value === null || value === undefined) {
    if (options.required) {
      throw MCPErrors.invalidParams(`Parameter "${paramName}" is required`)
    }
    return undefined
  }

  if (typeof value !== 'string') {
    throw MCPErrors.invalidParams(`Parameter "${paramName}" must be a string`)
  }

  if (options.minLength !== undefined && value.length < options.minLength) {
    throw MCPErrors.invalidParams(`Parameter "${paramName}" must be at least ${options.minLength} characters`)
  }

  if (options.maxLength !== undefined && value.length > options.maxLength) {
    throw MCPErrors.invalidParams(`Parameter "${paramName}" must be at most ${options.maxLength} characters`)
  }

  if (options.pattern && !options.pattern.test(value)) {
    throw MCPErrors.invalidParams(`Parameter "${paramName}" has invalid format`)
  }

  return value
}
