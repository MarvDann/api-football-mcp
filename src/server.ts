#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { APIFootballClient } from './lib/api-client/client'
import { LRUCache } from './lib/cache/lru-cache'
import { ToolRegistry } from './lib/tools/registry'
import { registerToolHandlers, logToolRegistration, createHealthCheck } from './lib/server/register-tools'
import { handleError, MCPErrors } from './lib/server/errors'
import { PACKAGE_INFO } from './constants'
import { logger as appLogger } from './lib/logger/logger'

interface ServerConfig {
  name: string
  version: string
  apiKey: string
  cacheMaxSize?: number
  cacheTtl?: number
}

class APIFootballMCPServer {
  private server: Server
  private apiClient: APIFootballClient
  private cache: LRUCache
  private toolRegistry: ToolRegistry
  private name: string
  private version: string

  constructor (config: ServerConfig) {
    this.name = config.name
    this.version = config.version
    // Initialize server
    this.server = new Server(
      {
        name: config.name,
        version: config.version
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )

    // Initialize API client
    this.apiClient = new APIFootballClient({
      apiKey: config.apiKey,
      timeout: 15000 // 15 second timeout
    })

    // Initialize cache
    this.cache = new LRUCache({
      maxSize: config.cacheMaxSize || 1000,
      defaultTtl: config.cacheTtl || 5 * 60 * 1000, // 5 minutes default
      checkInterval: 60 * 1000 // Cleanup every minute
    })

    // Initialize tool registry
    this.toolRegistry = new ToolRegistry({
      apiClient: this.apiClient,
      cache: this.cache
    })

    // Register tool handlers
    registerToolHandlers(this.server, this.toolRegistry)

    // Setup error handling
    this.setupErrorHandling()
  }

  private setupErrorHandling (): void {
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      appLogger.error({ error }, 'Uncaught exception')
      this.shutdown(1)
    })

    process.on('unhandledRejection', (reason, _promise) => {
      appLogger.error({ reason: String(reason) }, 'Unhandled rejection')
      this.shutdown(1)
    })

    // Handle shutdown signals
    process.on('SIGINT', () => {
      appLogger.info('Received SIGINT, shutting down gracefully...')
      this.shutdown(0)
    })

    process.on('SIGTERM', () => {
      appLogger.info('Received SIGTERM, shutting down gracefully...')
      this.shutdown(0)
    })
  }

  async start (): Promise<void> {
    try {
      // Log startup information
      appLogger.info(`Starting API-Football MCP Server: ${this.name} v${this.version}`)
      appLogger.info(`Cache entries: ${this.cache.size()}/${this.cache.getStats().maxSize}`)

      // Log tool registration
      logToolRegistration(this.toolRegistry)

      // Create transport and connect
      const transport = new StdioServerTransport()
      await this.server.connect(transport)

      appLogger.info('API-Football MCP Server started successfully (stdio transport)')

      // Log health check
      const health = createHealthCheck(this.toolRegistry)
      appLogger.info('Health check', { health })

    } catch (error) {
      appLogger.error({ error }, 'Failed to start server')
      throw handleError(error)
    }
  }

  private shutdown (exitCode: number): void {
    appLogger.info('Shutting down API-Football MCP Server...')

    try {
      // Log final cache statistics
      const cacheStats = this.cache.getStats()
      appLogger.info('Final cache statistics', { cacheStats })

      // Log final rate limit info
      const rateLimitInfo = this.apiClient.getRateLimitInfo()
      appLogger.info('Rate limit status', { rateLimitInfo })

      // Cleanup cache
      this.cache.destroy()

      appLogger.info('Shutdown complete')
    } catch (error) {
      appLogger.error({ error }, 'Error during shutdown')
    }

    process.exit(exitCode)
  }

  // Utility methods for monitoring
  getHealthStatus () {
    return createHealthCheck(this.toolRegistry)
  }

  getCacheStats () {
    return this.cache.getStats()
  }

  getRateLimitInfo () {
    return this.apiClient.getRateLimitInfo()
  }
}

// Main entry point
async function main (): Promise<void> {
  try {
    // Validate environment
    const apiKey = process.env.API_FOOTBALL_KEY
    if (!apiKey) {
      throw MCPErrors.apiKeyMissing()
    }

    // Create and start server
    const server = new APIFootballMCPServer({
      name: PACKAGE_INFO.name,
      version: PACKAGE_INFO.version,
      apiKey,
      cacheMaxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
      cacheTtl: parseInt(process.env.CACHE_TTL || '300000', 10) // 5 minutes
    })

    await server.start()

  } catch (error) {
    appLogger.error({ error }, 'Server startup failed')
    process.exit(1)
  }
}

// Run if this script is executed directly
if ((process.argv[1]?.endsWith('server.ts')) || (process.argv[1]?.includes('dist') && process.argv[1]?.endsWith('server.js'))) {
  main().catch((error) => {
    appLogger.error({ error }, 'Fatal error')
    process.exit(1)
  })
}

export { APIFootballMCPServer }
