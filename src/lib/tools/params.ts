import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js'

export function getToolArguments<T = Record<string, unknown>> (
  request: CallToolRequest
): T {
  const params = request.params as unknown
  if (params && typeof params === 'object' && 'arguments' in (params as Record<string, unknown>)) {
    const args = (params as Record<string, unknown>).arguments
    if (args && typeof args === 'object') {
      return args as T
    }
  }
  return (params as T) || ({} as T)
}
