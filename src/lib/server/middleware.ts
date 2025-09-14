import { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { logger, PerformanceTimer, generateRequestId, LogContext } from './logger'
import { MCPErrors } from './errors'

export interface RequestContext {
  requestId: string
  startTime: number
  method: string
  params?: any
  userId?: string
}

export interface MiddlewareConfig {
  enableRequestLogging?: boolean
  enableResponseLogging?: boolean
  enableErrorLogging?: boolean
  enablePerformanceLogging?: boolean
  logSensitiveData?: boolean
  maxRequestBodySize?: number
  maxResponseBodySize?: number
}

const DEFAULT_MIDDLEWARE_CONFIG: MiddlewareConfig = {
  enableRequestLogging: true,
  enableResponseLogging: true,
  enableErrorLogging: true,
  enablePerformanceLogging: true,
  logSensitiveData: false,
  maxRequestBodySize: 10000,
  maxResponseBodySize: 50000
}

// Helper function to create LogContext with optional requestId
function createLogContext (base: Omit<LogContext, 'requestId'>, requestId?: string): LogContext {
  const context: LogContext = { ...base }
  if (requestId !== undefined) {
    context.requestId = requestId
  }
  return context
}

export class RequestResponseMiddleware {
  private config: MiddlewareConfig

  constructor (config: MiddlewareConfig = {}) {
    this.config = { ...DEFAULT_MIDDLEWARE_CONFIG, ...config }
  }

  /**
   * Create request context and log incoming request
   */
  createRequestContext (request: CallToolRequest): RequestContext {
    const requestId = generateRequestId()
    const context: RequestContext = {
      requestId,
      startTime: Date.now(),
      method: request.method,
      params: request.params
    }

    // Set request ID for logging correlation
    logger.setRequestId(requestId)

    if (this.config.enableRequestLogging) {
      logger.info(`Tool request: ${request.method}`, {
        requestId,
        method: request.method,
        params: this.sanitizeParams(request.params)
      })
    }

    return context
  }

  /**
   * Log successful tool response
   */
  logResponse (context: RequestContext, result: CallToolResult): void {
    const duration = Date.now() - context.startTime

    if (this.config.enableResponseLogging) {
      const sanitizedResult = this.sanitizeResponse(result)

      logger.info(`Tool response: ${context.method}`, {
        requestId: context.requestId,
        method: context.method,
        duration,
        success: true,
        contentSize: this.getContentSize(result)
      })

      if (this.config.enablePerformanceLogging) {
        logger.debug('Response details', {
          requestId: context.requestId,
          result: sanitizedResult
        })
      }
    }

    // Clear request ID from logger context
    logger.clearRequestId()
  }

  /**
   * Log error response
   */
  logError (context: RequestContext, error: Error): void {
    const duration = Date.now() - context.startTime

    if (this.config.enableErrorLogging) {
      logger.error(`Tool error: ${context.method}`, error, {
        requestId: context.requestId,
        method: context.method,
        duration,
        success: false,
        params: this.sanitizeParams(context.params)
      })
    }

    // Clear request ID from logger context
    logger.clearRequestId()
  }

  /**
   * Create a middleware wrapper for tool execution
   */
  wrapToolExecution<T extends (...args: any[]) => Promise<CallToolResult>>(
    toolName: string,
    handler: T
  ): T {
    const middleware = this

    return (async (request: CallToolRequest, ...args: any[]) => {
      const context = middleware.createRequestContext({
        ...request,
        method: 'tools/call'
      })

      const timer = PerformanceTimer.start()

      try {
        const result = await handler(request, ...args)

        if (middleware.config.enablePerformanceLogging) {
          timer.end(`Tool execution completed: ${toolName}`, {
            requestId: context.requestId
          })
        }

        middleware.logResponse(context, result)
        return result

      } catch (error) {
        if (middleware.config.enablePerformanceLogging) {
          timer.endWithError(`Tool execution failed: ${toolName}`, error as Error, {
            requestId: context.requestId
          })
        }

        middleware.logError(context, error as Error)
        throw error
      }
    }) as T
  }

  /**
   * Log rate limiting events
   */
  logRateLimit (endpoint: string, waitTime: number, requestId?: string): void {
    logger.warn('Rate limit hit', createLogContext({
      endpoint,
      waitTime,
      rateLimited: true
    }, requestId))
  }

  /**
   * Log cache operations
   */
  logCacheHit (key: string, requestId?: string): void {
    if (this.config.enablePerformanceLogging) {
      logger.debug('Cache hit', createLogContext({
        cacheKey: key,
        cacheHit: true
      }, requestId))
    }
  }

  logCacheMiss (key: string, requestId?: string): void {
    if (this.config.enablePerformanceLogging) {
      logger.debug('Cache miss', createLogContext({
        cacheKey: key,
        cacheHit: false
      }, requestId))
    }
  }

  logCacheSet (key: string, ttl: number, requestId?: string): void {
    if (this.config.enablePerformanceLogging) {
      logger.debug('Cache set', createLogContext({
        cacheKey: key,
        ttlSeconds: Math.round(ttl / 1000)
      }, requestId))
    }
  }

  /**
   * Create health check logger
   */
  logHealthCheck (status: any): void {
    logger.info('Health check performed', {
      status: status.status,
      tools: status.tools,
      api: status.api,
      cache: status.cache
    })
  }

  /**
   * Log server startup events
   */
  logServerStart (config: any): void {
    logger.info('MCP Server starting', {
      name: config.name,
      version: config.version,
      cacheMaxSize: config.cacheMaxSize,
      cacheTtlSeconds: Math.round(config.cacheTtl / 1000)
    })
  }

  logServerReady (toolCount: number): void {
    logger.info('MCP Server ready', {
      toolsRegistered: toolCount,
      transport: 'stdio'
    })
  }

  logServerShutdown (): void {
    logger.info('MCP Server shutdown initiated')
  }

  /**
   * Sanitize request parameters to remove sensitive data
   */
  private sanitizeParams (params: any): any {
    if (!params || typeof params !== 'object') {
      return params
    }

    if (!this.config.logSensitiveData) {
      const sanitized = { ...params }

      // Remove or mask sensitive fields
      const sensitiveKeys = ['apikey', 'api_key', 'token', 'password', 'secret', 'key']

      for (const key of Object.keys(sanitized)) {
        if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
          sanitized[key] = '[REDACTED]'
        }
      }

      return sanitized
    }

    return params
  }

  /**
   * Sanitize response data
   */
  private sanitizeResponse (result: CallToolResult): any {
    if (!this.config.maxResponseBodySize) {
      return result
    }

    const resultStr = JSON.stringify(result)
    if (resultStr.length > this.config.maxResponseBodySize) {
      return {
        ...result,
        content: '[RESPONSE_TOO_LARGE_FOR_LOGGING]',
        originalSize: resultStr.length
      }
    }

    return result
  }

  /**
   * Get content size for logging
   */
  private getContentSize (result: CallToolResult): number {
    try {
      return JSON.stringify(result).length
    } catch {
      return 0
    }
  }
}

// Default middleware instance
export const requestResponseMiddleware = new RequestResponseMiddleware()

// Convenience functions
export function createRequestId (): string {
  return generateRequestId()
}

export function logRequest (method: string, params: any, requestId?: string): void {
  logger.toolCall(method, params, createLogContext({}, requestId))
}

export function logResponse (method: string, duration: number, success: boolean, requestId?: string): void {
  logger.toolResponse(method, duration, success, createLogContext({}, requestId))
}

export function logApiCall (endpoint: string, params: any, requestId?: string): void {
  logger.apiCall(endpoint, params, createLogContext({}, requestId))
}

export function logApiResponse (endpoint: string, duration: number, status: number, requestId?: string): void {
  logger.apiResponse(endpoint, duration, status, createLogContext({}, requestId))
}
