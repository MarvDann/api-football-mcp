import pino from 'pino'
import fs from 'node:fs'
import path from 'node:path'

export interface Logger {
  debug(message: string, ...args: unknown[]): void
  debug(obj: object, message?: string): void
  info(message: string, ...args: unknown[]): void
  info(obj: object, message?: string): void
  warn(message: string, ...args: unknown[]): void
  warn(obj: object, message?: string): void
  error(message: string, ...args: unknown[]): void
  error(obj: object, message?: string): void
  fatal(message: string, ...args: unknown[]): void
  fatal(obj: object, message?: string): void
}

export interface LoggerConfig {
  level?: 'debug' | 'info' | 'warn' | 'error' | 'fatal'
  pretty?: boolean
  name?: string
}

export function createLogger (config: LoggerConfig = {}): Logger {
  const { level = 'info', pretty = false, name } = config

  const pinoConfig: pino.LoggerOptions = {
    level
  }

  if (name) {
    pinoConfig.name = name
  }

  if (pretty) {
    const prettyAvailable = moduleExists('pino-pretty')
    if (prettyAvailable) {
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'hostname,pid'
        }
      }
    }
  }

  // Production file logging with rotation
  if (!pretty && process.env.LOG_TO_FILE === 'true') {
    const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs')
    const rotateInterval = process.env.LOG_ROTATE_INTERVAL || '1d' // daily
    const rotateSize = process.env.LOG_ROTATE_SIZE || '10M'
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true })
      } catch {
        // ignore directory creation errors; will fallback to stdout
      }
    }

    // Try rotating file transport if available
    if (moduleExists('pino-rotating-file')) {
      pinoConfig.transport = {
        target: 'pino-rotating-file',
        options: {
          path: path.join(logDir, 'server.log'),
          interval: rotateInterval,
          size: rotateSize
        }
      }
    } else {
      // Fallback to simple file per-day
      const date = new Date().toISOString().slice(0, 10)
      const destination = path.join(logDir, `server-${date}.log`)
      return pino(pinoConfig, pino.destination({ dest: destination, sync: false }))
    }
  }

  return pino(pinoConfig)
}

export function createConsoleLogger (): Logger {
  return {
    debug: (message: string | object, ...args: unknown[]) => {
      const text = typeof message === 'string' ? `DEBUG: ${message}` : `DEBUG: ${JSON.stringify(message)}`
      process.stdout.write(text + (args.length ? ` ${args.map(a => String(a)).join(' ')}` : '') + '\n')
    },
    info: (message: string | object, ...args: unknown[]) => {
      const text = typeof message === 'string' ? `INFO: ${message}` : `INFO: ${JSON.stringify(message)}`
      process.stdout.write(text + (args.length ? ` ${args.map(a => String(a)).join(' ')}` : '') + '\n')
    },
    warn: (message: string | object, ...args: unknown[]) => {
      const text = typeof message === 'string' ? `WARN: ${message}` : `WARN: ${JSON.stringify(message)}`
      process.stderr.write(text + (args.length ? ` ${args.map(a => String(a)).join(' ')}` : '') + '\n')
    },
    error: (message: string | object, ...args: unknown[]) => {
      const text = typeof message === 'string' ? `ERROR: ${message}` : `ERROR: ${JSON.stringify(message)}`
      process.stderr.write(text + (args.length ? ` ${args.map(a => String(a)).join(' ')}` : '') + '\n')
    },
    fatal: (message: string | object, ...args: unknown[]) => {
      const text = typeof message === 'string' ? `FATAL: ${message}` : `FATAL: ${JSON.stringify(message)}`
      process.stderr.write(text + (args.length ? ` ${args.map(a => String(a)).join(' ')}` : '') + '\n')
    }
  }
}

// Default logger instance
export const logger = createLogger({ pretty: process.env.NODE_ENV !== 'production' })

function moduleExists (name: string): boolean {
  try {
    require.resolve(name)
    return true
  } catch {
    return false
  }
}
