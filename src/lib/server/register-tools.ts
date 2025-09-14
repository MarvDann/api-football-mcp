import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import { ToolRegistry } from '../tools/registry'
import { handleError } from './errors'

export function registerToolHandlers (server: Server, toolRegistry: ToolRegistry): void {
  // Handle list_tools requests
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const tools = toolRegistry.getToolsForRegistration()

      return {
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      }
    } catch (error) {
      console.error('Error listing tools:', error)
      throw handleError(error)
    }
  })

  // Handle call_tool requests
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const { name } = request.params

      const tool = toolRegistry.getTool(name)
      if (!tool) {
        throw handleError(new Error(`Tool not found: ${name}`))
      }

      console.log(`Calling tool: ${name}`, JSON.stringify(request.params, null, 2))

      const result = await (tool as any).call(request)

      console.log(`Tool ${name} result:`, JSON.stringify(result, null, 2))

      return result
    } catch (error) {
      console.error(`Error calling tool ${request.params.name}:`, error)
      throw handleError(error)
    }
  })
}

export function logToolRegistration (toolRegistry: ToolRegistry): void {
  const toolNames = toolRegistry.getToolNames()
  const toolCount = toolRegistry.getToolCount()

  console.log(`🔧 Registered ${toolCount} MCP tools:`)
  toolNames.forEach(name => {
    console.log(`   • ${name}`)
  })
}

// Health check utility
export function createHealthCheck (toolRegistry: ToolRegistry) {
  return {
    toolsRegistered: toolRegistry.getToolCount(),
    toolNames: toolRegistry.getToolNames(),
    status: toolRegistry.hasTools() ? 'healthy' : 'no_tools',
    timestamp: new Date().toISOString()
  }
}
