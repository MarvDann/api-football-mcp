import { CacheMetricsTracker } from './policies'
import { isExpired } from './keys'

export interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
}

export interface CacheOptions {
  defaultTtl?: number
  maxSize?: number
  checkInterval?: number // Cleanup interval in milliseconds
}

export class LRUCache<T = any> {
  private readonly cache = new Map<string, CacheEntry<T>>()
  private readonly metrics = new CacheMetricsTracker()
  private readonly maxSize: number
  private readonly defaultTtl: number
  private cleanupTimer?: NodeJS.Timeout

  constructor (options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000
    this.defaultTtl = options.defaultTtl || 5 * 60 * 1000 // 5 minutes

    // Start periodic cleanup
    const checkInterval = options.checkInterval || 60 * 1000 // 1 minute
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, checkInterval)
  }

  set (key: string, value: T, ttl?: number): void {
    const now = Date.now()
    const entryTtl = ttl !== undefined ? ttl : this.defaultTtl

    // If cache is at max size and key doesn't exist, evict least recently used
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU()
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      ttl: entryTtl,
      accessCount: 0,
      lastAccessed: now
    }

    this.cache.set(key, entry)
    this.metrics.set()
  }

  get (key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.metrics.miss()
      return null
    }

    // Check if entry has expired
    if (isExpired(entry.timestamp, entry.ttl)) {
      this.cache.delete(key)
      this.metrics.delete()
      this.metrics.miss()
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()

    // Move to end (most recently used) by re-setting
    this.cache.delete(key)
    this.cache.set(key, entry)

    this.metrics.hit()
    return entry.value
  }

  has (key: string): boolean {
    const entry = this.cache.get(key)

    if (!entry) {
      return false
    }

    // Check if expired
    if (isExpired(entry.timestamp, entry.ttl)) {
      this.cache.delete(key)
      this.metrics.delete()
      return false
    }

    return true
  }

  delete (key: string): boolean {
    const existed = this.cache.delete(key)
    if (existed) {
      this.metrics.delete()
    }
    return existed
  }

  clear (): void {
    this.cache.clear()
    this.metrics.reset()
  }

  size (): number {
    return this.cache.size
  }

  keys (): string[] {
    return Array.from(this.cache.keys())
  }

  values (): T[] {
    return Array.from(this.cache.values()).map(entry => entry.value)
  }

  entries (): [string, T][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value])
  }

  // Get cache statistics
  getStats (): {
    size: number
    maxSize: number
    hitRate: number
    metrics: ReturnType<CacheMetricsTracker['getMetrics']>
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.metrics.getHitRate(),
      metrics: this.metrics.getMetrics()
    }
  }

  // Get entry metadata
  getEntryInfo (key: string): Omit<CacheEntry<T>, 'value'> | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    return {
      timestamp: entry.timestamp,
      ttl: entry.ttl,
      accessCount: entry.accessCount,
      lastAccessed: entry.lastAccessed
    }
  }

  // Batch operations
  setMany (entries: [string, T][], ttl?: number): void {
    entries.forEach(([key, value]) => {
      this.set(key, value, ttl)
    })
  }

  getMany (keys: string[]): [string, T | null][] {
    return keys.map(key => [key, this.get(key)])
  }

  deleteMany (keys: string[]): number {
    return keys.reduce((count, key) => {
      return this.delete(key) ? count + 1 : count
    }, 0)
  }

  // Find keys matching pattern
  findKeys (pattern: RegExp | string): string[] {
    const regex = typeof pattern === 'string'
      ? new RegExp(pattern.replace(/\*/g, '.*'))
      : pattern

    return this.keys().filter(key => regex.test(key))
  }

  // Advanced operations
  refresh (key: string, ttl?: number): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    entry.timestamp = Date.now()
    if (ttl !== undefined) {
      entry.ttl = ttl
    }

    return true
  }

  peek (key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry || isExpired(entry.timestamp, entry.ttl)) {
      return null
    }

    return entry.value
  }

  // Cleanup expired entries
  private cleanup (): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (isExpired(entry.timestamp, entry.ttl)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.metrics.delete()
    })

    if (keysToDelete.length > 0) {
      console.debug(`Cache cleanup: removed ${keysToDelete.length} expired entries`)
    }
  }

  // Evict least recently used entry
  private evictLRU (): void {
    // Get the first entry (least recently used due to Map ordering)
    const firstKey = this.cache.keys().next().value
    if (firstKey) {
      this.cache.delete(firstKey)
      this.metrics.evict()
    }
  }

  // Cleanup resources
  destroy (): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }
}
