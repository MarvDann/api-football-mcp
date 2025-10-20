#!/usr/bin/env node

import { APIFootballMCPServer } from '../server'
import { createConsoleLogger } from '../lib/logger/logger'
import { safeAsync, withErrorContext, ValidationError, ConfigError } from '../lib/errors/errors'
import { safeString, formatNumber, formatPercentage } from '../lib/utils/string-utils'
import { getNextArg, parseIntArg, validateChoice } from '../lib/utils/cli-args'
import type { ServerOptions } from '../types/cli'
import type { ServerConfig } from '../types/api-responses'

interface PackageInfo {
  name: string
  version: string
}

const logger = createConsoleLogger()

function parseArgs (args: string[]): ServerOptions {
  const options: ServerOptions = {
    command: 'start',
    format: 'json',
    verbose: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--port': {
        const portStr = getNextArg(args, i, '--port')
        options.port = parseIntArg(portStr, '--port', 1, 65535)
        i++ // Skip the next arg since we consumed it
        break
      }
      case '--host':
        options.host = getNextArg(args, i, '--host')
        i++ // Skip the next arg since we consumed it
        break
      case '--log-level': {
        const level = getNextArg(args, i, '--log-level')
        options.logLevel = validateChoice(level, ['debug', 'info', 'warn', 'error'], '--log-level')
        i++ // Skip the next arg since we consumed it
        break
      }
      case '--config':
        options.config = getNextArg(args, i, '--config')
        i++ // Skip the next arg since we consumed it
        break
      case '--format': {
        const format = getNextArg(args, i, '--format')
        options.format = validateChoice(format, ['json', 'table'], '--format')
        i++ // Skip the next arg since we consumed it
        break
      }
      case '--verbose':
        options.verbose = true
        break
      case '--help':
        showHelp()
        process.exit(0)
        break
      default:
        if (arg && !arg.startsWith('--') && !options.command) {
          options.command = arg
        }
    }
  }

  return options
}

function showHelp (): void {
  logger.info(`
API-Football MCP Server CLI

Usage:
  server [command] [options]

Commands:
  start         Start the MCP server (default)
  health        Check server health and dependencies
  validate      Validate configuration and API key
  tools         List available MCP tools
  cache         Show cache status and statistics
  version       Show version information

Options:
  --port <port>        Port number (default: 3000, stdio mode ignores this)
  --host <host>        Host address (default: localhost)
  --log-level <level>  Log level: debug|info|warn|error (default: info)
  --config <file>      Configuration file path
  --format <format>    Output format: json|table (default: json)
  --verbose           Enable verbose output
  --help              Show this help

Environment Variables:
  API_FOOTBALL_KEY    API key for API-Football service (required)
  CACHE_MAX_SIZE      Maximum cache size (default: 1000)
  CACHE_TTL           Cache TTL in milliseconds (default: 300000)
  LOG_LEVEL           Log level (default: info)
  NODE_ENV            Environment: development|production

Examples:
  server start                          # Start server with stdio transport
  server health --verbose               # Check health with detailed output
  server validate                       # Validate config without starting
  server tools                          # List available MCP tools
  server cache --verbose                # Show detailed cache statistics
`)
}

