#!/bin/bash

# Cartrita Chat API Smoke Tests
# Tests the functional chat interface with real API calls

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3002}"
CHAT_ENDPOINT="$API_BASE_URL/api/v1/ai/chat"
AGENTS_ENDPOINT="$API_BASE_URL/api/v1/ai/agents"
HEALTH_ENDPOINT="$API_BASE_URL/api/v1/ai/ai-health"

echo "🚀 Cartrita Chat API Smoke Tests"
echo "Testing against: $API_BASE_URL"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to run tests
run_test() {
    local test_name="$1"
    local curl_command="$2"
    local expected_status="$3"

    echo -e "${BLUE}Testing: $test_name${NC}"

    # Execute curl command and capture response and status
    response=$(eval "$curl_command" 2>/dev/null)
    status=$?

    if [ $status -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        echo "Response preview: $(echo "$response" | head -c 200)..."
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name"
        echo "Curl exit code: $status"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
    echo ""
}

# Test 1: Health Check
echo -e "${YELLOW}1. Testing Cartrita Health Endpoint${NC}"
run_test "Health Check" \
    "curl -s -X GET '$HEALTH_ENDPOINT' -H 'Content-Type: application/json'" \
    200

# Test 2: Get Available Agents
echo -e "${YELLOW}2. Testing Get Available Agents${NC}"
run_test "Get Agents List" \
    "curl -s -X GET '$AGENTS_ENDPOINT' -H 'Content-Type: application/json'" \
    200

# Test 3: Simple Chat Message (without auth for now)
echo -e "${YELLOW}3. Testing Simple Chat Message${NC}"
chat_payload='{
  "conversationId": "test-conversation-001",
  "message": {
    "id": "msg-001",
    "content": "Hello Cartrita! Can you help me understand what you do?",
    "role": "user",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  },
  "agentType": "cartrita-orchestrator"
}'

run_test "Simple Chat Message" \
    "curl -s -X POST '$CHAT_ENDPOINT' -H 'Content-Type: application/json' -d '$chat_payload'" \
    200

# Test 4: Chat with Context7 Enhancement
echo -e "${YELLOW}4. Testing Chat with Context7 Enhancement${NC}"
context7_payload='{
  "conversationId": "test-conversation-002",
  "message": {
    "id": "msg-002",
    "content": "What are the latest React patterns for 2025?",
    "role": "user",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  },
  "agentType": "frontend-agent",
  "context": {
    "userPreferences": {
      "useContext7": true,
      "enhancedDocumentation": true
    },
    "sessionData": {
      "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
      "context7Enabled": true
    }
  }
}'

run_test "Chat with Context7" \
    "curl -s -X POST '$CHAT_ENDPOINT' -H 'Content-Type: application/json' -d '$context7_payload'" \
    200

# Test 5: Code Engineering Agent
echo -e "${YELLOW}5. Testing Code Engineering Agent${NC}"
code_payload='{
  "conversationId": "test-conversation-003",
  "message": {
    "id": "msg-003",
    "content": "Write a TypeScript function to validate email addresses with proper error handling.",
    "role": "user",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  },
  "agentType": "code-engineer"
}'

run_test "Code Engineering Agent" \
    "curl -s -X POST '$CHAT_ENDPOINT' -H 'Content-Type: application/json' -d '$code_payload'" \
    200

# Test 6: API Agent
echo -e "${YELLOW}6. Testing API Agent${NC}"
api_payload='{
  "conversationId": "test-conversation-004",
  "message": {
    "id": "msg-004",
    "content": "Design a RESTful API for a user management system with proper authentication.",
    "role": "user",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'"
  },
  "agentType": "api-agent"
}'

run_test "API Agent" \
    "curl -s -X POST '$CHAT_ENDPOINT' -H 'Content-Type: application/json' -d '$api_payload'" \
    200

# Test 7: Error Handling (Invalid JSON)
echo -e "${YELLOW}7. Testing Error Handling${NC}"
run_test "Invalid JSON Handling" \
    "curl -s -X POST '$CHAT_ENDPOINT' -H 'Content-Type: application/json' -d '{invalid json}'" \
    400

# Test 8: Missing Required Fields
echo -e "${YELLOW}8. Testing Missing Required Fields${NC}"
invalid_payload='{
  "conversationId": "test-conversation-005"
}'

run_test "Missing Required Fields" \
    "curl -s -X POST '$CHAT_ENDPOINT' -H 'Content-Type: application/json' -d '$invalid_payload'" \
    400

# Summary
echo "================================================"
echo -e "${BLUE}Cartrita Chat API Test Results${NC}"
echo "================================================"
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! Cartrita chat API is functional.${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the API implementation.${NC}"
    exit 1
fi