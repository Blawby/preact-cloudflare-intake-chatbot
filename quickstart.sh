#!/bin/bash

# Blawby AI Chatbot - Quick Start Script
# Get up and running in 30 seconds!

set -e

echo "🚀 Blawby AI Chatbot - Quick Start"
echo "=================================="

# Setup environment file if it doesn't exist
if [ ! -f ".dev.vars" ]; then
    echo "📝 Setting up environment file..."
    if [ -f "dev.vars.example" ]; then
        cp dev.vars.example .dev.vars
        echo "✅ Created .dev.vars from example"
        echo "   (You can edit it later with your actual API keys)"
    else
        echo "⚠️  Warning: dev.vars.example not found"
    fi
fi

# Create local database (ignore if already exists)
wrangler d1 create blawby-ai-chatbot --local 2>/dev/null || echo "Database already exists ✓"

# Apply schema with default teams
echo "📋 Applying database schema..."
wrangler d1 execute blawby-ai-chatbot --local --file=./worker/schema.sql

# Verify setup
echo "🔍 Verifying setup..."
TEAM_COUNT=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM teams;" --json | jq -r '.results[0].count')

if [ "$TEAM_COUNT" -gt 0 ]; then
    echo "✅ Success! Found $TEAM_COUNT teams in database."
    echo ""
    echo "📋 Available teams:"
    wrangler d1 execute blawby-ai-chatbot --local --command "SELECT slug, name FROM teams;"
    echo ""
    echo "🎉 You're ready to go!"
    echo ""
    echo "Next steps:"
    echo "1. Start the development server:"
    echo "   npm run dev:worker"
    echo ""
    echo "2. Test the API:"
    echo "   curl -X GET http://localhost:8787/api/teams"
    echo ""
    echo "3. Open the frontend:"
    echo "   npm run dev"
    echo ""
    echo "Happy coding! 🎯"
else
    echo "❌ Error: No teams found. Check the schema file."
    exit 1
fi
