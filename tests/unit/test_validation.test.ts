import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateEnvironment, getConfig, isDevelopment, isProduction, isTest } from '../../src/config'

// Mock environment variables for testing
const originalEnv = process.env

function mockEnv (env: Record<string, string | undefined>): void {
  process.env = { ...originalEnv, ...env }
}

function restoreEnv (): void {
  process.env = originalEnv
}

describe('Data Validation', () => {
  describe('Environment Validation', () => {
    afterEach(() => {
      restoreEnv()
    })

    describe('Valid Configurations', () => {
      it('should validate complete valid environment', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          LOG_LEVEL: 'info',
          NODE_ENV: 'development',
          CACHE_MAX_SIZE: '1000',
          CACHE_TTL: '300000',
          API_TIMEOUT: '15000',
          API_BASE_URL: 'https://v3.football.api-sports.io',
          LOG_FORMAT: 'json'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.config).toBeDefined()
        expect(result.config?.apiKey).toBe('test_api_key_12345')
        expect(result.config?.logLevel).toBe('info')
        expect(result.config?.nodeEnv).toBe('development')
      })

      it('should validate minimal valid environment', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'minimum_valid_key'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.config?.apiKey).toBe('minimum_valid_key')
        // Should use defaults for other values
        expect(result.config?.logLevel).toBe('info')
        expect(result.config?.nodeEnv).toBe('test') // Uses actual NODE_ENV in test environment
        expect(result.config?.cacheMaxSize).toBe(1000)
      })
    })

    describe('API Key Validation', () => {
      it('should reject missing API key', () => {
        mockEnv({
          API_FOOTBALL_KEY: undefined // Explicitly remove the API key
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('API_FOOTBALL_KEY environment variable is required')
        expect(result.config).toBeUndefined()
      })

      it('should reject empty API key', () => {
        mockEnv({
          API_FOOTBALL_KEY: ''
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })

      it('should reject API key that is too short', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'short'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.includes('must be at least'))).toBe(true)
      })

      it('should reject API key with invalid characters', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'invalid key with spaces!'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true)
      })

      it('should accept API key with valid characters', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'valid_api-key_123'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.config?.apiKey).toBe('valid_api-key_123')
      })
    })

    describe('Log Level Validation', () => {
      it('should accept valid log levels', () => {
        const validLevels = ['debug', 'info', 'warn', 'error']

        validLevels.forEach(level => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            LOG_LEVEL: level
          })

          const result = validateEnvironment()

          expect(result.isValid).toBe(true)
          expect(result.config?.logLevel).toBe(level)
        })
      })

      it('should warn about invalid log level and use default', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          LOG_LEVEL: 'invalid_level'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.includes('Invalid LOG_LEVEL'))).toBe(true)
        expect(result.config?.logLevel).toBe('info') // Default
      })

      it('should handle case insensitive log levels', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          LOG_LEVEL: 'DEBUG'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.config?.logLevel).toBe('debug')
      })
    })

    describe('Node Environment Validation', () => {
      it('should accept valid node environments', () => {
        const validEnvs = ['development', 'production', 'test']

        validEnvs.forEach(env => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            NODE_ENV: env
          })

          const result = validateEnvironment()

          expect(result.isValid).toBe(true)
          expect(result.config?.nodeEnv).toBe(env)
        })
      })

      it('should warn about invalid node environment and use default', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          NODE_ENV: 'staging'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.includes('Invalid NODE_ENV'))).toBe(true)
        expect(result.config?.nodeEnv).toBe('development') // Default
      })
    })

    describe('Numeric Value Validation', () => {
      describe('Cache Max Size', () => {
        it('should accept valid cache max size', () => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            CACHE_MAX_SIZE: '5000'
          })

          const result = validateEnvironment()

          expect(result.isValid).toBe(true)
          expect(result.config?.cacheMaxSize).toBe(5000)
        })

        it('should warn about invalid cache max size and use default', () => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            CACHE_MAX_SIZE: 'not_a_number'
          })

          const result = validateEnvironment()

          expect(result.isValid).toBe(true)
          expect(result.warnings.some(w => w.includes('Invalid CACHE_MAX_SIZE'))).toBe(true)
          expect(result.config?.cacheMaxSize).toBe(1000) // Default
        })

        it('should reject cache max size out of range', () => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            CACHE_MAX_SIZE: '0' // Too small
          })

          let result = validateEnvironment()
          expect(result.warnings.some(w => w.includes('must be between'))).toBe(true)

          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            CACHE_MAX_SIZE: '999999' // Too large
          })

          result = validateEnvironment()
          expect(result.warnings.some(w => w.includes('must be between'))).toBe(true)
        })
      })

      describe('Cache TTL', () => {
        it('should accept valid cache TTL', () => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            CACHE_TTL: '600000' // 10 minutes
          })

          const result = validateEnvironment()

          expect(result.isValid).toBe(true)
          expect(result.config?.cacheTtl).toBe(600000)
        })

        it('should reject cache TTL out of range', () => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            CACHE_TTL: '500' // Too small (less than 1 second)
          })

          let result = validateEnvironment()
          expect(result.warnings.some(w => w.includes('must be between'))).toBe(true)

          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            CACHE_TTL: '999999999999' // Too large (more than 24 hours)
          })

          result = validateEnvironment()
          expect(result.warnings.some(w => w.includes('must be between'))).toBe(true)
        })
      })

      describe('API Timeout', () => {
        it('should accept valid API timeout', () => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            API_TIMEOUT: '30000' // 30 seconds
          })

          const result = validateEnvironment()

          expect(result.isValid).toBe(true)
          expect(result.config?.apiTimeout).toBe(30000)
        })

        it('should reject API timeout out of range', () => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            API_TIMEOUT: '500' // Too small
          })

          let result = validateEnvironment()
          expect(result.warnings.some(w => w.includes('must be between'))).toBe(true)

          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            API_TIMEOUT: '120000' // Too large (more than 60 seconds)
          })

          result = validateEnvironment()
          expect(result.warnings.some(w => w.includes('must be between'))).toBe(true)
        })
      })
    })

    describe('URL Validation', () => {
      it('should accept valid API base URL', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          API_BASE_URL: 'https://api.example.com'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.config?.apiBaseUrl).toBe('https://api.example.com')
      })

      it('should warn about invalid API base URL and use default', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          API_BASE_URL: 'not_a_valid_url'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.includes('Invalid API_BASE_URL'))).toBe(true)
        expect(result.config?.apiBaseUrl).toBe('https://v3.football.api-sports.io') // Default
      })
    })

    describe('Log Format Validation', () => {
      it('should accept valid log formats', () => {
        const validFormats = ['json', 'text']

        validFormats.forEach(format => {
          mockEnv({
            API_FOOTBALL_KEY: 'test_api_key_12345',
            LOG_FORMAT: format
          })

          const result = validateEnvironment()

          expect(result.isValid).toBe(true)
          expect(result.config?.logFormat).toBe(format)
        })
      })

      it('should warn about invalid log format and use default', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          LOG_FORMAT: 'xml'
        })

        const result = validateEnvironment()

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.includes('Invalid LOG_FORMAT'))).toBe(true)
        expect(result.config?.logFormat).toBe('json') // Default
      })
    })
  })

  describe('Configuration Getters', () => {
    beforeEach(() => {
      mockEnv({
        API_FOOTBALL_KEY: 'test_api_key_12345',
        NODE_ENV: 'test'
      })
    })

    afterEach(() => {
      restoreEnv()
    })

    describe('getConfig', () => {
      it('should return config value when available', () => {
        const logLevel = getConfig('logLevel')
        expect(logLevel).toBe('info') // Default value
      })

      it('should return default value when provided', () => {
        const customDefault = getConfig('cacheMaxSize', 5000)
        expect(typeof customDefault).toBe('number')
      })

      it('should throw error for unknown key without default', () => {
        expect(() => {
          getConfig('unknownKey' as any)
        }).toThrow('No default value available')
      })
    })

    describe('Environment Type Checkers', () => {
      it('should correctly identify development environment', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          NODE_ENV: 'development'
        })

        expect(isDevelopment()).toBe(true)
        expect(isProduction()).toBe(false)
        expect(isTest()).toBe(false)
      })

      it('should correctly identify production environment', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          NODE_ENV: 'production'
        })

        expect(isDevelopment()).toBe(false)
        expect(isProduction()).toBe(true)
        expect(isTest()).toBe(false)
      })

      it('should correctly identify test environment', () => {
        mockEnv({
          API_FOOTBALL_KEY: 'test_api_key_12345',
          NODE_ENV: 'test'
        })

        expect(isDevelopment()).toBe(false)
        expect(isProduction()).toBe(false)
        expect(isTest()).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    afterEach(() => {
      restoreEnv()
    })

    it('should handle validation exceptions gracefully', () => {
      // Test that the outer exception handling exists by forcing an exception
      // in the validation logic by making process.env access throw
      const originalProcessEnv = process.env
      Object.defineProperty(process, 'env', {
        get () {
          throw new Error('Process environment access error')
        },
        configurable: true
      })

      try {
        const result = validateEnvironment()

        expect(result.isValid).toBe(false)
        expect(result.errors.some(e => e.includes('Environment validation failed'))).toBe(true)
      } finally {
        Object.defineProperty(process, 'env', {
          value: originalProcessEnv,
          configurable: true,
          writable: true
        })
      }
    })

    it('should provide meaningful error messages', () => {
      mockEnv({
        API_FOOTBALL_KEY: 'x', // Too short
        CACHE_MAX_SIZE: '-1', // Invalid range
        LOG_LEVEL: 'invalid' // Invalid value
      })

      const result = validateEnvironment()

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.warnings.length).toBeGreaterThan(0)

      // Check that error messages are descriptive
      const allMessages = [...result.errors, ...result.warnings]
      expect(allMessages.some(m => m.includes('at least'))).toBe(true)
      expect(allMessages.some(m => m.includes('between'))).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    afterEach(() => {
      restoreEnv()
    })

    it('should handle undefined environment variables', () => {
      mockEnv({
        API_FOOTBALL_KEY: 'test_api_key_12345',
        CACHE_MAX_SIZE: undefined,
        LOG_LEVEL: undefined
      })

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      // Should use defaults for undefined values
      expect(result.config?.cacheMaxSize).toBe(1000)
      expect(result.config?.logLevel).toBe('info')
    })

    it('should handle empty string environment variables', () => {
      mockEnv({
        API_FOOTBALL_KEY: 'test_api_key_12345',
        CACHE_MAX_SIZE: '',
        API_TIMEOUT: ''
      })

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      expect(result.warnings.length).toBeGreaterThan(0)
      // Should use defaults for empty values
      expect(result.config?.cacheMaxSize).toBe(1000)
      expect(result.config?.apiTimeout).toBe(15000)
    })

    it('should handle boundary values', () => {
      mockEnv({
        API_FOOTBALL_KEY: 'test_api_key_12345',
        CACHE_MAX_SIZE: '1', // Minimum valid value
        CACHE_TTL: '1000', // Minimum valid value (1 second)
        API_TIMEOUT: '1000' // Minimum valid value (1 second)
      })

      const result = validateEnvironment()

      expect(result.isValid).toBe(true)
      expect(result.config?.cacheMaxSize).toBe(1)
      expect(result.config?.cacheTtl).toBe(1000)
      expect(result.config?.apiTimeout).toBe(1000)
    })
  })
})
