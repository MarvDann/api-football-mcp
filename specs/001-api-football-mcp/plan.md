# Implementation Plan: API-Football MCP Server


**Branch**: `001-api-football-mcp` | **Date**: 2025-01-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-api-football-mcp/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
5. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, or `GEMINI.md` for Gemini CLI).
6. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
8. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Build an MCP server for API-Football that provides comprehensive access to English Premier League data (1992-present) including teams, players, fixtures, standings, and match events. The server will implement the Model Context Protocol using TypeScript, enabling AI agents to query football data through standardized tools and resources.

## Technical Context
**Language/Version**: TypeScript 5+ with Node.js 22+
**Primary Dependencies**: @modelcontextprotocol/sdk, API-Football v3 API
**Storage**: In-memory cache for historic data, no persistent database
**Testing**: Vitest with TDD workflow
**Target Platform**: Node.js server running as MCP provider via stdio
**Project Type**: single - MCP server implementation
**Performance Goals**: Response time < 5 seconds per query, handle rate limits from API
**Constraints**: Respect API-Football rate limits (returned in headers), API key via API_FOOTBALL_KEY env var
**Scale/Scope**: Support all EPL data from 1992-present, ~30 teams, ~1000 players per season
**Linting/Formatting**: ESLint with 'standard' style configuration, flat ESLint v9 style config, ESLint stylistic for formatting rules, no semi colons, 2 space indentation. Auto fix on save using VSCode settings (codeActionsOnSave) using official ESLint Extension

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity**:
- Projects: 1 (single MCP server project with tests)
- Using framework directly? ✅ (direct use of @modelcontextprotocol/sdk)
- Single data model? ✅ (unified data model for football entities)
- Avoiding patterns? ✅ (no unnecessary abstractions)

**Architecture**:
- EVERY feature as library? ✅ (planned modular libraries)
- Libraries listed:
  - api-client: API-Football HTTP client with rate limiting
  - cache: In-memory caching for historic data
  - tools: MCP tools for data queries
  - server: MCP server implementation
- CLI per library: ✅ (each library will have CLI interface)
- Library docs: llms.txt format planned? ✅

**Testing (NON-NEGOTIABLE)**:
- RED-GREEN-Refactor cycle enforced? ✅ (TDD workflow specified)
- Git commits show tests before implementation? ✅
- Order: Contract→Integration→E2E→Unit strictly followed? ✅
- Real dependencies used? ✅ (actual API calls with test API key)
- Integration tests for: new libraries, contract changes, shared schemas? ✅
- FORBIDDEN: Implementation before test, skipping RED phase ✅

**Observability**:
- Structured logging included? ✅
- Frontend logs → backend? N/A (no frontend)
- Error context sufficient? ✅

**Versioning**:
- Version number assigned? ✅ (1.0.0)
- BUILD increments on every change? ✅
- Breaking changes handled? ✅ (MCP protocol versioning)

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 1 (Single project - MCP server)

## Phase 0: Outline & Research
1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:
   ```
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Generate contract tests** from contracts:
   - One test file per endpoint
   - Assert request/response schemas
   - Tests must fail (no implementation yet)

4. **Extract test scenarios** from user stories:
   - Each story → integration test scenario
   - Quickstart test = story validation steps

5. **Update agent file incrementally** (O(1) operation):
   - Run `/scripts/bash/update-agent-context.sh claude` for your AI assistant
   - If exists: Add only NEW tech from current plan
   - Preserve manual additions between markers
   - Update recent changes (keep last 3)
   - Keep under 150 lines for token efficiency
   - Output to repository root

**Output**: data-model.md, /contracts/*, failing tests, quickstart.md, agent-specific file

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each MCP tool (8 tools) → contract test task [P]
- Each entity (8 entities) → model creation task [P]
- API client library with rate limiting
- Cache implementation with TTL
- MCP server setup and tool registration
- Integration tests for each acceptance scenario

**Ordering Strategy**:
- TDD order: Tests before implementation
- Dependency order: Models → API Client → Cache → Tools → Server
- Mark [P] for parallel execution (independent files)
- Group by library: api-client, cache, tools, server

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**Task Categories**:
1. Setup & Configuration (package.json, tsconfig, eslint)
2. Model Definitions (TypeScript interfaces)
3. Contract Tests (8 MCP tools)
4. API Client Library (with CLI)
5. Cache Library (with CLI)
6. Tool Implementations (8 tools)
7. MCP Server Setup
8. Integration Tests
9. Performance Tests
10. Documentation Updates

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*