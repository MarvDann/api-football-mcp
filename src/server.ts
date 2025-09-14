#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { APIFootballClient } from './lib/api-client/client'
import { LRUCache } from './lib/cache/lru-cache'
import { ToolRegistry } from './lib/tools/registry'
import { registerToolHandlers, logToolRegistration, createHealthCheck } from './lib/server/register-tools'
import { handleError, MCPErrors } from './lib/server/errors'
import { PACKAGE_INFO } from './constants'

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
      console.error('Uncaught exception:', error)
      this.shutdown(1)
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason)
      this.shutdown(1)
    })

    // Handle shutdown signals
    process.on('SIGINT', () => {
      console.log('\nReceived SIGINT, shutting down gracefully...')
      this.shutdown(0)
    })

    process.on('SIGTERM', () => {
      console.log('Received SIGTERM, shutting down gracefully...')
      this.shutdown(0)
    })
  }

  async start (): Promise<void> {
    try {
      // Log startup information
      console.log('🚀 Starting API-Football MCP Server...')
      console.log(`   Name: ${this.name} v${this.version}`)
      console.log(`   Cache size: ${this.cache.size()}/${this.cache.getStats().maxSize} entries`)

      // Log tool registration
      logToolRegistration(this.toolRegistry)

      // Create transport and connect
      const transport = new StdioServerTransport()
      await this.server.connect(transport)

      console.log('✅ API-Football MCP Server started successfully')
      console.log('   Listening on stdio transport')
      console.log('   Server ready to handle tool calls')

      // Log health check
      const health = createHealthCheck(this.toolRegistry)
      console.log('📊 Health check:', JSON.stringify(health, null, 2))

    } catch (error) {
      console.error('❌ Failed to start server:', error)
      throw handleError(error)
    }
  }

  private shutdown (exitCode: number): void {
    console.log('🛑 Shutting down API-Football MCP Server...')

    try {
      // Log final cache statistics
      const cacheStats = this.cache.getStats()
      console.log('📈 Final cache statistics:', JSON.stringify(cacheStats, null, 2))

      // Log final rate limit info
      const rateLimitInfo = this.apiClient.getRateLimitInfo()
      console.log('⚡ Rate limit status:', JSON.stringify(rateLimitInfo, null, 2))

      // Cleanup cache
      this.cache.destroy()

      console.log('✅ Shutdown complete')
    } catch (error) {
      console.error('❌ Error during shutdown:', error)
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
    console.error('❌ Server startup failed:', error)
    process.exit(1)
  }
}

// Run if this script is executed directly
if ((process.argv[1]?.endsWith('server.ts')) || (process.argv[1]?.includes('dist') && process.argv[1]?.endsWith('server.js'))) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
}

export { APIFootballMCPServer }
