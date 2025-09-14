import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LRUCache } from '../../src/lib/cache/lru-cache'

describe('Cache TTL Logic', () => {
  let cache: LRUCache
  let originalDateNow: typeof Date.now
  let mockTime: number

  beforeEach(() => {
    // Mock Date.now to control time
    mockTime = 1000000000000 // Fixed timestamp
    originalDateNow = Date.now
    Date.now = vi.fn(() => mockTime)

    cache = new LRUCache({
      defaultTtl: 5000, // 5 seconds
      maxSize: 100,
      checkInterval: 1000 // 1 second
    })
  })

  afterEach(() => {
    Date.now = originalDateNow
    cache.destroy()
  })

  describe('Basic TTL Operations', () => {
    it('should set and get items with default TTL', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
      expect(cache.has('key1')).toBe(true)
    })

    it('should set and get items with custom TTL', () => {
      cache.set('key1', 'value1', 10000) // 10 seconds
      expect(cache.get('key1')).toBe('value1')
      expect(cache.has('key1')).toBe(true)
    })

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
      expect(cache.has('nonexistent')).toBe(false)
    })
  })

  describe('TTL Expiration', () => {
    it('should expire items after default TTL', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')

      // Advance time past TTL
      mockTime += 6000 // 6 seconds (past 5 second TTL)

      expect(cache.get('key1')).toBeNull()
      expect(cache.has('key1')).toBe(false)
    })

    it('should expire items after custom TTL', () => {
      cache.set('key1', 'value1', 2000) // 2 seconds
      expect(cache.get('key1')).toBe('value1')

      // Advance time to just before expiration
      mockTime += 1900 // 1.9 seconds
      expect(cache.get('key1')).toBe('value1')

      // Advance time past TTL
      mockTime += 200 // Total 2.1 seconds
      expect(cache.get('key1')).toBeNull()
    })

    it('should handle multiple items with different TTLs', () => {
      cache.set('short', 'value1', 1000) // 1 second
      cache.set('medium', 'value2', 3000) // 3 seconds
      cache.set('long', 'value3', 10000) // 10 seconds

      // After 1.5 seconds
      mockTime += 1500
      expect(cache.get('short')).toBeNull() // Expired
      expect(cache.get('medium')).toBe('value2') // Still valid
      expect(cache.get('long')).toBe('value3') // Still valid

      // After 3.5 seconds total
      mockTime += 2000
      expect(cache.get('short')).toBeNull() // Still expired
      expect(cache.get('medium')).toBeNull() // Now expired
      expect(cache.get('long')).toBe('value3') // Still valid

      // After 11 seconds total
      mockTime += 7500
      expect(cache.get('long')).toBeNull() // Now expired
    })
  })

  describe('TTL Edge Cases', () => {
    it('should handle zero TTL as immediate expiration', () => {
      cache.set('key1', 'value1', 0)
      expect(cache.get('key1')).toBeNull()
    })

    it('should handle negative TTL as immediate expiration', () => {
      cache.set('key1', 'value1', -1000)
      expect(cache.get('key1')).toBeNull()
    })

    it('should handle very large TTL values', () => {
      const largeTtl = 365 * 24 * 60 * 60 * 1000 // 1 year
      cache.set('key1', 'value1', largeTtl)

      // Advance time by 1 day
      mockTime += 24 * 60 * 60 * 1000
      expect(cache.get('key1')).toBe('value1')
    })
  })

  describe('Entry Access Updates', () => {
    it('should update lastAccessed timestamp on get', () => {
      cache.set('key1', 'value1')

      const initialInfo = cache.getEntryInfo('key1')
      expect(initialInfo?.lastAccessed).toBe(mockTime)

      // Advance time and access
      mockTime += 1000
      cache.get('key1')

      const updatedInfo = cache.getEntryInfo('key1')
      expect(updatedInfo?.lastAccessed).toBe(mockTime)
    })

    it('should increment access count on get', () => {
      cache.set('key1', 'value1')

      let info = cache.getEntryInfo('key1')
      expect(info?.accessCount).toBe(0)

      cache.get('key1')
      info = cache.getEntryInfo('key1')
      expect(info?.accessCount).toBe(1)

      cache.get('key1')
      info = cache.getEntryInfo('key1')
      expect(info?.accessCount).toBe(2)
    })

    it('should not update access stats when item is expired', () => {
      cache.set('key1', 'value1', 1000)

      // Access initially
      cache.get('key1')
      let info = cache.getEntryInfo('key1')
      expect(info?.accessCount).toBe(1)

      // Expire and try to access
      mockTime += 2000
      expect(cache.get('key1')).toBeNull()

      // Entry should be gone
      info = cache.getEntryInfo('key1')
      expect(info).toBeNull()
    })
  })

  describe('Refresh Operations', () => {
    it('should refresh entry timestamp', () => {
      cache.set('key1', 'value1', 2000)

      const initialInfo = cache.getEntryInfo('key1')
      expect(initialInfo?.timestamp).toBe(mockTime)

      // Advance time and refresh
      mockTime += 1500
      const refreshed = cache.refresh('key1')
      expect(refreshed).toBe(true)

      const refreshedInfo = cache.getEntryInfo('key1')
      expect(refreshedInfo?.timestamp).toBe(mockTime)

      // Should still be valid after original TTL would have expired
      mockTime += 1000 // Total 2.5 seconds from original set
      expect(cache.get('key1')).toBe('value1')
    })

    it('should refresh entry TTL', () => {
      cache.set('key1', 'value1', 2000)

      // Advance time and refresh with new TTL
      mockTime += 1500
      const refreshed = cache.refresh('key1', 5000) // New 5 second TTL
      expect(refreshed).toBe(true)

      const info = cache.getEntryInfo('key1')
      expect(info?.ttl).toBe(5000)

      // Should be valid for the new TTL duration
      mockTime += 4000 // Would have expired with old TTL
      expect(cache.get('key1')).toBe('value1')

      mockTime += 1500 // Past new TTL
      expect(cache.get('key1')).toBeNull()
    })

    it('should return false when refreshing non-existent key', () => {
      const refreshed = cache.refresh('nonexistent')
      expect(refreshed).toBe(false)
    })
  })

  describe('Peek Operations', () => {
    it('should peek without updating access stats', () => {
      cache.set('key1', 'value1')

      const initialInfo = cache.getEntryInfo('key1')
      const initialAccessCount = initialInfo?.accessCount ?? 0
      const initialLastAccessed = initialInfo?.lastAccessed ?? 0

      // Advance time and peek
      mockTime += 1000
      expect(cache.peek('key1')).toBe('value1')

      const afterPeekInfo = cache.getEntryInfo('key1')
      expect(afterPeekInfo?.accessCount).toBe(initialAccessCount)
      expect(afterPeekInfo?.lastAccessed).toBe(initialLastAccessed)
    })

    it('should return null when peeking expired item', () => {
      cache.set('key1', 'value1', 1000)

      // Advance time past TTL
      mockTime += 2000
      expect(cache.peek('key1')).toBeNull()
    })
  })

  describe('Cleanup Operations', () => {
    it('should remove expired entries during cleanup', () => {
      cache.set('key1', 'value1', 1000)
      cache.set('key2', 'value2', 5000)
      cache.set('key3', 'value3', 10000)

      expect(cache.size()).toBe(3)

      // Advance time to expire first item
      mockTime += 2000

      // Force cleanup by calling private method
      ;(cache as any).cleanup()

      expect(cache.size()).toBe(2)
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(true)
      expect(cache.has('key3')).toBe(true)
    })

    it('should clean up all expired entries in one pass', () => {
      // Set multiple items that expire at same time
      cache.set('key1', 'value1', 1000)
      cache.set('key2', 'value2', 1000)
      cache.set('key3', 'value3', 1000)
      cache.set('key4', 'value4', 5000) // This one stays

      expect(cache.size()).toBe(4)

      // Advance time to expire first three
      mockTime += 2000
      ;(cache as any).cleanup()

      expect(cache.size()).toBe(1)
      expect(cache.has('key4')).toBe(true)
    })
  })

  describe('Cache Statistics with TTL', () => {
    it('should update hit/miss stats correctly with expired items', () => {
      cache.set('key1', 'value1', 1000)

      // Hit while valid
      cache.get('key1')
      let stats = cache.getStats()
      expect(stats.metrics.hits).toBe(1)
      expect(stats.metrics.misses).toBe(0)

      // Miss after expiration
      mockTime += 2000
      cache.get('key1')
      stats = cache.getStats()
      expect(stats.metrics.hits).toBe(1)
      expect(stats.metrics.misses).toBe(1)
    })

    it('should track deletions for expired items', () => {
      cache.set('key1', 'value1', 1000)

      let stats = cache.getStats()
      const initialDeletes = stats.metrics.deletes || 0

      // Expire item by getting it
      mockTime += 2000
      cache.get('key1') // This should cause deletion of expired item

      stats = cache.getStats()
      expect(stats.metrics.deletes).toBe(initialDeletes + 1)
    })
  })
})
