# API Football MCP Server Constitution

## Core Principles

### I. MCP Protocol Compliance
Server must implement the Model Context Protocol (MCP) specification; All communication via JSON-RPC 2.0 over stdio; Support standard MCP lifecycle: initialize → resources/tools/prompts → execute → shutdown

### II. TypeScript-First Development
Written in TypeScript with strict type checking enabled; Use @modelcontextprotocol/sdk for MCP implementation; Maintain type safety across all API interactions and responses

### III. Football Data Focus
Provide comprehensive football/soccer data via API-Football service; Support leagues, teams, players, fixtures, and statistics; Enable real-time and historical data access

### IV. Error Handling & Resilience
Graceful error handling for API failures and rate limits; Clear error messages following MCP error format; Implement retry logic with exponential backoff for transient failures

### V. Security & Configuration
API keys stored securely via environment variables; Never expose sensitive data in logs or responses; Support configuration via standard MCP configuration files

## Technical Requirements

- **Runtime**: Node.js 22+ with TypeScript 5+
- **Dependencies**: @modelcontextprotocol/sdk
- **Build System**: TypeScript compiler with CommonJS/ESM output
- **Testing**: Vitest for unit tests, integration tests for MCP protocol
- **API Integration**: API-Football v3 endpoints with proper authentication via header `x-apisports-key`

## Development Standards

- Follow MCP SDK patterns and best practices
- Implement comprehensive logging with appropriate levels
- Document all tools, resources, and prompts with clear descriptions
- Validate all inputs and sanitize outputs
- Handle rate limiting and quota management
- Cache responses where appropriate to minimize API calls

## Governance

Constitution defines minimum viable MCP server implementation; All features must maintain MCP protocol compatibility; Changes to core protocol handling require careful testing

**Version**: 1.0.0 | **Ratified**: 2025-01-14 | **Last Amended**: 2025-01-14
