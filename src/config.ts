import { logger } from './lib/server/logger'
import { safeString } from './lib/utils/string-utils'

export interface EnvironmentConfig {
  apiKey: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  nodeEnv: 'development' | 'production' | 'test'
  cacheMaxSize: number
  cacheTtl: number
  apiTimeout: number
  apiBaseUrl?: string
  logFormat: 'json' | 'text'
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  config?: EnvironmentConfig
}

// Default values
const DEFAULTS = {
  LOG_LEVEL: 'info' as const,
  NODE_ENV: 'development' as const,
  CACHE_MAX_SIZE: 1000,
  CACHE_TTL: 300000, // 5 minutes
  API_TIMEOUT: 15000, // 15 seconds
  API_BASE_URL: 'https://v3.football.api-sports.io',
  LOG_FORMAT: 'json' as const
}

// Validation rules
const VALIDATION_RULES = {
  API_KEY: {
    required: true,
    minLength: 10,
    pattern: /^[a-zA-Z0-9_-]+$/
  },
  CACHE_MAX_SIZE: {
    min: 1,
    max: 100000
  },
  CACHE_TTL: {
    min: 1000, // 1 second
    max: 24 * 60 * 60 * 1000 // 24 hours
  },
  API_TIMEOUT: {
    min: 1000, // 1 second
    max: 60000 // 60 seconds
  }
}

/**
 * Validate environment variables and return configuration
 */
