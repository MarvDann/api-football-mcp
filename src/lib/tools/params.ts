import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js'

export interface ToolArgumentsShape<A extends object> {
  arguments?: A
}

export function getToolArguments<A extends object = Record<string, unknown>> (
  request: CallToolRequest & { params?: ToolArgumentsShape<A> | Record<string, unknown> }
): A {
  const params = request.params as unknown
  if (params && typeof params === 'object' && 'arguments' in (params as Record<string, unknown>)) {
    const args = (params as Record<string, unknown>).arguments
    if (args && typeof args === 'object') {
      return args as A
    }
  }
  return (params as A) || ({} as A)
}
