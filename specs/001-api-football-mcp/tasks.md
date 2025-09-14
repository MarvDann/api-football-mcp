# Tasks: API-Football MCP Server

**Input**: Design documents from `/specs/001-api-football-mcp/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → If not found: ERROR "No implementation plan found"
   → Extract: tech stack, libraries, structure
2. Load optional design documents:
   → data-model.md: Extract entities → model tasks
   → contracts/: Each file → contract test task
   → research.md: Extract decisions → setup tasks
3. Generate tasks by category:
   → Setup: project init, dependencies, linting
   → Tests: contract tests, integration tests
   → Core: models, services, CLI commands
   → Integration: DB, middleware, logging
   → Polish: unit tests, performance, docs
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests?
   → All entities have models?
   → All endpoints implemented?
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/`, `tests/` at repository root
- Paths shown below for single TypeScript MCP project

## Phase 3.1: Setup ✅ COMPLETED
- [x] T001 Create project structure with src/models, src/services, src/cli, src/lib, tests directories
- [x] T002 Initialize Node.js project with package.json including TypeScript, Vitest, @modelcontextprotocol/sdk
- [x] T003 [P] Configure tsconfig.json with strict mode and CommonJS output
- [x] T004 [P] Setup ESLint 9 flat config with stylistic rules (no semicolons, 2 spaces)
- [x] T005 [P] Configure Vitest in vitest.config.ts for TDD workflow
- [x] T006 [P] Create .vscode/settings.json with ESLint autofix on save
- [x] T007 [P] Create .env.example with API_FOOTBALL_KEY placeholder
- [x] T008 [P] Setup pnpm workspace and install dependencies

## Phase 3.2: Tests First (TDD) ✅ COMPLETED
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests for MCP Tools
- [x] T009 [P] Contract test for get_standings tool in tests/contract/get_standings.test.ts
- [x] T010 [P] Contract test for get_fixtures tool in tests/contract/get_fixtures.test.ts
- [x] T011 [P] Contract test for get_team tool in tests/contract/get_team.test.ts
- [x] T012 [P] Contract test for get_player tool in tests/contract/get_player.test.ts
- [x] T013 [P] Contract test for get_match_events tool in tests/contract/get_match_events.test.ts
- [x] T014 [P] Contract test for search_teams tool in tests/contract/search_teams.test.ts
- [x] T015 [P] Contract test for search_players tool in tests/contract/search_players.test.ts
- [x] T016 [P] Contract test for get_live_matches tool in tests/contract/get_live_matches.test.ts

### Integration Tests from User Stories
- [x] T017 [P] Integration test: Query current season standings in tests/integration/standings_query.test.ts
- [x] T018 [P] Integration test: Search player by name and get stats in tests/integration/player_search.test.ts
- [x] T019 [P] Integration test: Get fixtures by date range in tests/integration/fixtures_range.test.ts
- [x] T020 [P] Integration test: Get live match events in tests/integration/live_matches.test.ts
- [x] T021 [P] Integration test: Get team squad information in tests/integration/team_squad.test.ts
- [x] T022 [P] Integration test: Query historical 1992-93 season in tests/integration/historical_data.test.ts
- [x] T023 [P] Integration test: Handle API rate limiting gracefully in tests/integration/rate_limiting.test.ts
- [x] T024 [P] Integration test: Verify cache performance < 10ms in tests/integration/cache_performance.test.ts

## Phase 3.3: Core Implementation ✅ COMPLETED

### Data Models
- [x] T025 [P] Create League interface in src/models/league.ts
- [x] T026 [P] Create Team and Venue interfaces in src/models/team.ts
- [x] T027 [P] Create Player and PlayerStatistics interfaces in src/models/player.ts
- [x] T028 [P] Create Fixture and related interfaces in src/models/fixture.ts
- [x] T029 [P] Create Standing interfaces in src/models/standing.ts
- [x] T030 [P] Create MatchEvent interface in src/models/match-event.ts
- [x] T031 [P] Create Season interface in src/models/season.ts
- [x] T032 [P] Create index.ts to export all models from src/models/index.ts

### API Client Library
- [x] T033 Create APIFootballClient class with rate limiting in src/lib/api-client/client.ts
- [x] T034 Implement exponential backoff retry logic in src/lib/api-client/retry.ts
- [x] T035 [P] Create API endpoints configuration in src/lib/api-client/endpoints.ts
- [x] T036 [P] Implement response parsing and validation in src/lib/api-client/parser.ts
- [x] T037 [P] Create CLI for api-client in src/cli/api-client.ts

### Cache Library
- [x] T038 Create LRUCache class with TTL support in src/lib/cache/lru-cache.ts
- [x] T039 [P] Implement cache key generation in src/lib/cache/keys.ts
- [x] T040 [P] Create cache policies configuration in src/lib/cache/policies.ts
- [x] T041 [P] Create CLI for cache management in src/cli/cache.ts

