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
    try {
      // Only enable pretty transport if available to avoid runtime errors
      // in environments where pino-pretty is not installed.
      // eslint-disable-next-line n/no-missing-require
      require.resolve('pino-pretty')
      pinoConfig.transport = {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'hostname,pid'
        }
      }
    } catch {
      // Fallback silently to non-pretty output
    }
  }

  // Production file logging with rotation
  if (!pretty && process.env.LOG_TO_FILE === 'true') {
    const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs')
    const rotateInterval = process.env.LOG_ROTATE_INTERVAL || '1d' // daily
    const rotateSize = process.env.LOG_ROTATE_SIZE || '10M'
    try {
      fs.mkdirSync(logDir, { recursive: true })
    } catch {}

    try {
      // Try rotating file transport if available
      // eslint-disable-next-line n/no-missing-require
      require.resolve('pino-rotating-file')
      pinoConfig.transport = {
        target: 'pino-rotating-file',
        options: {
          path: path.join(logDir, 'server.log'),
          interval: rotateInterval,
          size: rotateSize
        }
      } as any
    } catch {
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
      if (typeof message === 'string') {
        console.log(`DEBUG: ${message}`, ...args)
      } else {
        console.log('DEBUG:', message)
      }
    },
    info: (message: string | object, ...args: unknown[]) => {
      if (typeof message === 'string') {
        console.log(`INFO: ${message}`, ...args)
      } else {
        console.log('INFO:', message)
      }
    },
    warn: (message: string | object, ...args: unknown[]) => {
      if (typeof message === 'string') {
        console.warn(`WARN: ${message}`, ...args)
      } else {
        console.warn('WARN:', message)
      }
    },
    error: (message: string | object, ...args: unknown[]) => {
      if (typeof message === 'string') {
        console.error(`ERROR: ${message}`, ...args)
      } else {
        console.error('ERROR:', message)
      }
    },
    fatal: (message: string | object, ...args: unknown[]) => {
      if (typeof message === 'string') {
        console.error(`FATAL: ${message}`, ...args)
      } else {
        console.error('FATAL:', message)
      }
    }
  }
}

// Default logger instance
export const logger = createLogger({ pretty: process.env.NODE_ENV !== 'production' })
