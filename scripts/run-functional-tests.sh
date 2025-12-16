#!/bin/bash
# =============================================================================
# RMGaaS Functional Test Execution Script
# =============================================================================
# This script performs REAL functional tests against the running API
# =============================================================================

set -e

API_URL="http://localhost:4000"
RESULTS_FILE="/tmp/test-results.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
TOTAL=0

# Initialize results file
echo "RMGaaS Functional Test Results" > $RESULTS_FILE
echo "==============================" >> $RESULTS_FILE
echo "Date: $(date)" >> $RESULTS_FILE
echo "" >> $RESULTS_FILE

log_test() {
    ((TOTAL++))
    echo -e "${BLUE}[TEST $TOTAL]${NC} $1"
}

log_pass() {
    ((PASS++))
    echo -e "${GREEN}  ✓ PASS${NC}: $1"
    echo "[PASS] $1" >> $RESULTS_FILE
}

log_fail() {
    ((FAIL++))
    echo -e "${RED}  ✗ FAIL${NC}: $1"
    echo "[FAIL] $1" >> $RESULTS_FILE
}

log_info() {
    echo -e "${YELLOW}  INFO${NC}: $1"
}

# =============================================================================
echo ""
echo "=========================================="
echo "  RMGaaS Functional Test Execution"
echo "=========================================="
echo ""

# =============================================================================
# 1. AUTHENTICATION TESTS
# =============================================================================
echo ""
echo "1. AUTHENTICATION TESTS"
echo "------------------------"

# Test 1.1: Health Check
log_test "Health endpoint should return healthy status"
HEALTH=$(curl -s $API_URL/health)
if echo "$HEALTH" | grep -q '"status":"healthy"'; then
    log_pass "Health endpoint returns healthy"
else
    log_fail "Health endpoint not healthy: $HEALTH"
fi

