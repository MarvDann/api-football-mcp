import pino from 'pino'

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
    pinoConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'hostname,pid'
      }
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
