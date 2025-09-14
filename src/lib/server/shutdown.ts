import { logger } from './logger'

export interface ShutdownHandler {
  name: string
  priority: number // Lower numbers run first
  handler: () => Promise<void> | void
  timeout?: number // Max time to wait for this handler
}

export interface ShutdownConfig {
  gracefulTimeout: number // Total time to wait for graceful shutdown
  forceExitTimeout: number // Additional time before force exit
  logShutdownSteps: boolean
}

const DEFAULT_SHUTDOWN_CONFIG: ShutdownConfig = {
  gracefulTimeout: 10000, // 10 seconds
  forceExitTimeout: 5000,  // 5 more seconds
  logShutdownSteps: true
}

export class GracefulShutdown {
  private handlers: ShutdownHandler[] = []
  private isShuttingDown = false
  private config: ShutdownConfig
  private shutdownPromise?: Promise<void>

  constructor (config: Partial<ShutdownConfig> = {}) {
    this.config = { ...DEFAULT_SHUTDOWN_CONFIG, ...config }
    this.setupSignalHandlers()
  }

  /**
   * Register a shutdown handler
   */
  registerHandler (handler: ShutdownHandler): void {
    // Insert in priority order (lower numbers first)
    const index = this.handlers.findIndex(h => h.priority > handler.priority)
    if (index === -1) {
      this.handlers.push(handler)
    } else {
      this.handlers.splice(index, 0, handler)
    }

    if (this.config.logShutdownSteps) {
      logger.debug(`Registered shutdown handler: ${handler.name} (priority: ${handler.priority})`)
    }
  }

  /**
   * Unregister a shutdown handler
   */
  unregisterHandler (name: string): boolean {
    const index = this.handlers.findIndex(h => h.name === name)
    if (index !== -1) {
      this.handlers.splice(index, 1)
      if (this.config.logShutdownSteps) {
        logger.debug(`Unregistered shutdown handler: ${name}`)
      }
      return true
    }
    return false
  }

  /**
   * Initiate graceful shutdown
   */
  async shutdown (exitCode = 0): Promise<void> {
    if (this.isShuttingDown) {
      if (this.config.logShutdownSteps) {
        logger.warn('Shutdown already in progress')
      }
      return this.shutdownPromise
    }

    this.isShuttingDown = true

    if (this.config.logShutdownSteps) {
      logger.info(`Starting graceful shutdown with ${this.handlers.length} handlers`)
    }

    this.shutdownPromise = this.executeShutdown(exitCode)
    return this.shutdownPromise
  }