const loadConfig = safeAsync(async (options: ServerOptions): Promise<ServerConfig> => {
  let config: Partial<ServerConfig> = {}

  // Load from config file if specified
  if (options.config) {
    try {
      const configModule = await import(options.config)
      config = (configModule.default as ServerConfig) ?? configModule
      logger.info(`Loaded configuration from ${options.config}`)
    } catch {
      throw new ConfigError(`Failed to load config file: ${options.config}`, 'configFile')
    }
  }

  // Load package.json for name and version
  let packageInfo: PackageInfo
  try {
    const packageModule = await import('../../package.json')
    packageInfo = packageModule.default as PackageInfo
  } catch {
    packageInfo = { name: 'api-football-mcp', version: '1.0.0' }
  }

  // Parse environment variables with proper validation
  const cacheMaxSize = process.env.CACHE_MAX_SIZE
    ? parseInt(process.env.CACHE_MAX_SIZE, 10)
    : 1000

  const cacheTtl = process.env.CACHE_TTL
    ? parseInt(process.env.CACHE_TTL, 10)
    : 300000

  if (isNaN(cacheMaxSize) || cacheMaxSize < 1) {
    throw new ConfigError('CACHE_MAX_SIZE must be a positive integer', 'CACHE_MAX_SIZE')
  }

  if (isNaN(cacheTtl) || cacheTtl < 1000) {
    throw new ConfigError('CACHE_TTL must be at least 1000 milliseconds', 'CACHE_TTL')
  }

  // Merge with environment and CLI options
  return {
    name: config.name ?? packageInfo.name,
    version: config.version ?? packageInfo.version,
    apiKey: config.apiKey ?? process.env.API_FOOTBALL_KEY ?? '',
    baseUrl: config.baseUrl ?? 'https://v3.football.api-sports.io',
    timeout: config.timeout ?? 30000,
    retryAttempts: config.retryAttempts ?? 3,
    retryDelay: config.retryDelay ?? 1000,
    cacheDefaultTtl: config.cacheDefaultTtl ?? cacheTtl,
    cacheMaxSize: config.cacheMaxSize ?? cacheMaxSize,
    cacheCheckInterval: config.cacheCheckInterval ?? 60000,
    logLevel: options.logLevel ?? config.logLevel ?? process.env.LOG_LEVEL ?? 'info',
    logPretty: config.logPretty ?? process.env.NODE_ENV !== 'production'
  }
})

const validateConfig = safeAsync(async (config: ServerConfig): Promise<boolean> => {
  logger.info('Validating server configuration...')

  // Check required fields
  if (!config.apiKey) {
    logger.error('API key is required. Set API_FOOTBALL_KEY environment variable.')
    return false
  }

  if (!config.name || !config.version) {
    logger.error('Server name and version are required')
    return false
  }

  // Validate numeric values
  if (config.cacheMaxSize < 1 || config.cacheMaxSize > 10000) {
    logger.error(`Cache max size must be between 1 and 10000, got: ${safeString(config.cacheMaxSize)}`)
    return false
  }

  if (config.cacheDefaultTtl < 1000 || config.cacheDefaultTtl > 24 * 60 * 60 * 1000) {
    logger.error(`Cache TTL must be between 1 second and 24 hours, got: ${safeString(config.cacheDefaultTtl)}ms`)
    return false
  }

  if (config.timeout < 1000 || config.timeout > 120000) {
    logger.error(`API timeout must be between 1 and 120 seconds, got: ${safeString(config.timeout)}ms`)
    return false
  }

  logger.info('Configuration validation completed successfully')
  return true
})

const executeCommand = safeAsync(async (command: string, options: ServerOptions, config: ServerConfig): Promise<void> => {
  switch (command) {
    case 'start':
      await startServer(config, options)
      break

    case 'health':
      await checkHealth(config, options)
      break

    case 'validate':
      await validateOnly(config, options)
      break

    case 'tools':
      await listTools(config, options)
      break

    case 'cache':
      await showCacheStatus(config, options)
      break

    case 'version':
      showVersion(config)
      break

    default:
      throw new ValidationError(`Unknown command: ${command}`, 'command')
  }
})

