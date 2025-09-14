import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { DataService } from '../../services/data-service'
import { logger } from '../server/logger'

import { GetStandingsTool } from './get-standings'
import { GetFixturesTool } from './get-fixtures'
import { GetTeamTool } from './get-team'
import { GetPlayerTool } from './get-player'
import { GetMatchEventsTool } from './get-match-events'
import { SearchTeamsTool } from './search-teams'
import { SearchPlayersTool } from './search-players'
import { GetLiveMatchesTool } from './get-live-matches'

export interface DataServiceToolConfig {
  dataService: DataService
  enableLogging?: boolean
}

/**
 * Factory function to create all MCP tools configured with data service
 */
export function createTools (config: DataServiceToolConfig): Tool[] {
  const { dataService, enableLogging = true } = config

  if (enableLogging) {
    logger.info('Creating MCP tools with data service integration')
  }

  // For now, we'll create tools with existing dependencies
  // TODO: Refactor individual tools to accept DataService instead of APIClient + Cache
  const apiClient = (dataService as any).apiClient
  const cache = (dataService as any).cache

  const tools = [
    new GetStandingsTool(apiClient, cache),
    new GetFixturesTool(apiClient, cache),
    new GetTeamTool(apiClient, cache),
    new GetPlayerTool(apiClient, cache),
    new GetMatchEventsTool(apiClient, cache),
    new SearchTeamsTool(apiClient, cache),
    new SearchPlayersTool(apiClient, cache),
    new GetLiveMatchesTool(apiClient, cache)
  ]

  if (enableLogging) {
    logger.info(`Created ${tools.length} MCP tools`, {
      tools: tools.map(t => t.name)
    })
  }

  return tools
}

/**
 * Enhanced tool registry that integrates with data service
 */
export class DataServiceToolRegistry {
  private tools = new Map<string, Tool>()
  private dataService: DataService
  private enableLogging: boolean

  constructor (config: DataServiceToolConfig) {
    this.dataService = config.dataService
    this.enableLogging = config.enableLogging ?? true

    // Create and register all tools
    const tools = createTools(config)
    tools.forEach(tool => { this.registerTool(tool) })
  }

  private registerTool (tool: Tool): void {
    this.tools.set(tool.name, tool)

    if (this.enableLogging) {
      logger.debug(`Registered tool: ${tool.name}`)
    }
  }

  getTool (name: string): Tool | undefined {
    return this.tools.get(name)
  }

  getAllTools (): Tool[] {
    return Array.from(this.tools.values())
  }

  getToolNames (): string[] {
    return Array.from(this.tools.keys())
  }

  hasTools (): boolean {
    return this.tools.size > 0
  }

  getToolCount (): number {
    return this.tools.size
  }

  // Get tools list for MCP server registration
  getToolsForRegistration () {
    return this.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  }

  // Data service specific methods
  async healthCheck (): Promise<{
    toolsRegistered: number
    dataService: any
  }> {
    const dsHealth = await this.dataService.healthCheck()

    return {
      toolsRegistered: this.getToolCount(),
      dataService: dsHealth
    }
  }

  clearCache (): void {
    this.dataService.clearCache()

    if (this.enableLogging) {
      logger.info('Cleared data service cache')
    }
  }

  invalidateCacheByType (type: 'standings' | 'fixtures' | 'teams' | 'players' | 'events'): number {
    const deleted = this.dataService.invalidateCacheByType(type)

    if (this.enableLogging) {
      logger.info(`Invalidated ${deleted} cache entries for type: ${type}`)
    }

    return deleted
  }

  getCacheStats () {
    return this.dataService.getCacheStats()
  }

  // Utility methods for tool execution tracking
  async executeToolWithTracking<T>(
    toolName: string,
    operation: () => Promise<T>,
    params?: any
  ): Promise<T> {
    if (this.enableLogging) {
      logger.toolCall(toolName, params)
    }

    const startTime = Date.now()
    let success = false

    try {
      const result = await operation()
      success = true
      return result
    } finally {
      const duration = Date.now() - startTime

      if (this.enableLogging) {
        logger.toolResponse(toolName, duration, success)
      }
    }
  }
}

// Backwards compatibility export
export { ToolRegistry } from './registry'

// Re-export individual tool classes
export {
  GetStandingsTool,
  GetFixturesTool,
  GetTeamTool,
  GetPlayerTool,
  GetMatchEventsTool,
  SearchTeamsTool,
  SearchPlayersTool,
  GetLiveMatchesTool
}

// Tool type definitions
export interface ToolExecutionContext {
  requestId?: string
  userId?: string
  bypassCache?: boolean
  cacheTtl?: number
}

export interface ToolMetrics {
  name: string
  executions: number
  totalDuration: number
  averageDuration: number
  successRate: number
  lastExecuted?: Date
}
