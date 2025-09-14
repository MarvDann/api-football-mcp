# Quickstart Guide

## Prerequisites

1. Node.js 22+ installed
2. API-Football API key (get from https://www.api-football.com/)
3. MCP-compatible client (Claude Desktop, Continue.dev, etc.)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd api-football-mcp

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### 1. Set API Key

```bash
# Linux/Mac
export API_FOOTBALL_KEY="your-api-key-here"

# Windows
set API_FOOTBALL_KEY=your-api-key-here
```

### 2. Configure MCP Client

#### For Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "api-football": {
      "command": "node",
      "args": ["dist/index.js"],
      "env": {
        "API_FOOTBALL_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Basic Usage Examples

### Get Current Standings

```typescript
// Tool: get_standings
// Input:
{
  "season": 2024  // Optional, defaults to current season
}

// Expected output: Current Premier League table with all 20 teams
```

### Find Team Information

```typescript
// Tool: get_team
// Input:
{
  "name": "Manchester United",
  "season": 2024
}

// Expected output: Team details and current squad
```

### Get Today's Fixtures

```typescript
// Tool: get_fixtures
// Input:
{
  "from": "2024-01-14",
  "to": "2024-01-14"
}

// Expected output: All Premier League matches for the date
```

### Search for a Player

```typescript
// Tool: search_players
// Input:
{
  "query": "Haaland",
  "season": 2024
}

// Expected output: Player profile and current season statistics
```

### Get Live Matches

```typescript
// Tool: get_live_matches
// Input: {}

// Expected output: All currently in-progress Premier League matches
```

### Get Match Events

```typescript
// Tool: get_match_events
// Input:
{
  "fixtureId": 123456  // Get from fixtures response
}

// Expected output: Goals, cards, substitutions for the match
```

## Testing the Installation

Run the test suite to verify everything is working:

```bash
# Run all tests
npm test

# Run contract tests only
npm run test:contract

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

## CLI Usage

Each library module has its own CLI interface:

```bash
# API Client CLI
npm run cli:api -- standings --season 2024

# Cache CLI
npm run cli:cache -- status
npm run cli:cache -- clear

# Tools CLI (for testing MCP tools)
npm run cli:tools -- get_standings --season 2024

# Server CLI (starts MCP server)
npm run cli:server -- --help
```

## Troubleshooting

### API Key Issues

```bash
# Verify API key is set
echo $API_FOOTBALL_KEY

# Test API connection
npm run cli:api -- test
```

### Rate Limiting

The server automatically handles rate limits by:
1. Reading X-RateLimit headers
2. Implementing exponential backoff
3. Caching historical data
4. Returning cached data when rate limited

### Cache Management

```bash
# View cache statistics
npm run cli:cache -- stats

# Clear specific cache type
npm run cli:cache -- clear --type fixtures

# Clear all cache
npm run cli:cache -- clear --all
```

## Performance Validation

### Expected Response Times

- Cached data: < 10ms
- Fresh API call: < 2s
- With rate limit retry: < 5s

### Load Testing

```bash
# Run performance tests
npm run test:performance

# Expected results:
# - 100 concurrent requests: < 5s total
# - Memory usage: < 200MB
# - Cache hit ratio: > 80% for historical data
```

## Common Use Cases

### 1. Get standings for a specific date in history

```typescript
// Get final standings for 2019-20 season
{
  "tool": "get_standings",
  "arguments": {
    "season": 2019
  }
}
```

### 2. Find all matches for a team

```typescript
// Get all Man City fixtures this season
{
  "tool": "get_fixtures",
  "arguments": {
    "teamId": 50,  // Man City's ID
    "season": 2024
  }
}
```

### 3. Compare player statistics

```typescript
// Get stats for multiple players
[
  {
    "tool": "get_player",
    "arguments": {"name": "Erling Haaland", "season": 2024}
  },
  {
    "tool": "get_player",
    "arguments": {"name": "Mohamed Salah", "season": 2024}
  }
]
```

## Acceptance Test Scenarios

Based on the specification, verify these scenarios work:

1. ✅ **League Standings**: Query 2024 season standings, verify 20 teams with points/goals
2. ✅ **Player Search**: Search "Kane", get Bayern Munich player with stats
3. ✅ **Fixtures Range**: Get fixtures from Jan 1-7, 2024, verify match details
4. ✅ **Live Matches**: During match day, get real-time scores and events
5. ✅ **Team Squad**: Get "Arsenal" team, verify squad list with player positions
6. ✅ **Historical Data**: Get 1992-93 season standings (first Premier League season)
7. ✅ **Error Handling**: Query invalid team name, get helpful error message
8. ✅ **Rate Limiting**: Make 100 rapid requests, verify graceful handling
9. ✅ **Cache Performance**: Repeat same query, verify < 10ms response
10. ✅ **Match Events**: Get events for completed match, verify goals/cards/subs

## Next Steps

1. Review the [API Documentation](contracts/mcp-tools.json)
2. Check [Data Model](data-model.md) for entity details
3. Read [Research](research.md) for technical decisions
4. Follow [Tasks](tasks.md) for implementation progress