const startServer = safeAsync(async (config: ServerConfig, options: ServerOptions): Promise<void> => {
  logger.info(`Starting API-Football MCP Server v${config.version}`)

  if (options.verbose) {
    logger.info('Server configuration:', {
      name: config.name,
      version: config.version,
      cacheMaxSize: config.cacheMaxSize,
      cacheTtl: config.cacheDefaultTtl,
      logLevel: config.logLevel
    })
  }

  const server = new APIFootballMCPServer(config)
  await server.start()

  logger.info('Server startup completed')

  // Keep process alive and handle shutdown gracefully
  const shutdown = async (): Promise<void> => {
    logger.info('Received shutdown signal, gracefully shutting down...')
    try {
      // Note: server.stop() may not exist yet, so we'll just exit gracefully
      process.exit(0)
    } catch (error) {
      logger.error('Error during shutdown:', error)
      process.exit(1)
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
})

const checkHealth = safeAsync(async (config: ServerConfig, options: ServerOptions): Promise<void> => {
  logger.info('Checking server health...')

  // Create temporary server instance for health check
  const server = new APIFootballMCPServer(config)
  const health = server.getHealthStatus()

  if (options.format === 'json' || options.verbose) {
    logger.info(JSON.stringify(health, null, 2))
  } else {
    logger.info(`Health: ${health.status}`)
    logger.info(`Tools Registered: ${safeString(health.toolsRegistered)}`)
    logger.info(`Tool Names: ${health.toolNames.join(', ')}`)
    logger.info(`Timestamp: ${health.timestamp}`)
  }

  logger.info('Health check completed')
})

const validateOnly = safeAsync(async (config: ServerConfig, options: ServerOptions): Promise<void> => {
  const valid = await validateConfig(config)

  if (valid) {
    logger.info('✅ Configuration is valid')
    if (options.verbose) {
      logger.info(JSON.stringify(config, null, 2))
    }
  } else {
    logger.error('❌ Configuration is invalid')
    process.exit(1)
  }
})

const listTools = safeAsync(async (_config: ServerConfig, options: ServerOptions): Promise<void> => {
  logger.info('Listing available MCP tools...')

  // This would ideally come from the tool registry
  const tools = [
    { name: 'get_standings', description: 'Get Premier League standings' },
    { name: 'get_fixtures', description: 'Get match fixtures' },
    { name: 'get_team', description: 'Get team information' },
    { name: 'get_player', description: 'Get player information' },
    { name: 'get_match_events', description: 'Get match events' },
    { name: 'search_teams', description: 'Search for teams' },
    { name: 'search_players', description: 'Search for players' },
    { name: 'get_live_matches', description: 'Get live match information' }
  ]

  if (options.format === 'json' || options.verbose) {
    logger.info(JSON.stringify(tools, null, 2))
  } else {
    logger.info('\nAvailable MCP Tools:')
    tools.forEach(tool => {
      logger.info(`  ${tool.name.padEnd(20)} - ${tool.description}`)
    })
    logger.info(`\nTotal: ${formatNumber(tools.length)} tools`)
  }
})

const showCacheStatus = safeAsync(async (config: ServerConfig, options: ServerOptions): Promise<void> => {
  logger.info('Showing cache status...')

  // Create temporary server instance for cache stats
  const server = new APIFootballMCPServer(config)
  const cacheStats = server.getCacheStats()

  if (options.format === 'json' || options.verbose) {
    logger.info(JSON.stringify(cacheStats, null, 2))
  } else {
    logger.info('\nCache Status:')
    logger.info(`  Size: ${formatNumber(cacheStats.size)}/${formatNumber(cacheStats.maxSize)} entries`)
    logger.info(`  Hit Rate: ${formatPercentage(cacheStats.metrics.hits, cacheStats.metrics.hits + cacheStats.metrics.misses)}`)
    logger.info(`  Total Hits: ${formatNumber(cacheStats.metrics.hits)}`)
    logger.info(`  Total Misses: ${formatNumber(cacheStats.metrics.misses)}`)
    logger.info(`  Sets: ${formatNumber(cacheStats.metrics.sets)}`)
    logger.info(`  Deletes: ${formatNumber(cacheStats.metrics.deletes)}`)
  }
})

function showVersion (config: ServerConfig): void {
  logger.info(`${config.name} v${config.version}`)
  logger.info(`Node.js: ${process.version}`)
  logger.info(`Platform: ${process.platform} ${process.arch}`)
}

const main = safeAsync(async (): Promise<void> => {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  // Set log level early
  if (options.logLevel) {
    process.env.LOG_LEVEL = options.logLevel
  }

  if (options.verbose) {
    process.env.LOG_LEVEL = 'debug'
  }

  const config = await withErrorContext(
    loadConfig(options),
    'configuration loading'
  )

  // Always validate config
  const valid = await withErrorContext(
    validateConfig(config),
    'configuration validation'
  )

  if (!valid) {
    process.exit(1)
  }

  await withErrorContext(
    executeCommand(options.command, options, config),
    'command execution'
  )
})

if (require.main === module) {
  main().catch((error: unknown) => {
    logger.error('Fatal CLI error:', error)
    process.exit(1)
  })
}

export { main }
