# Claude Code Context

## Project Overview
API-Football MCP Server - Provides Premier League data (1992-present) via Model Context Protocol

## Tech Stack
- **Language**: TypeScript 5+ (strict mode)
- **Runtime**: Node.js 22+
- **MCP SDK**: @modelcontextprotocol/sdk
- **Testing**: Vitest (TDD workflow)
- **Linting**: ESLint with 'standard' style
- **Build**: tsc (CommonJS output)
- **Package Manager**: pnpm

## Key Libraries
- `api-client`: API-Football HTTP client with rate limiting
- `cache`: In-memory LRU cache with TTL
- `tools`: MCP tool implementations
- `server`: MCP server via stdio

## Project Structure
```
src/
├── models/        # TypeScript interfaces
├── services/      # Business logic
├── cli/           # CLI interfaces
└── lib/           # Core libraries

tests/
├── contract/      # API contract tests
├── integration/   # End-to-end tests
└── unit/          # Unit tests
```

## Environment
- **API Key**: `API_FOOTBALL_KEY` env variable
- **API Base**: https://v3.football.api-sports.io
- **League ID**: 39 (English Premier League)

## Development Workflow
1. Write failing test first (RED)
2. Implement minimal code to pass (GREEN)
3. Refactor if needed (REFACTOR)
4. Commit with descriptive message

## Testing Commands
```bash
pnpm test           # Run all tests
pnpm run lint       # ESLint check
pnpm run build      # TypeScript compile
pnpm run dev        # Watch mode
```

## MCP Tools
- `get_standings`: League table by season
- `get_fixtures`: Matches by date/team/status
- `get_team`: Team info and squad
- `get_player`: Player profile and stats
- `get_match_events`: Goals, cards, substitutions
- `search_teams`: Find teams by name
- `search_players`: Find players by name/position
- `get_live_matches`: Current live matches

## Rate Limiting
- Read `X-RateLimit-*` headers
- Exponential backoff on 429
- Cache historical data (24h TTL)
- Current data cache (5m TTL)

## Error Handling
- MCP error codes (-32xxx)
- Graceful API failures
- Clear error messages
- Cached data fallback

## Recent Changes
- Initial project setup (2025-01-14)
- MCP tool contracts defined
- Data model established

## Tools
- use rg instead of grep for file searching
- use fd instead of find for finding folders and files
- use jq for parsing JSON

## TODO
- [ ] Implement contract tests
- [ ] Build API client library
- [ ] Create cache system
- [ ] Implement MCP tools
- [ ] Integration testing
- [ ] Performance validation