  /**
   * Force immediate shutdown
   */
  forceShutdown (exitCode = 1): void {
    if (this.config.logShutdownSteps) {
      logger.warn('Force shutdown initiated')
    }

    // Try to run critical handlers quickly
    const criticalHandlers = this.handlers.filter(h => h.priority <= 1)
    const promises = criticalHandlers.map(handler =>
      this.executeHandler(handler).catch(() => {}) // Ignore errors in force shutdown
    )

    Promise.allSettled(promises).finally(() => {
      if (this.config.logShutdownSteps) {
        logger.info('Force shutdown complete')
      }
      process.exit(exitCode)
    })

    // Fallback timeout
    setTimeout(() => {
      process.exit(exitCode)
    }, 1000)
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDownFlag (): boolean {
    return this.isShuttingDown
  }

  private setupSignalHandlers (): void {
    // Graceful shutdown signals
    process.on('SIGTERM', () => {
      if (this.config.logShutdownSteps) {
        logger.info('Received SIGTERM, starting graceful shutdown')
      }
      this.shutdown(0).catch(() => { this.forceShutdown(1) })
    })

    process.on('SIGINT', () => {
      if (this.config.logShutdownSteps) {
        logger.info('Received SIGINT, starting graceful shutdown')
      }
      this.shutdown(0).catch(() => { this.forceShutdown(1) })
    })

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception, forcing shutdown', error)
      this.forceShutdown(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection, forcing shutdown', new Error(String(reason)), {
        promise: promise.toString()
      })
      this.forceShutdown(1)
    })

    // Prevent multiple SIGINT from hanging
    let sigintCount = 0
    const originalSigint = process.listeners('SIGINT')
    process.removeAllListeners('SIGINT')
    process.on('SIGINT', () => {
      sigintCount++
      if (sigintCount === 1) {
        originalSigint.forEach(listener => {
          if (typeof listener === 'function') {
            listener('SIGINT')
          }
        })
      } else if (sigintCount >= 3) {
        logger.warn('Multiple SIGINT received, forcing immediate exit')
        process.exit(1)
      } else {
        logger.warn(`SIGINT received ${sigintCount} times, press Ctrl+C once more to force exit`)
      }
    })
  }

  private async executeShutdown (exitCode: number): Promise<void> {
    const startTime = Date.now()

    try {
      // Set overall timeout
      const timeoutPromise = new Promise<void>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Graceful shutdown timeout'))
        }, this.config.gracefulTimeout)
      })

      // Execute all handlers
      const shutdownPromise = this.executeAllHandlers()

      // Race between handlers completion and timeout
      await Promise.race([shutdownPromise, timeoutPromise])

      const duration = Date.now() - startTime
      if (this.config.logShutdownSteps) {
        logger.info(`Graceful shutdown completed in ${duration}ms`)
      }

    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(`Graceful shutdown failed after ${duration}ms`, error as Error)
    }

    // Final cleanup and exit
    setTimeout(() => {
      if (this.config.logShutdownSteps) {
        logger.info(`Process exiting with code ${exitCode}`)
      }
      process.exit(exitCode)
    }, 100)
  }

  private async executeAllHandlers (): Promise<void> {
    const results: { name: string; success: boolean; duration: number; error?: Error }[] = []

    for (const handler of this.handlers) {
      const result = await this.executeHandler(handler)
      results.push(result)

      if (!result.success && this.config.logShutdownSteps) {
        logger.warn(`Shutdown handler failed: ${handler.name}`, result.error)
      }
    }

    if (this.config.logShutdownSteps) {
      const successful = results.filter(r => r.success).length
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)

      logger.info(`Shutdown handlers completed: ${successful}/${results.length} successful, ${totalDuration}ms total`)
    }
  }

  private async executeHandler (handler: ShutdownHandler): Promise<{
    name: string
    success: boolean
    duration: number
    error?: Error
  }> {
    const startTime = Date.now()

    try {
      if (this.config.logShutdownSteps) {
        logger.debug(`Executing shutdown handler: ${handler.name}`)
      }

      const handlerTimeout = handler.timeout || 5000
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Handler timeout: ${handler.name}`))
        }, handlerTimeout)
      })

      await Promise.race([
        Promise.resolve(handler.handler()),
        timeoutPromise
      ])

      const duration = Date.now() - startTime
      return {
        name: handler.name,
        success: true,
        duration
      }

    } catch (error) {
      const duration = Date.now() - startTime
      return {
        name: handler.name,
        success: false,
        duration,
        error: error as Error
      }
    }
  }
}

// Create default instance
export const gracefulShutdown = new GracefulShutdown()

// Convenience functions for common shutdown handlers
export function registerCacheCleanup (cache: { destroy(): void }, priority = 5): void {
  gracefulShutdown.registerHandler({
    name: 'cache-cleanup',
    priority,
    handler: () => {
      logger.info('Cleaning up cache')
      cache.destroy()
    },
    timeout: 2000
  })
}

export function registerDatabaseCleanup (db: { close(): Promise<void> }, priority = 3): void {
  gracefulShutdown.registerHandler({
    name: 'database-cleanup',
    priority,
    handler: async () => {
      logger.info('Closing database connections')
      await db.close()
    },
    timeout: 5000
  })
}

export function registerServerCleanup (server: { close(): Promise<void> | void }, priority = 1): void {
  gracefulShutdown.registerHandler({
    name: 'server-cleanup',
    priority,
    handler: async () => {
      logger.info('Stopping server')
      await Promise.resolve(server.close())
    },
    timeout: 5000
  })
}

export function registerCustomCleanup (
  name: string,
  handler: () => Promise<void> | void,
  priority = 10,
  timeout = 5000
): void {
  gracefulShutdown.registerHandler({
    name,
    priority,
    handler,
    timeout
  })
}