# Test 1.2: Login with valid credentials
log_test "Login with valid credentials"
LOGIN_RESP=$(curl -s -X POST $API_URL/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@newvision.in","password":"Password123!@#"}')

if echo "$LOGIN_RESP" | grep -q '"accessToken"'; then
    TOKEN=$(echo "$LOGIN_RESP" | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')
    log_pass "Login successful, token received"
else
    log_fail "Login failed: $LOGIN_RESP"
    echo "Cannot continue without token"
    exit 1
fi

# Test 1.3: Login with invalid email
log_test "Login with invalid email should fail"
INVALID_EMAIL=$(curl -s -X POST $API_URL/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"nonexistent@example.com","password":"Password123!@#"}')

if echo "$INVALID_EMAIL" | grep -q '"error"'; then
    log_pass "Invalid email correctly rejected"
else
    log_fail "Invalid email not rejected: $INVALID_EMAIL"
fi

# Test 1.4: Login with invalid password
log_test "Login with invalid password should fail"
INVALID_PASS=$(curl -s -X POST $API_URL/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@newvision.in","password":"wrongpassword"}')

if echo "$INVALID_PASS" | grep -q '"error"'; then
    log_pass "Invalid password correctly rejected"
else
    log_fail "Invalid password not rejected: $INVALID_PASS"
fi

# Test 1.5: Login with empty password
log_test "Login with empty password should fail"
EMPTY_PASS=$(curl -s -X POST $API_URL/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@newvision.in","password":""}')

if echo "$EMPTY_PASS" | grep -q -E '"error"|"issues"'; then
    log_pass "Empty password correctly rejected"
else
    log_fail "Empty password not rejected: $EMPTY_PASS"
fi

# Test 1.6: Access protected endpoint without token
log_test "Protected endpoint without token should return 401"
NO_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/v1/resources)

if [ "$NO_TOKEN" = "401" ]; then
    log_pass "Unauthorized request correctly rejected (401)"
else
    log_fail "Expected 401, got: $NO_TOKEN"
fi

# Test 1.7: Access protected endpoint with invalid token
log_test "Protected endpoint with invalid token should return 401"
INVALID_TOKEN=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/api/v1/resources \
    -H "Authorization: Bearer invalidtoken123")

if [ "$INVALID_TOKEN" = "401" ]; then
    log_pass "Invalid token correctly rejected (401)"
else
    log_fail "Expected 401, got: $INVALID_TOKEN"
fi

# Test 1.8: Get current user with valid token
log_test "Get current user with valid token"
ME_RESP=$(curl -s $API_URL/api/v1/auth/me \
    -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESP" | grep -q '"user"'; then
    log_pass "Current user retrieved successfully"
else
    log_fail "Failed to get current user: $ME_RESP"
fi

# =============================================================================
# 2. RESOURCE CRUD TESTS
# =============================================================================
echo ""
echo "2. RESOURCE CRUD TESTS"
echo "----------------------"

# Test 2.1: List resources
log_test "List resources"
RESOURCES=$(curl -s "$API_URL/api/v1/resources?limit=5" \
    -H "Authorization: Bearer $TOKEN")

if echo "$RESOURCES" | grep -q '"data"'; then
    RESOURCE_COUNT=$(echo "$RESOURCES" | grep -o '"id"' | wc -l)
    log_pass "Resources listed: $RESOURCE_COUNT found"
else
    log_fail "Failed to list resources: $RESOURCES"
fi

# Test 2.2: List resources with pagination
log_test "List resources with pagination (page=1, limit=2)"
PAGE1=$(curl -s "$API_URL/api/v1/resources?page=1&limit=2" \
    -H "Authorization: Bearer $TOKEN")

if echo "$PAGE1" | grep -q '"pagination"'; then
    log_pass "Pagination working"
else
    log_fail "Pagination not working: $PAGE1"
fi

# Test 2.3: List resources with filter
log_test "List resources with status filter (ACTIVE)"
FILTERED=$(curl -s "$API_URL/api/v1/resources?status=ACTIVE&limit=5" \
    -H "Authorization: Bearer $TOKEN")

if echo "$FILTERED" | grep -q '"data"'; then
    log_pass "Status filter working"
else
    log_fail "Status filter failed: $FILTERED"
fi

# Test 2.4: Get single resource (if any exist)
log_test "Get single resource by ID"
FIRST_ID=$(echo "$RESOURCES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$FIRST_ID" ]; then
    SINGLE=$(curl -s "$API_URL/api/v1/resources/$FIRST_ID" \
        -H "Authorization: Bearer $TOKEN")
    if echo "$SINGLE" | grep -q '"employeeId"'; then
        log_pass "Single resource retrieved"
    else
        log_fail "Failed to get single resource: $SINGLE"
    fi
else
    log_info "No resources to test single get"
fi

# Test 2.5: Get non-existent resource
log_test "Get non-existent resource should return 404"
NONEXIST=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_URL/api/v1/resources/00000000-0000-0000-0000-000000000000" \
    -H "Authorization: Bearer $TOKEN")

if [ "$NONEXIST" = "404" ]; then
    log_pass "Non-existent resource returns 404"
else
    log_fail "Expected 404, got: $NONEXIST"
fi

# Test 2.6: Invalid UUID format
log_test "Invalid UUID format should return 400"
INVALID_UUID=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_URL/api/v1/resources/not-a-uuid" \
    -H "Authorization: Bearer $TOKEN")

if [ "$INVALID_UUID" = "400" ] || [ "$INVALID_UUID" = "404" ]; then
    log_pass "Invalid UUID handled correctly ($INVALID_UUID)"
else
    log_fail "Expected 400/404, got: $INVALID_UUID"
fi

# =============================================================================
# 3. PROJECT TESTS
# =============================================================================
echo ""
echo "3. PROJECT TESTS"
echo "----------------"

# Test 3.1: List projects
log_test "List projects"
PROJECTS=$(curl -s "$API_URL/api/v1/projects?limit=5" \
    -H "Authorization: Bearer $TOKEN")

if echo "$PROJECTS" | grep -q '"data"'; then
    PROJECT_COUNT=$(echo "$PROJECTS" | grep -o '"id"' | wc -l)
    log_pass "Projects listed: $PROJECT_COUNT found"
else
    log_fail "Failed to list projects: $PROJECTS"
fi

# Test 3.2: Filter projects by status
log_test "Filter projects by status (ACTIVE)"
ACTIVE_PROJ=$(curl -s "$API_URL/api/v1/projects?status=ACTIVE&limit=5" \
    -H "Authorization: Bearer $TOKEN")

if echo "$ACTIVE_PROJ" | grep -q '"data"'; then
    log_pass "Project status filter working"
else
    log_fail "Project status filter failed"
fi

# =============================================================================
# 4. ALLOCATION TESTS
# =============================================================================
echo ""
echo "4. ALLOCATION TESTS"
echo "-------------------"

# Test 4.1: List allocations
log_test "List allocations"
ALLOCATIONS=$(curl -s "$API_URL/api/v1/allocations?limit=5" \
    -H "Authorization: Bearer $TOKEN")

if echo "$ALLOCATIONS" | grep -q '"data"'; then
    ALLOC_COUNT=$(echo "$ALLOCATIONS" | grep -o '"id"' | wc -l)
    log_pass "Allocations listed: $ALLOC_COUNT found"
else
    log_fail "Failed to list allocations: $ALLOCATIONS"
fi

# =============================================================================
# 5. DASHBOARD TESTS
# =============================================================================
echo ""
echo "5. DASHBOARD TESTS"
echo "------------------"

# Test 5.1: Get dashboard metrics
log_test "Get dashboard metrics"
DASHBOARD=$(curl -s "$API_URL/api/v1/dashboard/metrics" \
    -H "Authorization: Bearer $TOKEN")

if echo "$DASHBOARD" | grep -q -E '"totalResources"|"resources"'; then
    log_pass "Dashboard metrics retrieved"
else
    log_fail "Failed to get dashboard metrics: $DASHBOARD"
fi

# =============================================================================
# 6. SECURITY TESTS
# =============================================================================
echo ""
echo "6. SECURITY TESTS"
echo "-----------------"

# Test 6.1: SQL Injection in login email
log_test "SQL Injection in login email should be blocked"
SQL_INJ=$(curl -s -X POST $API_URL/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com'\'' OR '\''1'\''='\''1","password":"test"}')

if echo "$SQL_INJ" | grep -q '"error"'; then
    log_pass "SQL injection in email blocked"
else
    log_fail "SQL injection may not be blocked: $SQL_INJ"
fi

# Test 6.2: SQL Injection in search
log_test "SQL Injection in search should be blocked"
SQL_SEARCH=$(curl -s "$API_URL/api/v1/resources?search='; DROP TABLE resources;--" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SQL_SEARCH" | grep -q '"data"'; then
    log_pass "SQL injection in search blocked (query still works)"
else
    log_fail "SQL injection in search issue: $SQL_SEARCH"
fi

# Test 6.3: XSS in input
log_test "XSS input should be handled"
XSS_INPUT=$(curl -s "$API_URL/api/v1/resources?search=<script>alert('xss')</script>" \
    -H "Authorization: Bearer $TOKEN")

if echo "$XSS_INPUT" | grep -q '"data"'; then
    log_pass "XSS input handled safely"
else
    log_fail "XSS input issue: $XSS_INPUT"
fi

# Test 6.4: Very long input
log_test "Very long input should be handled"
LONG_INPUT=$(printf 'A%.0s' {1..10000})
LONG_RESP=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_URL/api/v1/resources?search=$LONG_INPUT" \
    -H "Authorization: Bearer $TOKEN")

if [ "$LONG_RESP" = "200" ] || [ "$LONG_RESP" = "400" ] || [ "$LONG_RESP" = "414" ]; then
    log_pass "Long input handled ($LONG_RESP)"
else
    log_fail "Long input issue: $LONG_RESP"
fi

# Test 6.5: Negative page number
log_test "Negative page number should be handled"
NEG_PAGE=$(curl -s "$API_URL/api/v1/resources?page=-1" \
    -H "Authorization: Bearer $TOKEN")

if echo "$NEG_PAGE" | grep -q '"data"'; then
    log_pass "Negative page handled (defaults to valid page)"
else
    log_fail "Negative page issue: $NEG_PAGE"
fi

# Test 6.6: Invalid JSON body
log_test "Invalid JSON body should return 400"
INVALID_JSON=$(curl -s -o /dev/null -w "%{http_code}" -X POST $API_URL/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d 'not valid json')

if [ "$INVALID_JSON" = "400" ]; then
    log_pass "Invalid JSON correctly rejected (400)"
else
    log_fail "Expected 400, got: $INVALID_JSON"
fi

# =============================================================================
# 7. EXPORT TESTS
# =============================================================================
echo ""
echo "7. EXPORT TESTS"
echo "---------------"

# Test 7.1: Export resources as CSV
log_test "Export resources as CSV"
EXPORT_CSV=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_URL/api/v1/export/resources?format=csv" \
    -H "Authorization: Bearer $TOKEN")

if [ "$EXPORT_CSV" = "200" ]; then
    log_pass "CSV export successful"
else
    log_fail "CSV export failed: $EXPORT_CSV"
fi

# Test 7.2: Export resources as JSON
log_test "Export resources as JSON"
EXPORT_JSON=$(curl -s -o /dev/null -w "%{http_code}" \
    "$API_URL/api/v1/export/resources?format=json" \
    -H "Authorization: Bearer $TOKEN")

if [ "$EXPORT_JSON" = "200" ]; then
    log_pass "JSON export successful"
else
    log_fail "JSON export failed: $EXPORT_JSON"
fi

# =============================================================================
# 8. INTELLIGENCE TESTS
# =============================================================================
echo ""
echo "8. INTELLIGENCE TESTS"
echo "---------------------"

# Test 8.1: Smart search
log_test "Smart search (intelligence match)"
MATCH=$(curl -s -X POST "$API_URL/api/v1/intelligence/match" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"requiredSkills":[],"limit":5}')

if echo "$MATCH" | grep -q '"data"'; then
    log_pass "Intelligence match working"
else
    log_fail "Intelligence match failed: $MATCH"
fi

# Test 8.2: Utilization insights
log_test "Utilization insights"
UTIL=$(curl -s "$API_URL/api/v1/intelligence/utilization-insights" \
    -H "Authorization: Bearer $TOKEN")

if echo "$UTIL" | grep -q -E '"currentUtilization"|"data"'; then
    log_pass "Utilization insights working"
else
    log_fail "Utilization insights failed: $UTIL"
fi

# Test 8.3: Skill inventory
log_test "Skill inventory"
SKILLS=$(curl -s "$API_URL/api/v1/intelligence/skill-inventory" \
    -H "Authorization: Bearer $TOKEN")

if echo "$SKILLS" | grep -q -E '"skills"|"data"'; then
    log_pass "Skill inventory working"
else
    log_fail "Skill inventory failed: $SKILLS"
fi

# =============================================================================
# 9. ANALYTICS TESTS
# =============================================================================
echo ""
echo "9. ANALYTICS TESTS"
echo "------------------"

# Test 9.1: Executive dashboard
log_test "Executive analytics"
EXEC=$(curl -s "$API_URL/api/v1/analytics/executive" \
    -H "Authorization: Bearer $TOKEN")

if echo "$EXEC" | grep -q -E '"summary"|"data"'; then
    log_pass "Executive analytics working"
else
    log_fail "Executive analytics failed: $EXEC"
fi

# Test 9.2: Practice analytics
log_test "Practice analytics"
PRACTICE=$(curl -s "$API_URL/api/v1/analytics/practice" \
    -H "Authorization: Bearer $TOKEN")

if echo "$PRACTICE" | grep -q '"data"'; then
    log_pass "Practice analytics working"
else
    log_fail "Practice analytics failed: $PRACTICE"
fi

# Test 9.3: Financial analytics
log_test "Financial analytics"
FINANCIAL=$(curl -s "$API_URL/api/v1/analytics/financial" \
    -H "Authorization: Bearer $TOKEN")

if echo "$FINANCIAL" | grep -q '"data"'; then
    log_pass "Financial analytics working"
else
    log_fail "Financial analytics failed: $FINANCIAL"
fi

# =============================================================================
# 10. BENCH MANAGEMENT TESTS
# =============================================================================
echo ""
echo "10. BENCH MANAGEMENT TESTS"
echo "--------------------------"

# Test 10.1: Bench summary
log_test "Bench summary"
BENCH=$(curl -s "$API_URL/api/v1/bench/summary" \
    -H "Authorization: Bearer $TOKEN")

if echo "$BENCH" | grep -q -E '"totalOnBench"|"data"'; then
    log_pass "Bench summary working"
else
    log_fail "Bench summary failed: $BENCH"
fi

# Test 10.2: Bench resources
log_test "Bench resources list"
BENCH_RES=$(curl -s "$API_URL/api/v1/bench/resources" \
    -H "Authorization: Bearer $TOKEN")

if echo "$BENCH_RES" | grep -q '"data"'; then
    log_pass "Bench resources working"
else
    log_fail "Bench resources failed: $BENCH_RES"
fi

# Test 10.3: Bench forecast
log_test "Bench forecast"
FORECAST=$(curl -s "$API_URL/api/v1/bench/forecast" \
    -H "Authorization: Bearer $TOKEN")

if echo "$FORECAST" | grep -q '"data"'; then
    log_pass "Bench forecast working"
else
    log_fail "Bench forecast failed: $FORECAST"
fi

# =============================================================================
# 11. WEBHOOKS TESTS
# =============================================================================
echo ""
echo "11. WEBHOOKS TESTS"
echo "------------------"

# Test 11.1: List webhook events
log_test "List webhook events"
EVENTS=$(curl -s "$API_URL/api/v1/webhooks/events" \
    -H "Authorization: Bearer $TOKEN")

if echo "$EVENTS" | grep -q -E '"events"|"resource.created"'; then
    log_pass "Webhook events listed"
else
    log_fail "Webhook events failed: $EVENTS"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "=========================================="
echo "  TEST RESULTS SUMMARY"
echo "=========================================="
echo ""
echo -e "Total Tests: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASS}${NC}"
echo -e "${RED}Failed: ${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
else
    echo -e "${RED}✗ Some tests failed. Check details above.${NC}"
fi

echo ""
echo "Results saved to: $RESULTS_FILE"
echo ""

# Save summary to results file
echo "" >> $RESULTS_FILE
echo "==============================" >> $RESULTS_FILE
echo "SUMMARY" >> $RESULTS_FILE
echo "Total: $TOTAL | Passed: $PASS | Failed: $FAIL" >> $RESULTS_FILE

# Exit with error if any tests failed
if [ $FAIL -gt 0 ]; then
    exit 1
fi

