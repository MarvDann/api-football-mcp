# API-Football MCP Server

A Model Context Protocol (MCP) server providing football data via the API-Sports API-Football service.

## Features

- **Historical Coverage**: Premier League historical data (typically 2002–present per API‑Football v3 coverage)
- **Real-time Data**: Live match events, current standings, and fixture information
- **Intelligent Caching**: LRU cache with TTL for optimal performance
- **Rate Limiting**: Built-in rate limit handling with exponential backoff
- **MCP Integration**: Native Model Context Protocol support for LLM integration
- **TypeScript**: Full TypeScript support with strict type checking

## MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `get_standings` | Get Premier League standings | `season?` (number) |
| `get_fixtures` | Get match fixtures | `season?`, `teamId?`, `date?`, `from?`, `to?`, `status?`, `round?` |
| `get_team` | Get team information and optional season squad | `teamId?` or `name?`, `season?` |
| `get_player` | Get player profile and statistics | `playerId?` or `name?`, `season?` |
| `get_match_goals` | Get goal events for a match | `fixtureId` (required) |
| `get_squad` | Get a team's squad for a season | `teamId` (required), `season` (required) |
| `search_teams` | Search for teams by name | `query?`, `season?` |
| `search_players` | Search for players | `query` (required), `team?`, `season?`, `page?` |
| `get_live_matches` | Get currently live matches | None |
| `get_rate_limit` | Get current API rate-limit status | None |

## Data Coverage Notes

- Historical coverage for the English Premier League via API‑Football v3 is commonly available from the 2002 season onwards. Earlier seasons (pre‑2002) may be incomplete or unavailable depending on the specific endpoint.
- If you need season‑specific squads, use `season` with `get_team` (internally uses the `/players` endpoint) or the CLI `--endpoint squad team=<id> season=<YYYY>` helper.
- Fixture queries support `round` in the form `"Regular Season - N"` in addition to `season`, `date`, and `from`/`to`.

## Installation

### Prerequisites

