import { CallToolRequest, CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'

export class GetRateLimitTool implements Tool {
  [key: string]: unknown
  name = 'get_rate_limit'
  description = 'Get current API rate-limit status (limit, remaining, waitTime)'

  // No input required
  inputSchema = {
    type: 'object' as const,
    properties: {}
  } as const

  constructor (
    private apiClient: APIFootballClient,
    _cache: LRUCache // kept for consistent constructor signature, not used here
  ) {}

  async call (_request: CallToolRequest): Promise<CallToolResult> {
    try {
      const info = this.apiClient.getRateLimitInfo()
      const advice = info.shouldWait
        ? `Approaching or exceeded limits. Wait ~${Math.ceil(info.waitTime / 1000)}s before next call.`
        : 'Within safe limits. Consider pacing calls ~3.5s apart.'

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            limit: info.limit,
            remaining: info.remaining,
            shouldWait: info.shouldWait,
            waitTimeMs: info.waitTime,
            advice
          }, null, 2)
        }]
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }],
        isError: true
      }
    }
  }
}
