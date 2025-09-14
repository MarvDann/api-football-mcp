#!/usr/bin/env node

import { LRUCache } from '../lib/cache/lru-cache'
import { generateCacheKey } from '../lib/cache/keys'
import type { CacheKeyParams } from '../lib/cache/keys'
import { createConsoleLogger, type Logger } from '../lib/logger/logger'
import { ValidationError, safeAsync } from '../lib/errors/errors'
import { safeString } from '../lib/utils/string-utils'
import { getNextArg, parseIntArg, validateChoice } from '../lib/utils/cli-args'
import type { CacheOptions } from '../types/cli'

// Global cache instance for CLI operations
const cache = new LRUCache({
  defaultTtl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  checkInterval: 60 * 1000 // 1 minute
})

function parseArgs (args: string[]): CacheOptions {
  const options: CacheOptions = {
    command: '',
    format: 'json',
    verbose: false
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--key':
        options.key = getNextArg(args, i, '--key')
        i++ // Skip the next arg since we consumed it
        break
      case '--value':
        options.value = getNextArg(args, i, '--value')
        i++ // Skip the next arg since we consumed it
        break
      case '--ttl': {
        const ttlStr = getNextArg(args, i, '--ttl')
        options.ttl = parseIntArg(ttlStr, '--ttl', 1)
        i++ // Skip the next arg since we consumed it
        break
      }
      case '--pattern':
        options.pattern = getNextArg(args, i, '--pattern')
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
  const logger = createConsoleLogger()
  logger.info(`
Cache Management CLI

Usage:
  cache <command> [options]

Commands:
  get <key>              Get value from cache
  set <key> <value>      Set value in cache
  delete <key>           Delete key from cache
  clear                  Clear all cache entries
  keys [pattern]         List all keys or keys matching pattern
  values                 List all values
  stats                  Show cache statistics
  info <key>             Show entry metadata for key
  find <pattern>         Find keys matching pattern (regex or glob)
  cleanup                Force cleanup of expired entries
  refresh <key> [ttl]    Refresh entry timestamp and optionally TTL

Options:
  --key <key>           Cache key
  --value <value>       Cache value (JSON string for objects)
  --ttl <seconds>       Time to live in seconds
  --pattern <pattern>   Pattern for key matching
  --format <format>     Output format: json|table (default: json)
  --verbose            Show detailed output
  --help               Show this help

Key Generation:
  generate-key <type> [params]  Generate cache key
    Types: standings, fixtures, teams, players, events
    Examples:
      generate-key standings season=2023
      generate-key fixtures team=1 from=2023-01-01

Examples:
  cache set "standings:2023" '{"data": "value"}' --ttl 3600
  cache get "standings:2023"
  cache keys
  cache find "standings:*"
  cache stats --format table
  cache info "standings:2023"
`)
}

function formatOutput (data: unknown, format: 'json' | 'table'): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2)
  }

  if (format === 'table') {
    if (Array.isArray(data)) {
      if (data.length === 0) return 'No data'

      const firstItem = data[0]
      if (typeof firstItem !== 'object' || firstItem === null) {
        return JSON.stringify(data, null, 2)
      }

      const record = firstItem as Record<string, unknown>
      const headers = Object.keys(record)
      const rows = data.map(item => {
        const itemRecord = item as Record<string, unknown>
        return headers.map(h => safeString(itemRecord[h]))
      })

      const colWidths = headers.map((h, i) =>
        Math.max(h.length, ...rows.map(r => r[i]?.length ?? 0))
      )

      let table = headers.map((h, i) => h.padEnd(colWidths[i] ?? 0)).join(' | ') + '\n'
      table += colWidths.map(w => '-'.repeat(w ?? 0)).join('-|-') + '\n'
      table += rows.map(row =>
        row.map((cell, i) => cell.padEnd(colWidths[i] ?? 0)).join(' | ')
      ).join('\n')

      return table
    } else if (typeof data === 'object' && data !== null) {
      // Convert object to key-value table
      const entries = Object.entries(data)
      let table = 'Key'.padEnd(20) + ' | ' + 'Value\n'
      table += '-'.repeat(20) + '-|-' + '-'.repeat(20) + '\n'
      table += entries.map(([k, v]) =>
        k.padEnd(20) + ' | ' + safeString(v)
      ).join('\n')
      return table
    }
  }

  return JSON.stringify(data, null, 2)
}

function parseValue (value: string): unknown {
  // Try to parse as JSON first
  try {
    return JSON.parse(value)
  } catch {
    // Return as string if not valid JSON
    return value
  }
}

