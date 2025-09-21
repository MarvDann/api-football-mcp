import { Tool } from '@modelcontextprotocol/sdk/types.js'
import { APIFootballClient } from '../api-client/client'
import { LRUCache } from '../cache/lru-cache'

import { GetStandingsTool } from './get-standings'
import { GetFixturesTool } from './get-fixtures'
import { GetTeamTool } from './get-team'
import { GetPlayerTool } from './get-player'
import { GetMatchGoalsTool } from './get-match-goals'
import { SearchTeamsTool } from './search-teams'
import { SearchPlayersTool } from './search-players'
import { GetLiveMatchesTool } from './get-live-matches'
import { GetRateLimitTool } from './get-rate-limit'
import { GetSquadTool } from './get-squad'

export interface ToolRegistryDependencies {
  apiClient: APIFootballClient
  cache: LRUCache
}

export class ToolRegistry {
  private tools = new Map<string, Tool>()

  constructor (dependencies: ToolRegistryDependencies) {
    // Register all MCP tools
    this.registerTool(new GetStandingsTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new GetFixturesTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new GetTeamTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new GetPlayerTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new GetMatchGoalsTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new SearchTeamsTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new SearchPlayersTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new GetLiveMatchesTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new GetRateLimitTool(dependencies.apiClient, dependencies.cache))
    this.registerTool(new GetSquadTool(dependencies.apiClient, dependencies.cache))
  }

  private registerTool (tool: Tool): void {
    this.tools.set(tool.name, tool)
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
}