- Node.js 22+
- pnpm package manager
- API-Football API key from [API-Sports](https://api-sports.io/)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MarvDann/api-football-mcp.git
   cd api-football-mcp
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   # Set your API key as an environment variable
   export API_FOOTBALL_KEY=your_api_key_here

   # Or create a .env file
   echo "API_FOOTBALL_KEY=your_api_key_here" > .env
   ```

4. **Build the project**
   ```bash
   pnpm run build
   ```

## Usage

### As MCP Server

The primary use case is as an MCP server for LLM integration:

```bash
# Start the MCP server
pnpm start

# Or run directly
node dist/server.js
```

### MCP Client Configuration

Below are example configurations for popular MCP-capable agents. All examples launch this server over stdio. Replace ${API_FOOTBALL_KEY} with your key or rely on your shell environment.

- Claude Desktop (claude_desktop_config.json):
```json
{
  "mcpServers": {
    "api-football": {
      "command": "node",
      "args": ["dist/server.js"],
      "env": {
        "API_FOOTBALL_KEY": "${API_FOOTBALL_KEY}",
        "NODE_ENV": "production",
        "LOG_TO_FILE": "true",
        "LOG_DIR": "./logs",
        "LOG_ROTATE_INTERVAL": "1d"
      }
    }
  }
}
```

- Claude Code (VS Code settings.json):
```json
{
  "claudeCode.mcpServers": [
    {
      "name": "api-football",
      "command": "node",
      "args": ["dist/server.js"],
      "env": {
        "API_FOOTBALL_KEY": "${API_FOOTBALL_KEY}",
        "NODE_ENV": "production",
        "LOG_TO_FILE": "true",
        "LOG_DIR": "./logs"
      }
    }
  ]
}
```

- Cursor (settings JSON):
```json
{
  "mcpServers": {
    "api-football": {
      "command": "node",
      "args": ["dist/server.js"],
      "env": {
        "API_FOOTBALL_KEY": "${API_FOOTBALL_KEY}",
        "NODE_ENV": "production",
        "LOG_TO_FILE": "true",
        "LOG_DIR": "./logs"
      }
    }
  }
}
```

- Gemini (CLI/desktop MCP support):
```json
{
  "mcpServers": {
    "api-football": {
      "command": "node",
      "args": ["dist/server.js"],
      "env": {
        "API_FOOTBALL_KEY": "${API_FOOTBALL_KEY}",
        "NODE_ENV": "production",
        "LOG_TO_FILE": "true",
        "LOG_DIR": "./logs"
      }
    }
  }
}
```

- Codex CLI (local agent):
```json
{
  "mcpServers": {
    "api-football": {
      "command": "node",
      "args": ["dist/server.js"],
      "env": {
        "API_FOOTBALL_KEY": "${API_FOOTBALL_KEY}",
        "NODE_ENV": "production",
        "LOG_TO_FILE": "true",
        "LOG_DIR": "./logs"
      }
    }
  }
}
```

Tools available to agents include: get_standings, get_fixtures, get_team, get_player, get_squad, get_match_goals, get_live_matches, search_teams, search_players, get_rate_limit.

### CLI Tools

#### Server Management
```bash
# Start server with custom settings
node dist/cli/server.js start --log-level debug --verbose

# Check server health
node dist/cli/server.js health

# Validate configuration
node dist/cli/server.js validate --dry-run

# List available MCP tools
node dist/cli/server.js tools

# Show cache statistics
node dist/cli/server.js cache --verbose
```

#### API Client CLI
```bash
# Get current season standings
node dist/cli/api-client.js --endpoint standings

# Get fixtures for a specific date range
node dist/cli/api-client.js --endpoint fixtures season=2023 from=2023-01-01 to=2023-01-31

# Search for a team
node dist/cli/api-client.js --endpoint teams search="Arsenal"

# Get player information
node dist/cli/api-client.js --endpoint player id=276 --format table

# Get goal events for a fixture
node dist/cli/api-client.js --endpoint goals fixture=123456 --format table

# Check rate limit status
node dist/cli/api-client.js --endpoint rate-limit --format table
```

#### Cache Management CLI
```bash
# View cache statistics
node dist/cli/cache.js stats --format table

# List cached keys
node dist/cli/cache.js keys

# Find keys by pattern
node dist/cli/cache.js find "standings:*"

# Clear cache
node dist/cli/cache.js clear

# Get specific cached value
node dist/cli/cache.js get "standings:2023"
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_FOOTBALL_KEY` | **Required**. Your API-Football API key | - |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `LOG_FORMAT` | Log format (json, text) | `json` |
| `CACHE_MAX_SIZE` | Maximum cache entries | `1000` |
| `CACHE_TTL` | Cache TTL in milliseconds | `300000` (5 minutes) |
| `API_TIMEOUT` | API request timeout in milliseconds | `15000` (15 seconds) |
| `API_BASE_URL` | API-Football base URL | `https://v3.football.api-sports.io` |

### Cache Policies

The server uses different cache TTL values based on data type:

- **Historical data** (past seasons): 24 hours
- **Current season data**: 5 minutes
- **Live match data**: 30 seconds
- **Static data** (teams, players): 1 hour

## Development

### Scripts

```bash
# Development
pnpm run dev          # Watch mode with hot reload
pnpm run build        # Build TypeScript
pnpm run lint         # Run ESLint
pnpm run test         # Run all tests

# Offline test suite (no real API calls)
pnpm run test:offline   # unit + contract + performance (mocked)

# Online tests (may hit API-Football; respect rate limits)
pnpm run test:online

# Run specific categories
pnpm run test:unit
pnpm run test:contract
pnpm run test:performance
pnpm run test:integration

# Type checking
npx tsc --noEmit      # Type check without compilation
```

### Project Structure

```
src/
├── models/           # TypeScript interfaces
│   ├── league.ts     # League data models
│   ├── team.ts       # Team and venue models
│   ├── player.ts     # Player and statistics models
│   ├── fixture.ts    # Match and fixture models
│   ├── standing.ts   # League standings models
│   └── ...
├── lib/
│   ├── api-client/   # API-Football HTTP client
│   ├── cache/        # LRU cache with TTL
│   ├── tools/        # MCP tool implementations
│   └── server/       # Server utilities
├── services/         # Business logic layer
├── cli/              # Command-line interfaces
└── config.ts         # Configuration management

tests/
├── unit/             # Unit tests
├── integration/      # Integration tests
├── contract/         # API contract tests
└── performance/      # Performance tests
```

### Testing

The project follows Test-Driven Development (TDD):

```bash
# Run all tests
pnpm test

# Run specific test categories
pnpm run test:unit
pnpm run test:integration
pnpm run test:contract
pnpm run test:performance

# Run tests in watch mode
pnpm run test:watch
```

### Code Quality

- **ESLint**: Standard style with no semicolons, 2-space indentation
- **TypeScript**: Strict mode enabled
- **Vitest**: Testing framework with coverage
- **Automatic formatting**: ESLint autofix on save in VS Code

## API Reference

### Data Models

#### Team
```typescript
interface Team {
  id: number
  name: string
  code: string
  country: string
  founded: number
  national: boolean
  logo: string
}
```

#### Player
```typescript
interface Player {
  id: number
  name: string
  firstname: string
  lastname: string
  age: number
  birth: {
    date: string
    place: string
    country: string
  }
  nationality: string
  height: string
  weight: string
  injured: boolean
  photo: string
}
```

#### Fixture
```typescript
interface Fixture {
  id: number
  referee: string
  timezone: string
  date: string
  timestamp: number
  periods: {
    first: number
    second: number
  }
  venue: {
    id: number
    name: string
    city: string
  }
  status: {
    long: string
    short: string
    elapsed: number
  }
}
```

## Rate Limiting

The API-Football service has rate limits. The server handles this automatically:

- **Reads rate limit headers** from API responses
- **Implements exponential backoff** when limits are hit
- **Queues requests** to respect rate limits
- **Caches responses** to minimize API calls

Rate limit status can be monitored via:
```bash
node dist/cli/api-client.js --endpoint rate-limit --format table
```

## Error Handling

The server provides comprehensive error handling:

- **MCP Error Codes**: Standard MCP error responses
- **API Failures**: Graceful handling of API errors
- **Cache Fallbacks**: Serve cached data when API is unavailable
- **Request Validation**: Parameter validation before API calls
- **Structured Logging**: Detailed error logging for debugging

## Performance

### Benchmarks

- **Cache hits**: < 10ms response time
- **Cache miss with API call**: < 200ms average
- **Concurrent requests**: Supports 100+ concurrent requests
- **Memory usage**: < 100MB typical usage

### Optimization Features

- **LRU Cache**: Automatic eviction of least-recently-used entries
- **Connection pooling**: Reuse HTTP connections
- **Compression**: Gzip compression for API responses
- **Batch operations**: Multiple requests with concurrency control

## Troubleshooting

### Common Issues

1. **API Key Invalid**
   ```
   Error: API key is required
   ```
   Solution: Set `API_FOOTBALL_KEY` environment variable

2. **Rate Limit Exceeded**
   ```
   Warn: Rate limit hit, waiting 30000ms
   ```
   Solution: Server automatically handles this, wait for reset

3. **Cache Performance**
   ```bash
   # Check cache statistics
   node dist/cli/cache.js stats --format table

   # Clear cache if needed
   node dist/cli/cache.js clear
   ```

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=debug
pnpm start
```

## Contributing

1. **Follow TDD**: Write tests before implementation
2. **Code Style**: Use ESLint standard configuration
3. **Type Safety**: Maintain strict TypeScript compliance
4. **Documentation**: Update README for new features
5. **Testing**: Ensure all tests pass before submitting

### Pull Request Process

1. Create feature branch from `main`
2. Write tests for new functionality
3. Implement features with TypeScript
4. Run full test suite: `pnpm test`
5. Check linting: `pnpm run lint`
6. Submit pull request with description

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Issues**: Report bugs via [GitHub Issues](https://github.com/MarvDann/api-football-mcp/issues)
- **API Reference**: [API-Football Documentation](https://www.api-football.com/documentation-v3)
- **MCP Protocol**: [Model Context Protocol Specification](https://modelcontextprotocol.io/)

---

Built with ❤️ using TypeScript, Node.js, and the Model Context Protocol.
- Rate Limiting for Agents
  - Use the `get_rate_limit` tool to inspect the current limit, remaining, and recommended wait time.
  - The server applies exponential backoff on 429 and tracks vendor headers. Tests space calls by ~3.5s.
  - Best practices for agents:
    - Batch related queries and cache where possible
    - Pace calls (>= 3.5s apart) during exploration
    - Handle 429 and retry after the suggested delay
    - Prefer season filters to reduce payload sizes
