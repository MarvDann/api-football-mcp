#!/bin/bash
set -e

echo "🧪 API-Football MCP Validation Suite"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

# Function to print section header
print_section() {
    echo -e "\n${BLUE}🔍 $1${NC}"
    echo "----------------------------------------"
}

# Track overall success
OVERALL_SUCCESS=0

# 1. TypeScript Type Checking
print_section "TypeScript Type Checking"
if pnpm check-types > /dev/null 2>&1; then
    TYPE_ERRORS=0
    print_status 0 "No TypeScript errors found"
else
    TYPE_ERRORS=$(pnpm check-types 2>&1 | grep -c "error TS" || echo "0")
    print_status 1 "Found $TYPE_ERRORS TypeScript errors"
    OVERALL_SUCCESS=1
fi

# 2. ESLint Code Quality
print_section "ESLint Code Quality"
if pnpm run lint:check > /dev/null 2>&1; then
    LINT_ERRORS=0
    print_status 0 "No linting errors found"
else
    LINT_ERRORS=$(pnpm run lint:check 2>&1 | grep -E "^✖ [0-9]+ problems" | head -1 | grep -o "[0-9]\+" || echo "0")
    print_status 1 "Found linting issues"
    OVERALL_SUCCESS=1
fi

# 3. Build Process
print_section "Build Process"
if pnpm run build > /dev/null 2>&1; then
    print_status 0 "Build successful"
else
    print_status 1 "Build failed"
    OVERALL_SUCCESS=1
fi

# 4. Unit Tests
print_section "Unit Tests"
if pnpm run test:unit --run > /dev/null 2>&1; then
    UNIT_TESTS=$(pnpm run test:unit --run --reporter=json 2>/dev/null | jq -r '.numPassedTests // 0' 2>/dev/null || echo "0")
    print_status 0 "Unit tests passed ($UNIT_TESTS tests)"
else
    print_status 1 "Unit tests failed"
    OVERALL_SUCCESS=1
fi

# 5. Integration Tests
print_section "Integration Tests"
if pnpm run test:integration --run > /dev/null 2>&1; then
    INTEGRATION_TESTS=$(pnpm run test:integration --run --reporter=json 2>/dev/null | jq -r '.numPassedTests // 0' 2>/dev/null || echo "0")
    print_status 0 "Integration tests passed ($INTEGRATION_TESTS tests)"
else
    print_status 1 "Integration tests failed"
    OVERALL_SUCCESS=1
fi

# 6. Contract Tests
print_section "Contract Tests"
if pnpm run test:contract --run > /dev/null 2>&1; then
    CONTRACT_TESTS=$(pnpm run test:contract --run --reporter=json 2>/dev/null | jq -r '.numPassedTests // 0' 2>/dev/null || echo "0")
    print_status 0 "Contract tests passed ($CONTRACT_TESTS tests)"
else
    print_status 1 "Contract tests failed"
    OVERALL_SUCCESS=1
fi

# 7. Performance Tests
print_section "Performance Tests"
if pnpm run test:performance --run > /dev/null 2>&1; then
    PERF_TESTS=$(pnpm run test:performance --run --reporter=json 2>/dev/null | jq -r '.numPassedTests // 0' 2>/dev/null || echo "0")
    print_status 0 "Performance tests passed ($PERF_TESTS tests)"
else
    print_status 1 "Performance tests failed"
    OVERALL_SUCCESS=1
fi

# Summary
echo ""
print_section "Validation Summary"
if [ $OVERALL_SUCCESS -eq 0 ]; then
    echo -e "${GREEN}🎉 All validations passed!${NC}"
    echo -e "${GREEN}✅ TypeScript: Clean${NC}"
    echo -e "${GREEN}✅ ESLint: Clean${NC}"
    echo -e "${GREEN}✅ Build: Success${NC}"
    echo -e "${GREEN}✅ Tests: All passing${NC}"
else
    echo -e "${YELLOW}⚠️  Some validations need attention:${NC}"
    [ $TYPE_ERRORS -gt 0 ] && echo -e "${RED}  - TypeScript: $TYPE_ERRORS errors${NC}"
    [ -n "$LINT_ERRORS" ] && [ "$LINT_ERRORS" != "0" ] && echo -e "${RED}  - ESLint: Issues found${NC}"
    echo -e "\n${BLUE}💡 Run individual commands for details:${NC}"
    echo "  pnpm check-types     # TypeScript errors"
    echo "  pnpm run lint:check  # Linting issues"
    echo "  pnpm test            # All tests"
fi

echo ""
exit $OVERALL_SUCCESS