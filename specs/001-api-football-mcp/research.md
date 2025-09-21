# Phase 0: Research & Technical Decisions

## API-Football Integration

### Decision: API-Football v3 with Rate Limiting
- **Rationale**: V3 is the latest stable API version with comprehensive EPL coverage
- **Rate Limiting Strategy**: Read X-RateLimit headers from responses, implement exponential backoff
- **Authentication**: API key via header `x-apisports-key`
- **Base URL**: https://v3.football.api-sports.io
- **Alternatives considered**:
  - Football-data.org (less comprehensive data)
  - Sportradar (more expensive, enterprise focus)

## MCP Implementation Patterns

### Decision: @modelcontextprotocol/sdk with stdio transport
- **Rationale**: Official SDK ensures protocol compliance, stdio is standard for local MCP servers
- **Tool Design**: Separate tools for each entity type (teams, players, fixtures, events,  standings)
- **Resource Design**: Optional - could expose saved queries or favorites
- **Error Handling**: Use MCP error codes (-32000 series for application errors)
- **Alternatives considered**:
  - Custom JSON-RPC implementation (unnecessary complexity)
  - HTTP transport (not needed for local agent use)

## TypeScript Project Setup

### Decision: Node.js 22+ with TypeScript 5+ strict mode
- **Rationale**: Latest LTS Node, TypeScript strict mode catches errors early
- **Build System**: tsc with CommonJS output for MCP compatibility
- **Package Manager**: pnpm 
- **Module System**: CommonJS for MCP server, ESM for internal libraries
- **Alternatives considered**:
  - Deno/Bun (less mature MCP ecosystem)
  - JavaScript (loses type safety benefits)

## Testing Strategy

### Decision: Vitest with TDD workflow
- **Rationale**: Fast, TypeScript-native, good DX for TDD
- **Test Structure**:
  - Contract tests: Validate API-Football response schemas
  - Integration tests: Test MCP tool execution end-to-end
  - Unit tests: Test data transformations and caching logic
- **Test Data**: Use fixture files for predictable API responses
- **Alternatives considered**:
  - Jest (slower, more configuration needed)
  - Mocha/Chai (less integrated TypeScript support)

## Caching Strategy

### Decision: In-memory LRU cache with TTL
- **Rationale**: Simple, fast, sufficient for historic data that rarely changes
- **Implementation**: Map with size limit and timestamp tracking
- **TTL Values**:
  - Historic data (pre-current season): 24 hours
  - Current season standings: 5 minutes
  - Live match data: No caching
  - Team/player profiles: 1 hour
- **Alternatives considered**:
  - Redis (overkill for single-user MCP server)
  - SQLite (unnecessary persistence complexity)

## Code Quality Tools

### Decision: ESLint with 'standard' style
- **Rationale**: User requirement, consistent formatting
- **Configuration**: ESLint 9 flat config, ESLint Stylistic for formatting
- **Pre-commit**: Run eslint --fix on staged files
- **VS Code**: Should format code on save using codeActionsOnSave
- **Alternatives considered**:
  - Prettier (different from requested standard style)
  - TSLint (deprecated)

## EPL Data Coverage

### Decision: League ID 39 for Premier League
- **Rationale**: API-Football's official ID for English Premier League
- **Season Format**: Years as YYYY (e.g., 2024 for 2024-25 season)
- **Historic Coverage (practical)**: API-Football v3 typically provides reliable historical data from the 2002 season onwards for EPL. Earlier seasons (pre-2002) may be incomplete or unavailable depending on endpoint.
- **Data Points**: All requirements met (standings, fixtures, squads, players, events)
- **Alternatives considered**:
  - Multiple league support (scope creep, not in requirements)

## Error Handling Patterns

### Decision: Graceful degradation with clear error messages
- **Rationale**: MCP clients need actionable error information
- **API Errors**: Return cached data if available, clear message if not
- **Rate Limit**: Return 429-equivalent MCP error with retry-after info
- **Network Errors**: Retry with exponential backoff up to 3 times
- **Invalid Requests**: Return 400-equivalent with parameter guidance
- **Alternatives considered**:
  - Fail fast (poor user experience)
  - Silent fallbacks (hides problems)

## Performance Optimizations

### Decision: Parallel requests with connection pooling
- **Rationale**: Maximize throughput within rate limits
- **HTTP Agent**: Keep-alive connections, max 5 concurrent
- **Batch Requests**: Group related queries when possible
- **Response Streaming**: Parse JSON as it arrives for large datasets
- **Alternatives considered**:
  - Sequential requests (too slow)
  - Unlimited parallel (rate limit issues)

## Security Considerations

### Decision: Environment variable for API key, no logging of sensitive data
- **Rationale**: Standard practice, prevents accidental exposure
- **Implementation**: Check API_FOOTBALL_KEY on startup, fail if missing
- **Logging**: Sanitize API responses before logging
- **Error Messages**: Never include API key in errors
- **Alternatives considered**:
  - Config file (less secure)
  - Hardcoded (absolutely not)

## Resolved Technical Decisions

All technical decisions have been made based on requirements and best practices:
- ✅ TypeScript with strict mode
- ✅ Vitest for TDD
- ✅ ESLint with standard style
- ✅ API-Football v3 integration
- ✅ MCP SDK implementation
- ✅ In-memory caching
- ✅ Rate limit handling
- ✅ EPL data coverage 1992-present

No remaining NEEDS CLARIFICATION items.
