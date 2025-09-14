// String utility functions for safe template literal usage

/**
 * Safely converts any value to a string for use in template literals
 * Handles null, undefined, and complex objects appropriately
 */
export function safeString (value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (typeof value === 'boolean') return value.toString()
  if (typeof value === 'bigint') return value.toString()
  if (typeof value === 'symbol') return value.toString()

  // Handle dates
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Handle errors
  if (value instanceof Error) {
    return value.message
  }

  // Handle arrays and objects
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[object Object]'
    }
  }

  // Fallback
  return String(value)
}

/**
 * Formats a number for display in template literals
 */
export function formatNumber (value: number, options?: {
  decimals?: number
  thousands?: boolean
  unit?: string
}): string {
  const { decimals, thousands = true, unit } = options ?? {}

  let formatted = decimals !== undefined
    ? value.toFixed(decimals)
    : value.toString()

  if (thousands && Math.abs(value) >= 1000) {
    formatted = value.toLocaleString()
  }

  return unit ? `${formatted} ${unit}` : formatted
}

/**
 * Safely formats bytes for display
 */
export function formatBytes (bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Safely formats duration in milliseconds
 */
export function formatDuration (ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

/**
 * Safely formats a percentage
 */
export function formatPercentage (value: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

/**
 * Truncates a string to specified length with ellipsis
 */
export function truncate (str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Pads a string to specified width (useful for table formatting)
 */
export function padString (str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  if (str.length >= width) return str

  const padding = width - str.length

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + str
    case 'center':
      const leftPadding = Math.floor(padding / 2)
      const rightPadding = padding - leftPadding
      return ' '.repeat(leftPadding) + str + ' '.repeat(rightPadding)
    default:
      return str + ' '.repeat(padding)
  }
}

