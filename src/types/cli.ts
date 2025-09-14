// CLI-specific types

export interface BaseCliOptions {
  format: 'json' | 'table'
  verbose: boolean
}

export interface ApiClientOptions extends BaseCliOptions {
  apiKey: string
  endpoint: string
  params: Record<string, string>
}

export interface CacheOptions extends BaseCliOptions {
  command: string
  key?: string
  value?: string
  ttl?: number
  pattern?: string
}

export interface ServerOptions extends BaseCliOptions {
  command: string
  config?: string
  host?: string
  port?: number
  logLevel?: string
}

// CLI command handlers
export type CliHandler<T extends BaseCliOptions> = (options: T) => Promise<void>

// Output formatting
export interface TableColumn {
  key: string
  header: string
  width?: number
  align?: 'left' | 'right' | 'center'
  transform?: (value: unknown) => string
}

export interface FormattedOutput {
  raw: unknown
  formatted: string
  metadata?: {
    rows?: number
    columns?: number
    truncated?: boolean
  }
}