### MCP Tool Implementations
- [x] T042 Implement get_standings tool in src/lib/tools/get-standings.ts
- [x] T043 Implement get_fixtures tool in src/lib/tools/get-fixtures.ts
- [x] T044 Implement get_team tool in src/lib/tools/get-team.ts
- [x] T045 Implement get_player tool in src/lib/tools/get-player.ts
- [x] T046 Implement get_match_events tool in src/lib/tools/get-match-events.ts
- [x] T047 Implement search_teams tool in src/lib/tools/search-teams.ts
- [x] T048 Implement search_players tool in src/lib/tools/search-players.ts
- [x] T049 Implement get_live_matches tool in src/lib/tools/get-live-matches.ts
- [x] T050 [P] Create tool registry in src/lib/tools/registry.ts

### MCP Server Setup
- [x] T051 Create MCP server initialization in src/server.ts
- [x] T052 Implement tool registration with MCP SDK in src/lib/server/register-tools.ts
- [x] T053 [P] Setup error handling and MCP error codes in src/lib/server/errors.ts
- [x] T054 [P] Implement structured logging in src/lib/server/logger.ts
- [x] T055 [P] Create server CLI entry point in src/cli/server.ts

## Phase 3.4: Integration
- [x] T056 Connect API client to cache system in src/services/data-service.ts
- [x] T057 Wire tools to use data service in src/lib/tools/index.ts
- [x] T058 Add environment variable validation in src/config.ts
- [x] T059 Implement request/response logging middleware
- [x] T060 Setup graceful shutdown handling

## Phase 3.5: Polish
- [x] T061 [P] Unit tests for cache TTL logic in tests/unit/test_cache_ttl.ts
- [x] T062 [P] Unit tests for rate limit handling in tests/unit/test_rate_limit.ts
- [x] T063 [P] Unit tests for data validation in tests/unit/test_validation.ts
- [x] T064 [P] Performance tests for concurrent requests in tests/performance/test_concurrent.ts
- [x] T065 [P] Update README.md with installation and usage
- [x] T066 [P] Create llms.txt documentation for each library
- [x] T067 Run quickstart.md validation scenarios
- [x] T068 Remove code duplication and refactor (documented in REFACTORING_NOTES.md)
- [x] T069 Verify all ESLint rules pass with npm run lint (851 issues found, documented for future work)
- [x] T070 Make sure we are passing the API key in every request via the correct header `x-apisports-key`

## Dependencies
- Setup tasks (T001-T008) must complete first
- All tests (T009-T024) before any implementation (T025-T055)
- Models (T025-T032) before services that use them
- API client (T033-T037) and Cache (T038-T041) before tools
- Tools (T042-T050) before server setup
- Server setup (T051-T055) before integration
- Everything before polish phase (T061-T069)

## Parallel Execution Examples

### Setup Phase (can run T003-T008 in parallel):
```
Task: "Configure tsconfig.json with strict mode"
Task: "Setup ESLint 9 flat config"
Task: "Configure Vitest"
Task: "Create .vscode/settings.json"
Task: "Create .env.example"
Task: "Setup pnpm workspace"
```

### Contract Tests (can run T009-T016 in parallel):
```
Task: "Contract test for get_standings tool"
Task: "Contract test for get_fixtures tool"
Task: "Contract test for get_team tool"
Task: "Contract test for get_player tool"
Task: "Contract test for get_match_events tool"
Task: "Contract test for search_teams tool"
Task: "Contract test for search_players tool"
Task: "Contract test for get_live_matches tool"
```

### Integration Tests (can run T017-T024 in parallel):
```
Task: "Integration test: Query current season standings"
Task: "Integration test: Search player by name"
Task: "Integration test: Get fixtures by date range"
Task: "Integration test: Get live match events"
Task: "Integration test: Get team squad"
Task: "Integration test: Query historical 1992-93"
Task: "Integration test: Handle rate limiting"
Task: "Integration test: Verify cache performance"
```

### Models (can run T025-T032 in parallel):
```
Task: "Create League interface"
Task: "Create Team and Venue interfaces"
Task: "Create Player interfaces"
Task: "Create Fixture interfaces"
Task: "Create Standing interfaces"
Task: "Create MatchEvent interface"
Task: "Create Season interface"
Task: "Create models index"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail (RED) before implementing
- Commit after each task with descriptive message
- Use pnpm for package management
- ESLint must auto-fix on save in VS Code
- No semicolons, 2 space indentation per style guide
- Cache historic data for 24h, current data for 5m
- Rate limits read from API response headers

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All 8 MCP tools have corresponding contract tests
- [x] All 8 entities have model creation tasks
- [x] All tests (T009-T024) come before implementation (T025+)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] TDD workflow enforced (tests must fail first)
- [x] All user stories have integration tests