export function validateEnvironment (): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // Extract environment variables
    const env = process.env

    // Validate API Key
    const apiKey = env.API_FOOTBALL_KEY
    if (!apiKey) {
      errors.push('API_FOOTBALL_KEY environment variable is required')
    } else if (apiKey.length < VALIDATION_RULES.API_KEY.minLength) {
      errors.push(`API_FOOTBALL_KEY must be at least ${safeString(VALIDATION_RULES.API_KEY.minLength)} characters`)
    } else if (!VALIDATION_RULES.API_KEY.pattern.test(apiKey)) {
      errors.push('API_FOOTBALL_KEY contains invalid characters (only alphanumeric, underscore, and dash allowed)')
    }

    // Validate Log Level
    let logLevel = (env.LOG_LEVEL?.toLowerCase() ?? DEFAULTS.LOG_LEVEL) as EnvironmentConfig['logLevel']
    if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
      warnings.push(`Invalid LOG_LEVEL "${safeString(env.LOG_LEVEL)}", using default: ${DEFAULTS.LOG_LEVEL}`)
      logLevel = DEFAULTS.LOG_LEVEL as EnvironmentConfig['logLevel']
    }

    // Validate Node Environment
    let nodeEnv = (env.NODE_ENV?.toLowerCase() ?? DEFAULTS.NODE_ENV) as EnvironmentConfig['nodeEnv']
    if (!['development', 'production', 'test'].includes(nodeEnv)) {
      warnings.push(`Invalid NODE_ENV "${safeString(env.NODE_ENV)}", using default: ${DEFAULTS.NODE_ENV}`)
      nodeEnv = DEFAULTS.NODE_ENV as EnvironmentConfig['nodeEnv']
    }

    // Validate Cache Max Size
    let cacheMaxSize = DEFAULTS.CACHE_MAX_SIZE
    if (env.CACHE_MAX_SIZE !== undefined) {
      if (env.CACHE_MAX_SIZE === '') {
        warnings.push(`Empty CACHE_MAX_SIZE, using default: ${safeString(DEFAULTS.CACHE_MAX_SIZE)}`)
      } else {
        const parsed = parseInt(env.CACHE_MAX_SIZE, 10)
        if (isNaN(parsed)) {
          warnings.push(`Invalid CACHE_MAX_SIZE "${env.CACHE_MAX_SIZE}", using default: ${safeString(DEFAULTS.CACHE_MAX_SIZE)}`)
        } else if (parsed < VALIDATION_RULES.CACHE_MAX_SIZE.min || parsed > VALIDATION_RULES.CACHE_MAX_SIZE.max) {
          warnings.push(`CACHE_MAX_SIZE must be between ${safeString(VALIDATION_RULES.CACHE_MAX_SIZE.min)} and ${safeString(VALIDATION_RULES.CACHE_MAX_SIZE.max)}, using default: ${safeString(DEFAULTS.CACHE_MAX_SIZE)}`)
        } else {
          cacheMaxSize = parsed
        }
      }
    }

    // Validate Cache TTL
    let cacheTtl = DEFAULTS.CACHE_TTL
    if (env.CACHE_TTL) {
      const parsed = parseInt(env.CACHE_TTL, 10)
      if (isNaN(parsed)) {
        warnings.push(`Invalid CACHE_TTL "${env.CACHE_TTL}", using default: ${safeString(DEFAULTS.CACHE_TTL)}`)
      } else if (parsed < VALIDATION_RULES.CACHE_TTL.min || parsed > VALIDATION_RULES.CACHE_TTL.max) {
        warnings.push(`CACHE_TTL must be between ${safeString(VALIDATION_RULES.CACHE_TTL.min)} and ${safeString(VALIDATION_RULES.CACHE_TTL.max)}ms, using default: ${safeString(DEFAULTS.CACHE_TTL)}`)
      } else {
        cacheTtl = parsed
      }
    }

    // Validate API Timeout
    let apiTimeout = DEFAULTS.API_TIMEOUT
    if (env.API_TIMEOUT !== undefined) {
      if (env.API_TIMEOUT === '') {
        warnings.push(`Empty API_TIMEOUT, using default: ${safeString(DEFAULTS.API_TIMEOUT)}`)
      } else {
        const parsed = parseInt(env.API_TIMEOUT, 10)
        if (isNaN(parsed)) {
          warnings.push(`Invalid API_TIMEOUT "${env.API_TIMEOUT}", using default: ${safeString(DEFAULTS.API_TIMEOUT)}`)
        } else if (parsed < VALIDATION_RULES.API_TIMEOUT.min || parsed > VALIDATION_RULES.API_TIMEOUT.max) {
          warnings.push(`API_TIMEOUT must be between ${safeString(VALIDATION_RULES.API_TIMEOUT.min)} and ${safeString(VALIDATION_RULES.API_TIMEOUT.max)}ms, using default: ${safeString(DEFAULTS.API_TIMEOUT)}`)
        } else {
          apiTimeout = parsed
        }
      }
    }

    // Validate API Base URL
    let apiBaseUrl = env.API_BASE_URL ?? DEFAULTS.API_BASE_URL
    if (env.API_BASE_URL) {
      try {
        new URL(apiBaseUrl)
      } catch {
        warnings.push(`Invalid API_BASE_URL "${env.API_BASE_URL}", using default: ${DEFAULTS.API_BASE_URL}`)
        apiBaseUrl = DEFAULTS.API_BASE_URL
      }
    }

    // Validate Log Format
    let logFormat = (env.LOG_FORMAT?.toLowerCase() ?? DEFAULTS.LOG_FORMAT) as EnvironmentConfig['logFormat']
    if (!['json', 'text'].includes(logFormat)) {
      warnings.push(`Invalid LOG_FORMAT "${safeString(env.LOG_FORMAT)}", using default: ${DEFAULTS.LOG_FORMAT}`)
      logFormat = DEFAULTS.LOG_FORMAT as EnvironmentConfig['logFormat']
    }

    // If no API key, we can't continue
    if (!apiKey) {
      return {
        isValid: false,
        errors,
        warnings
      }
    }

    // Build final configuration
    const config: EnvironmentConfig = {
      apiKey,
      logLevel,
      nodeEnv,
      cacheMaxSize,
      cacheTtl,
      apiTimeout,
      apiBaseUrl,
      logFormat
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      config
    }

  } catch (error) {
    return {
      isValid: false,
      errors: [`Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings
    }
  }
}

/**
 * Load and validate configuration, exit on critical errors
 */
export function loadConfig (): EnvironmentConfig {
  const validation = validateEnvironment()

  // Log warnings
  if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => {
      logger.warn(`Config warning: ${warning}`)
    })
  }

  // Handle errors
  if (!validation.isValid || validation.errors.length > 0) {
    validation.errors.forEach(error => {
      logger.error(`Config error: ${error}`)
    })

    logger.error('Configuration validation failed. Please check your environment variables.')
    process.exit(1)
  }

  // Log successful configuration
  if (validation.config) {
    logger.info('Configuration loaded successfully', {
      logLevel: validation.config.logLevel,
      nodeEnv: validation.config.nodeEnv,
      cacheMaxSize: validation.config.cacheMaxSize,
      cacheTtlSeconds: Math.round(validation.config.cacheTtl / 1000),
      apiTimeoutSeconds: Math.round(validation.config.apiTimeout / 1000)
    })

    return validation.config
  }

  // This should never happen due to earlier checks
  logger.error('Configuration validation succeeded but no config returned')
  process.exit(1)
}

/**
 * Get specific configuration values with defaults
 */
export function getConfig<K extends keyof EnvironmentConfig> (
  key: K,
  defaultValue?: EnvironmentConfig[K]
): EnvironmentConfig[K] {
  const validation = validateEnvironment()

  if (validation.config?.[key] !== undefined) {
    return validation.config[key]
  }

  if (defaultValue !== undefined) {
    return defaultValue
  }

  // Fallback to hardcoded defaults
  switch (key) {
    case 'logLevel':
      return DEFAULTS.LOG_LEVEL as EnvironmentConfig[K]
    case 'nodeEnv':
      return DEFAULTS.NODE_ENV as EnvironmentConfig[K]
    case 'cacheMaxSize':
      return DEFAULTS.CACHE_MAX_SIZE as EnvironmentConfig[K]
    case 'cacheTtl':
      return DEFAULTS.CACHE_TTL as EnvironmentConfig[K]
    case 'apiTimeout':
      return DEFAULTS.API_TIMEOUT as EnvironmentConfig[K]
    case 'apiBaseUrl':
      return DEFAULTS.API_BASE_URL as EnvironmentConfig[K]
    case 'logFormat':
      return DEFAULTS.LOG_FORMAT as EnvironmentConfig[K]
    default:
      throw new Error(`No default value available for config key: ${key as string}`)
  }
}

/**
 * Check if we're in development mode
 */
export function isDevelopment (): boolean {
  return getConfig('nodeEnv') === 'development'
}

/**
 * Check if we're in production mode
 */
export function isProduction (): boolean {
  return getConfig('nodeEnv') === 'production'
}

/**
 * Check if we're in test mode
 */
export function isTest (): boolean {
  return getConfig('nodeEnv') === 'test'
}

/**
 * Get environment summary for debugging
 */
export function getEnvironmentSummary () {
  const validation = validateEnvironment()

  return {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    config: validation.config ? {
      ...validation.config,
      apiKey: '***REDACTED***' // Never log API keys
    } : null
  }
}

