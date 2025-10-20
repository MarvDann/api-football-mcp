export type OutputFormat = 'json' | 'table'

export function getDefaultFormat (): OutputFormat {
  const env = (process.env.MCP_DEFAULT_FORMAT || '').toLowerCase()
  return env === 'json' ? 'json' : 'table'
}

export function getDefaultMaxRows (): number {
  const raw = process.env.MCP_TABLE_MAX_ROWS
  if (!raw) return 50
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 50
}

