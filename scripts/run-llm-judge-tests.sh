#!/bin/bash

# LLM Judge Test Runner
# This script runs the LLM judge evaluation tests against your actual API

set -e

echo "🧪 Starting LLM Judge Tests..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Set default values
API_URL=${TEST_API_URL:-"http://localhost:8787"}
TEAM_ID=${TEST_TEAM_ID:-"test-team-1"}

echo "🔧 Configuration:"
echo "  API URL: $API_URL"
echo "  Team ID: $TEAM_ID"

# Check if the API is running
echo "🔍 Checking if API is available..."
if ! curl -s --max-time 5 "$API_URL/api/health" > /dev/null 2>&1; then
    echo "❌ Error: API is not running at $API_URL"
    echo "💡 Please start your development server first:"
    echo "   npm run dev"
    exit 1
fi

echo "✅ API is running"

# Run the tests
echo "🚀 Running LLM Judge tests..."
TEST_API_URL="$API_URL" TEST_TEAM_ID="$TEAM_ID" npx vitest run tests/llm-judge/llm-judge.test.ts \
    --reporter=verbose

echo "✅ LLM Judge tests completed!"
