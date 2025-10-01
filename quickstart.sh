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

# Check if database is already initialized
echo "🔍 Checking database status..."
DB_CHECK=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='teams';" 2>/dev/null || echo "")

if echo "$DB_CHECK" | grep -q "teams"; then
    echo "✅ Database already initialized, skipping schema setup"
else
    echo "📋 Initializing database schema..."

    # Apply schema with default teams (will skip if tables exist due to IF NOT EXISTS)
    if wrangler d1 execute blawby-ai-chatbot --local --file=./worker/schema.sql 2>&1; then
        echo "✅ Schema applied successfully"
    else
        echo "❌ Error applying schema. Trying migration-based approach..."

        # Try applying migrations one by one in sorted order
        for migration in $(ls migrations/*.sql 2>/dev/null | sort); do
            if [ -f "$migration" ]; then
                echo "📋 Applying migration: $(basename $migration)"
                if wrangler d1 execute blawby-ai-chatbot --local --file="$migration" 2>&1 | grep -q "success"; then
                    echo "   ✅ Applied successfully"
                else
                    echo "   ⚠️  Migration failed or already applied"
                fi
            fi
        done
    fi
fi

# Verify setup
echo "🔍 Verifying setup..."
TEAM_CHECK=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM teams;" 2>/dev/null || echo "")

if echo "$TEAM_CHECK" | grep -q "count"; then
    echo "✅ Database setup complete!"
    echo ""
    echo "📋 Available teams:"
    wrangler d1 execute blawby-ai-chatbot --local --command "SELECT slug, name FROM teams;" 2>/dev/null || echo "   (Teams will be loaded on first run)"
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
    echo "⚠️  Warning: Could not verify teams table. The database may need manual setup."
    echo "   Try running: wrangler d1 execute blawby-ai-chatbot --local --file=./worker/schema.sql"
fi
