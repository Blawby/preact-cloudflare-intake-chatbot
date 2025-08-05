#!/bin/bash

# Production Readiness Integration Tests
# This script tests all critical components of the multi-tenant secret management system

echo "🧪 Starting Production Readiness Integration Tests..."
echo "=================================================="

BASE_URL="https://blawby-ai-chatbot.paulchrisluke.workers.dev"
TEAM_ID="01jq70jnstyfzevc6423czh50e"
TEST_API_KEY="test-production-key-$(date +%s)"

echo ""
echo "🔐 Test 1: Team Secrets API - Store API Key"
echo "--------------------------------------------"
curl -X POST "$BASE_URL/api/team-secrets/$TEAM_ID" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\": \"$TEST_API_KEY\", \"teamUlid\": \"$TEAM_ID\"}" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🔐 Test 2: Team Secrets API - Retrieve API Key"
echo "-----------------------------------------------"
curl "$BASE_URL/api/team-secrets/$TEAM_ID" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🔐 Test 3: Team Secrets API - List All Teams"
echo "---------------------------------------------"
curl "$BASE_URL/api/team-secrets" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🤖 Test 4: AIService Integration - Team Config Resolution"
echo "--------------------------------------------------------"
curl -X POST "$BASE_URL/api/agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"teamId\": \"$TEAM_ID\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello, I need help with a legal matter\"}],
    \"sessionId\": \"test-session-$(date +%s)\"
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🤖 Test 5: Graceful Fallback - Team Without API Key"
echo "---------------------------------------------------"
curl -X POST "$BASE_URL/api/agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"teamId\": \"01K0TNGNKTM4Q0AG0XF0A8ST0Q\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello, I need help with a legal matter\"}],
    \"sessionId\": \"test-session-fallback-$(date +%s)\"
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🤖 Test 6: Error Handling - Invalid Team ID"
echo "--------------------------------------------"
curl -X POST "$BASE_URL/api/agent" \
  -H "Content-Type: application/json" \
  -d "{
    \"teamId\": \"invalid-team-id\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello, I need help with a legal matter\"}],
    \"sessionId\": \"test-session-error-$(date +%s)\"
  }" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🔐 Test 7: Team Secrets API - Update API Key"
echo "---------------------------------------------"
curl -X PUT "$BASE_URL/api/team-secrets/$TEAM_ID" \
  -H "Content-Type: application/json" \
  -d "{\"apiKey\": \"updated-test-key-$(date +%s)\", \"teamUlid\": \"$TEAM_ID\"}" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🔐 Test 8: Team Secrets API - Delete API Key"
echo "---------------------------------------------"
curl -X DELETE "$BASE_URL/api/team-secrets/$TEAM_ID" \
  -w "\nHTTP Status: %{http_code}\n"

echo ""
echo "🧪 Integration Tests Complete!"
echo "============================="
echo ""
echo "📊 Test Results Summary:"
echo "- Team Secrets API: Storage, retrieval, listing, update, delete"
echo "- AIService Integration: Team config resolution with KV-stored keys"
echo "- Graceful Fallback: Handling teams without API keys"
echo "- Error Handling: Invalid team IDs and missing teams"
echo ""
echo "🚨 Next Steps:"
echo "1. Review all HTTP status codes (should be 200/201 for success)"
echo "2. Check worker logs for any errors or warnings"
echo "3. Verify no API keys appear in logs (security check)"
echo "4. Test with real Blawby API keys for production readiness" 