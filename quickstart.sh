#!/bin/bash

# Blawby AI Chatbot - Quick Start Script
# Get up and running in 30 seconds!

set -e

echo "🚀 Blawby AI Chatbot - Quick Start"
echo "=================================="

# Check for required dependencies
echo "🔍 Checking dependencies..."

if ! command -v jq >/dev/null 2>&1; then
    echo "❌ Error: jq is required but not installed." >&2
    echo "   Please install jq to continue:" >&2
    echo "   • macOS: brew install jq" >&2
    echo "   • Ubuntu/Debian: sudo apt-get install jq" >&2
    echo "   • CentOS/RHEL: sudo yum install jq" >&2
    echo "   • Or visit: https://stedolan.github.io/jq/download/" >&2
    exit 1
fi

echo "✅ Dependencies verified"

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
echo "🗄️  Setting up local database..."
wrangler d1 create blawby-ai-chatbot --local 2>/dev/null || echo "Database already exists ✓"

# Apply schema step by step to handle any syntax issues
echo "📋 Applying database schema..."

# First, try to apply the full schema
if wrangler d1 execute blawby-ai-chatbot --local --file=./worker/schema.sql 2>/dev/null; then
    echo "✅ Schema applied successfully from file"
else
    echo "⚠️  Schema file had issues, applying core tables manually..."
    
    # Apply essential tables manually
    echo "Creating core tables..."
    
    # Teams table
    wrangler d1 execute blawby-ai-chatbot --local --command "
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      domain TEXT,
      config JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );" 2>/dev/null || echo "Teams table already exists"
    
    # Lawyers table
    wrangler d1 execute blawby-ai-chatbot --local --command "
    CREATE TABLE IF NOT EXISTS lawyers (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      specialties JSON,
      status TEXT DEFAULT 'active',
      role TEXT DEFAULT 'attorney',
      hourly_rate INTEGER,
      bar_number TEXT,
      license_state TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );" 2>/dev/null || echo "Lawyers table already exists"
    
    # Matters table
    wrangler d1 execute blawby-ai-chatbot --local --command "
    CREATE TABLE IF NOT EXISTS matters (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      client_email TEXT,
      client_phone TEXT,
      matter_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'lead',
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
      assigned_lawyer_id TEXT,
      lead_source TEXT,
      estimated_value INTEGER,
      billable_hours REAL DEFAULT 0,
      flat_fee INTEGER,
      retainer_amount INTEGER,
      retainer_balance INTEGER DEFAULT 0,
      statute_of_limitations DATE,
      court_jurisdiction TEXT,
      opposing_party TEXT,
      matter_number TEXT,
      tags JSON,
      custom_fields JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (assigned_lawyer_id) REFERENCES lawyers(id)
    );" 2>/dev/null || echo "Matters table already exists"
    
    # Matter events table (this was the problematic one)
    wrangler d1 execute blawby-ai-chatbot --local --command "
    CREATE TABLE IF NOT EXISTS matter_events (
      id TEXT PRIMARY KEY,
      matter_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATETIME NOT NULL,
      created_by_lawyer_id TEXT,
      billable_time REAL DEFAULT 0,
      billing_rate INTEGER,
      amount INTEGER,
      tags JSON,
      metadata JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (matter_id) REFERENCES matters(id),
      FOREIGN KEY (created_by_lawyer_id) REFERENCES lawyers(id)
    );" 2>/dev/null || echo "Matter events table already exists"
    
    # Chat sessions table
    wrangler d1 execute blawby-ai-chatbot --local --command "
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      token_hash TEXT,
      state TEXT NOT NULL DEFAULT 'active',
      status_reason TEXT,
      retention_horizon_days INTEGER NOT NULL DEFAULT 180,
      is_hold INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      UNIQUE(id, team_id)
    );" 2>/dev/null || echo "Chat sessions table already exists"
    
    # Session audit events table
    wrangler d1 execute blawby-ai-chatbot --local --command "
    CREATE TABLE IF NOT EXISTS session_audit_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      actor_id TEXT,
      payload TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );" 2>/dev/null || echo "Session audit events table already exists"
    
    echo "✅ Core tables created successfully"
fi

# Insert default teams if they don't exist
echo "👥 Setting up default teams..."

# Insert teams from JSON configuration files for better maintainability
echo "Inserting teams from configuration files..."

# Test team
./scripts/insert-team.sh scripts/team-configs/test-team.json

# North Carolina Legal Services
./scripts/insert-team.sh scripts/team-configs/north-carolina-legal-services.json

# Blawby AI
./scripts/insert-team.sh scripts/team-configs/blawby-ai.json

# Verify setup
echo "🔍 Verifying setup..."
TEAM_COUNT=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM teams;" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")

if [ "$TEAM_COUNT" -gt 0 ]; then
    echo "✅ Success! Found $TEAM_COUNT teams in database."
    echo ""
    echo "📋 Available teams:"
    wrangler d1 execute blawby-ai-chatbot --local --command "SELECT slug, name FROM teams;" 2>/dev/null || echo "Could not list teams"
    echo ""
    echo "🎉 You're ready to go!"
    echo ""
    echo "Next steps:"
    echo "1. Start the development server:"
    echo "   npm run dev:worker:clean"
    echo ""
    echo "2. Test the API:"
    echo "   curl -X GET http://localhost:8787/api/teams"
    echo ""
    echo "3. Open the frontend:"
    echo "   npm run dev"
    echo ""
    echo "Happy coding! 🎯"
else
    echo "❌ Error: No teams found. Database setup may have failed."
    echo "You can try running the script again or check the database manually."
    exit 1
fi