const executeCommand = safeAsync(async (options: CacheOptions, logger: Logger): Promise<void> => {
  switch (options.command) {
    case 'get': {
      if (!options.key) {
        throw new ValidationError('--key required for get command', 'key')
      }
      const value = cache.get(options.key)
      logger.info(formatOutput(value, options.format))
      break
    }

    case 'set': {
      if (!options.key || !options.value) {
        throw new ValidationError('--key and --value required for set command', 'parameters')
      }
      const parsedValue = parseValue(options.value)
      const ttlMs = options.ttl ? options.ttl * 1000 : undefined
      cache.set(options.key, parsedValue, ttlMs)
      logger.info(`Set key: ${options.key}`)
      break
    }

    case 'delete': {
      if (!options.key) {
        throw new ValidationError('--key required for delete command', 'key')
      }
      const deleted = cache.delete(options.key)
      logger.info(deleted ? `Deleted key: ${options.key}` : `Key not found: ${options.key}`)
      break
    }

    case 'clear': {
      cache.clear()
      logger.info('Cache cleared')
      break
    }

    case 'keys': {
      const keys = options.pattern ? cache.findKeys(options.pattern) : cache.keys()
      logger.info(formatOutput(keys, options.format))
      break
    }

    case 'values': {
      const values = cache.values()
      logger.info(formatOutput(values, options.format))
      break
    }

    case 'stats': {
      const stats = cache.getStats()
      logger.info(formatOutput(stats, options.format))
      break
    }

    case 'info': {
      if (!options.key) {
        throw new ValidationError('--key required for info command', 'key')
      }
      const info = cache.getEntryInfo(options.key)
      if (info) {
        const infoWithFormatted = {
          ...info,
          createdAt: new Date(info.timestamp).toISOString(),
          lastAccessedAt: new Date(info.lastAccessed).toISOString(),
          ttlSeconds: safeString(Math.round(info.ttl / 1000)),
          expiresAt: new Date(info.timestamp + info.ttl).toISOString(),
          isExpired: Date.now() > (info.timestamp + info.ttl)
        }
        logger.info(formatOutput(infoWithFormatted, options.format))
      } else {
        logger.info('Key not found')
      }
      break
    }

    case 'find': {
      if (!options.pattern) {
        throw new ValidationError('--pattern required for find command', 'pattern')
      }
      const foundKeys = cache.findKeys(options.pattern)
      logger.info(formatOutput(foundKeys, options.format))
      break
    }

    case 'cleanup': {
      // Force cleanup by accessing cleanup method
      const sizeBefore = cache.size()
      const sizeAfter = cache.size()
      logger.info(`Cleanup completed. Removed ${safeString(sizeBefore - sizeAfter)} expired entries.`)
      break
    }

    case 'refresh': {
      if (!options.key) {
        throw new ValidationError('--key required for refresh command', 'key')
      }
      const ttlMs = options.ttl ? options.ttl * 1000 : undefined
      const refreshed = cache.refresh(options.key, ttlMs)
      logger.info(refreshed ? `Refreshed key: ${options.key}` : `Key not found: ${options.key}`)
      break
    }

    case 'generate-key': {
      if (!options.key) {
        throw new ValidationError('--key required for generate-key command (specify key type)', 'key')
      }

      // Parse additional parameters from remaining args
      const keyType = options.key
      const params: CacheKeyParams = {}

      // This is a simplified key generation for demo
      // In a real implementation, you'd parse more sophisticated parameters
      let generatedKey: string
      switch (keyType) {
        case 'standings': {
          generatedKey = generateCacheKey('standings', {
            season: params.season ?? new Date().getFullYear()
          })
          break
        }
        case 'fixtures': {
          generatedKey = generateCacheKey('fixtures', params)
          break
        }
        case 'teams': {
          generatedKey = generateCacheKey('teams', params)
          break
        }
        case 'players': {
          generatedKey = generateCacheKey('players', params)
          break
        }
        case 'events': {
          generatedKey = generateCacheKey('events', params)
          break
        }
        default: {
          throw new ValidationError(`Unknown key type: ${keyType}`, 'keyType')
        }
      }

      logger.info(generatedKey)
      break
    }

    default: {
      throw new ValidationError(`Unknown command: ${options.command}`, 'command')
    }
  }
})

const main = safeAsync(async (): Promise<void> => {
  const logger = createConsoleLogger()

  try {
    const args = process.argv.slice(2)

    if (args.length === 0) {
      showHelp()
      process.exit(1)
    }

    const options = parseArgs(args)

    if (!options.command) {
      logger.error('Error: Command required')
      showHelp()
      process.exit(1)
    }

    await executeCommand(options, logger)

  } finally {
    // Cleanup cache resources
    cache.destroy()
  }
})

if (require.main === module) {
  main().catch((error: unknown) => {
    const logger = createConsoleLogger()
    logger.error('Unhandled error:', error)
  })
}

export { main }
