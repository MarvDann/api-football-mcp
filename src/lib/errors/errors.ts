// Error handling utilities
import { logger } from '../logger/logger'

export class AppError extends Error {
  constructor (
    message: string,
    public code: string,
    public statusCode = 500,
    public isOperational = true
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  public field?: string

  constructor (message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400)
    if (field !== undefined) {
      this.field = field
    }
  }
}

export class APIError extends AppError {
  constructor (message: string, statusCode: number, apiCode?: string) {
    super(message, apiCode ?? 'API_ERROR', statusCode)
  }
}

export class CacheError extends AppError {
  public operation?: string

  constructor (message: string, operation?: string) {
    super(message, 'CACHE_ERROR', 500)
    if (operation !== undefined) {
      this.operation = operation
    }
  }
}

export class ConfigError extends AppError {
  public configKey?: string

  constructor (message: string, configKey?: string) {
    super(message, 'CONFIG_ERROR', 500)
    if (configKey !== undefined) {
      this.configKey = configKey
    }
  }
}

// Error handling utilities
export function isAppError (error: unknown): error is AppError {
  return error instanceof AppError
}

export function isNodeError (error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error && 'errno' in error
}

export function formatError (error: unknown): {
  message: string
  code?: string | undefined
  stack?: string | undefined
  isOperational: boolean
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      stack: error.stack,
      isOperational: error.isOperational
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: undefined,
      stack: error.stack,
      isOperational: false
    }
  }

  return {
    message: String(error),
    code: undefined,
    stack: undefined,
    isOperational: false
  }
}

export function createErrorHandler (context: string) {
  return (error: unknown): never => {
    const formatted = formatError(error)
    const errorMessage = `[${context}] ${formatted.message}`

    if (formatted.isOperational) {
      // Operational errors are expected and should be handled gracefully
      throw new AppError(errorMessage, formatted.code ?? 'OPERATIONAL_ERROR')
    } else {
      // Programming errors should be logged and re-thrown
      logger.error(`Unexpected error in ${context}: ${formatted.stack ?? errorMessage}`)
      throw new AppError('An unexpected error occurred', 'INTERNAL_ERROR', 500, false)
    }
  }
}

// Promise utilities for better async/await handling
export async function withErrorContext<T> (
  promise: Promise<T>,
  context: string
): Promise<T> {
  try {
    return await promise
  } catch (error) {
    throw createErrorHandler(context)(error)
  }
}

export function safeAsync<T extends unknown[], R> (
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args)
    } catch (error) {
      const formatted = formatError(error)
      throw new AppError(
        formatted.message,
        formatted.code ?? 'ASYNC_ERROR',
        500,
        formatted.isOperational
      )
    }
  }
}

// Type guard for checking if a function is async
export function isAsync (fn: unknown): fn is (...args: unknown[]) => Promise<unknown> {
  return typeof fn === 'function' && fn.constructor.name === 'AsyncFunction'
}
