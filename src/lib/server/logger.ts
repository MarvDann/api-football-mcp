export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogContext {
  requestId?: string
  toolName?: string
  userId?: string
  apiEndpoint?: string
  duration?: number
  [key: string]: unknown
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export interface LoggerConfig {
  level: LogLevel
  formatJson?: boolean
  includeTimestamp?: boolean
  includeStack?: boolean
}

export class StructuredLogger {
  private config: LoggerConfig
  private requestId: string | null = null

  constructor (config: LoggerConfig = { level: LogLevel.INFO }) {
    this.config = {
      formatJson: true,
      includeTimestamp: true,
      includeStack: false,
      ...config
    }
  }

  setRequestId (requestId: string): void {
    this.requestId = requestId
  }

  clearRequestId (): void {
    this.requestId = null
  }

  debug (message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context)
  }

  info (message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context)
  }

  warn (message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context)
  }

  error (message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: this.config.includeStack ? error.stack : undefined
      }
    } : context

    this.log(LogLevel.ERROR, message, errorContext)
  }

  // High-level logging methods for specific scenarios
  toolCall (toolName: string, params: unknown, context?: LogContext): void {
    this.info(`Tool called: ${toolName}`, {
      ...context,
      toolName,
      params: this.sanitizeParams(params)
    })
  }

  toolResponse (toolName: string, duration: number, success: boolean, context?: LogContext): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR
    const message = `Tool ${success ? 'completed' : 'failed'}: ${toolName}`

    this.log(level, message, {
      ...context,
      toolName,
      duration,
      success
    })
  }

  apiCall (endpoint: string, params: unknown, context?: LogContext): void {
    this.info(`API call: ${endpoint}`, {
      ...context,
      apiEndpoint: endpoint,
      params: this.sanitizeParams(params)
    })
  }

  apiResponse (endpoint: string, duration: number, status: number, context?: LogContext): void {
    const level = status < 400 ? LogLevel.INFO : LogLevel.ERROR
    const message = `API response: ${endpoint} (${status})`

    this.log(level, message, {
      ...context,
      apiEndpoint: endpoint,
      duration,
      status
    })
  }

  cacheOperation (operation: string, key: string, hit?: boolean, context?: LogContext): void {
    this.debug(`Cache ${operation}: ${key}`, {
      ...context,
      cacheOperation: operation,
      cacheKey: key,
      cacheHit: hit
    })
  }

  rateLimitHit (endpoint: string, waitTime: number, context?: LogContext): void {
    this.warn(`Rate limit hit: ${endpoint}`, {
      ...context,
      apiEndpoint: endpoint,
      waitTime,
      rateLimited: true
    })
  }

  private log (level: LogLevel, message: string, context?: LogContext): void {
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      timestamp: this.config.includeTimestamp ? new Date().toISOString() : '',
      level,
      message,
      context: {
        ...context,
        ...(this.requestId && { requestId: this.requestId })
      }
    }

    const output = this.formatOutput(entry)
    this.writeOutput(level, output)
  }

  private formatOutput (entry: LogEntry): string {
    if (this.config.formatJson) {
      return JSON.stringify(entry)
    }

    const levelStr = LogLevel[entry.level].padEnd(5)
    const timestamp = entry.timestamp ? `[${entry.timestamp}] ` : ''
    const context = entry.context && Object.keys(entry.context).length > 0
      ? ` ${JSON.stringify(entry.context)}`
      : ''

    return `${timestamp}${levelStr} ${entry.message}${context}`
  }

  private writeOutput (level: LogLevel, output: string): void {
    // Write to appropriate stream
    if (level >= LogLevel.ERROR) {
      process.stderr.write(output + '\n')
    } else {
      process.stdout.write(output + '\n')
    }
  }

  private sanitizeParams (params: unknown): unknown {
    if (typeof params !== 'object' || params === null) {
      return params
    }

    const sanitized: Record<string, unknown> = { ...(params as Record<string, unknown>) }

    // Remove or mask sensitive data
    const sensitiveKeys = ['apikey', 'api_key', 'token', 'password', 'secret']

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]'
      }
    }

    return sanitized
  }
}

// Create default logger instance
export const logger = new StructuredLogger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  formatJson: process.env.LOG_FORMAT !== 'text',
  includeTimestamp: true,
  includeStack: process.env.NODE_ENV === 'development'
})

// Performance timing utility
export class PerformanceTimer {
  private startTime: number
  private logger: StructuredLogger

  constructor (logger: StructuredLogger) {
    this.logger = logger
    this.startTime = performance.now()
  }

  static start (loggerInstance: StructuredLogger = logger): PerformanceTimer {
    return new PerformanceTimer(loggerInstance)
  }

  end (message: string, context?: LogContext): number {
    const duration = Math.round(performance.now() - this.startTime)
    this.logger.info(message, { ...context, duration })
    return duration
  }

  endWithError (message: string, error: Error, context?: LogContext): number {
    const duration = Math.round(performance.now() - this.startTime)
    this.logger.error(message, error, { ...context, duration })
    return duration
  }
}

// Middleware for request correlation
export function generateRequestId (): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

function isPromiseLike (value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null &&
    'then' in (value as Record<string, unknown>) && typeof (value as Record<string, unknown>).then === 'function' &&
    'finally' in (value as Record<string, unknown>) && typeof (value as Record<string, unknown>).finally === 'function'
}

export function withRequestId<T extends (...args: unknown[]) => unknown> (
  fn: T,
  requestId?: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    const id = requestId || generateRequestId()
    logger.setRequestId(id)

    try {
      const res = fn(...args) as ReturnType<T>

      // Handle async functions
      if (isPromiseLike(res as unknown)) {
        return (res as unknown as Promise<unknown>).finally(() => { logger.clearRequestId() }) as ReturnType<T>
      }

      logger.clearRequestId()
      return res
    } catch (error) {
      logger.clearRequestId()
      throw error
    }
  }
}

// Log levels for filtering
export const LOG_LEVELS = {
  DEBUG: LogLevel.DEBUG,
  INFO: LogLevel.INFO,
  WARN: LogLevel.WARN,
  ERROR: LogLevel.ERROR
} as const
