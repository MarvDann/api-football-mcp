import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface ToolContract {
  name: string
  description: string
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
}

export interface ContractSpec {
  tools: ToolContract[]
  definitions: Record<string, any>
}

let cachedSpec: ContractSpec | null = null

function loadSpec (): ContractSpec {
  if (cachedSpec) return cachedSpec

  const contractPath = join(
    process.cwd(),
    'specs',
    '001-api-football-mcp',
    'contracts',
    'mcp-tools.json'
  )

  const raw = readFileSync(contractPath, 'utf-8')
  cachedSpec = JSON.parse(raw) as ContractSpec
  return cachedSpec
}

export function getContractSpec (): ContractSpec {
  return loadSpec()
}

export function getToolContract (name: string): ToolContract {
  const spec = loadSpec()
  const tool = spec.tools.find(t => t.name === name)

  if (!tool) {
    throw new Error(`Tool contract not found for ${name}`)
  }

  return tool
}

export function getDefinition (definition: string): Record<string, any> {
  const spec = loadSpec()
  const name = definition.replace('#/definitions/', '')
  const schema = spec.definitions[name]

  if (!schema) {
    throw new Error(`Definition not found for ${definition}`)
  }

  return schema
}
