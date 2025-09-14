# Refactoring Notes

## Overview
This document outlines key refactoring opportunities identified in the codebase. ESLint analysis found 851 issues that need systematic attention.

## Major Refactoring Areas

### 1. Console Logging → Structured Logging
**Issue**: 105+ console.log/error/warn statements across 17 files
**Solution**: Replace with structured logger from `src/lib/server/logger.ts`
**Files affected**:
- All CLI tools (`src/cli/*.ts`)
- All MCP tools (`src/lib/tools/*.ts`)
- Server components (`src/server.ts`, `src/lib/server/*.ts`)

**Example refactor**:
```typescript
// Before
console.log('Starting server...')
console.error('Error:', error)

// After
logger.info('Starting server...')
logger.error('Operation failed', error)
```

### 2. Type Safety Issues
**Issue**: 644 TypeScript strict mode errors
**Primary issues**:
- `any` types used extensively (207 warnings)
- Unsafe type assertions and assignments
- Missing null checks and optional chaining

**Solution**:
- Define proper interfaces for API responses
- Use type guards for runtime validation
- Replace `any` with specific union types
- Add proper error handling for undefined values

### 3. Duplicate Error Handling Patterns
**Issue**: Similar try-catch blocks across MCP tools
**Current pattern**:
```typescript
try {
  // tool logic
} catch (error) {
  console.error('Error in tool:', error)
  return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }
}
```

**Solution**: Create error handling middleware/utilities
```typescript
// Proposed utility
export function withToolErrorHandling(toolName: string, operation: () => Promise<CallToolResult>): Promise<CallToolResult> {
  return operation().catch(error => {
    logger.error(`Tool ${toolName} failed`, error)
    return standardErrorResponse(error)
  })
}
```

### 4. API Client Response Parsing
**Issue**: Duplicated response parsing logic
**Files**: All MCP tools parse API responses similarly

**Solution**:
- Centralize in `src/lib/api-client/parser.ts`
- Create typed response interfaces
- Add response validation utilities

### 5. Cache Key Generation
**Issue**: Manual cache key construction in multiple places
**Solution**: Already partially addressed with `generateCacheKey()` utility, but usage should be standardized

### 6. Configuration Management
**Issue**: Environment variable access scattered throughout codebase
**Solution**: Centralize through `src/config.ts` (already implemented but not fully adopted)

### 7. Tool Registration Boilerplate
**Issue**: Similar tool registration patterns
**Solution**: Use factory pattern or decorators for tool creation

## Implementation Priority

### High Priority (Core Functionality)
1. **Type Safety Fixes** - Critical for production reliability
2. **Error Handling Standardization** - Improves debugging and user experience
3. **Console → Structured Logging** - Essential for production monitoring

### Medium Priority (Developer Experience)
4. **API Response Parsing** - Reduces code duplication
5. **Configuration Centralization** - Improves maintainability

### Low Priority (Code Quality)
6. **Cache Key Standardization** - Already working, cosmetic improvements
7. **Tool Registration Patterns** - Working as-is, would improve consistency

## Suggested Approach

### Phase 1: Critical Fixes
1. Run ESLint with `--fix` to auto-resolve formatting issues
2. Address top 10 most critical TypeScript errors
3. Replace console statements in core server components with logger

### Phase 2: Systematic Improvements
1. Create error handling utilities
2. Standardize API response parsing
3. Update all tools to use centralized patterns

### Phase 3: Polish
1. Address remaining TypeScript strict mode issues
2. Optimize imports and exports
3. Clean up unused code

## Tools and Commands

```bash
# Analyze TypeScript issues
npx tsc --noEmit --strict

# Fix auto-fixable ESLint issues
pnpm run lint

# Find specific patterns
rg "console\." --type ts
rg "any\[\]" --type ts
rg "catch.*error" --type ts
```

## Estimated Effort
- **Phase 1**: 8-12 hours (critical fixes)
- **Phase 2**: 16-24 hours (systematic refactoring)
- **Phase 3**: 8-16 hours (polish and optimization)
- **Total**: 32-52 hours for complete refactoring

## Breaking Changes Risk
Most refactoring is internal and should not affect external API contracts. MCP tool interfaces and CLI commands should remain stable.

## Testing Strategy
- Run full test suite after each phase
- Verify MCP tool contracts remain unchanged
- Test CLI interfaces for backward compatibility
- Performance testing to ensure no regression

---

*This document should be updated as refactoring progresses and new patterns emerge.*