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

# Function to create a secure password hash using Node.js crypto
create_password_hash() {
    local password="$1"
    node -e "
        const crypto = require('crypto');
        const { promisify } = require('util');
        const scrypt = promisify(crypto.scrypt);
        
        async function hashPassword(password) {
            const salt = crypto.randomBytes(16);
            const hash = await scrypt(password, salt, 64);
            const combined = Buffer.concat([salt, hash]);
            console.log(combined.toString('base64'));
        }
        
        hashPassword('$password').catch(console.error);
    "
}

# Function to escape SQL strings safely
escape_sql() {
    echo "$1" | sed "s/'/''/g"
}

# Function to create test user with proper security
create_test_user() {
    local email="$1"
    local password="$2"
    local name="$3"
    
    echo "  Creating test user: $email"
    
    # Generate IDs
    local timestamp=$(date +%s)
    local user_id="test-user-$timestamp"
    local password_id="test-password-$timestamp"
    
    # Create secure password hash
    echo "  Generating secure password hash..."
    local hashed_password=$(create_password_hash "$password")
    
    if [ -z "$hashed_password" ]; then
        echo "❌ Failed to generate password hash"
        return 1
    fi
    
    # Escape inputs for SQL
    local escaped_name=$(escape_sql "$name")
    local escaped_email=$(escape_sql "$email")
    local escaped_hash=$(escape_sql "$hashed_password")
    
    # Insert user record
    echo "  Inserting user record..."
    if ! wrangler d1 execute blawby-ai-chatbot --local --command "
        INSERT INTO users (id, name, email, email_verified, created_at, updated_at, team_id, role) 
        VALUES ('$user_id', '$escaped_name', '$escaped_email', 1, strftime('%s', 'now'), strftime('%s', 'now'), '01K0TNGNKTM4Q0AG0XF0A8ST0Q', 'admin');" >/dev/null 2>&1; then
        echo "❌ Failed to insert user record"
        return 1
    fi
    
    # Insert password record
    echo "  Inserting password record..."
    if ! wrangler d1 execute blawby-ai-chatbot --local --command "
        INSERT INTO passwords (id, user_id, hashed_password, created_at, updated_at) 
        VALUES ('$password_id', '$user_id', '$escaped_hash', strftime('%s', 'now'), strftime('%s', 'now'));" >/dev/null 2>&1; then
        echo "❌ Failed to insert password record"
        return 1
    fi
    
    echo "✅ Test user created successfully"
    echo "   Email: $email"
    echo "   Password: $password"
    echo "   Name: $name"
    return 0
}

# Function to check if test user exists
check_test_user_exists() {
    local email="$1"
    local escaped_email=$(escape_sql "$email")
    local count=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM users WHERE email = '$escaped_email';" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
    echo "$count"
}

# Setup environment file if it doesn't exist
if [ ! -f ".dev.vars" ]; then
    echo "📝 Setting up environment file..."
    if [ -f "dev.vars.example" ]; then
        cp dev.vars.example .dev.vars
        echo "✅ Created .dev.vars from example file"
        echo "⚠️  Please review and update .dev.vars with your actual values"
    else
        echo "❌ dev.vars.example not found"
        exit 1
    fi
fi

# Source environment variables
source .dev.vars

echo "🗄️  Setting up local database..."

# Apply main database schema
echo "📋 Applying database schema..."
if wrangler d1 execute blawby-ai-chatbot --local --file=./worker/schema.sql 2>/dev/null; then
    echo "✅ Database schema applied"
else
    echo "⚠️  Database schema may already be applied (this is normal)"
fi

# Apply Better Auth tables
echo "🔐 Setting up Better Auth tables..."
if wrangler d1 execute blawby-ai-chatbot --local --file=./migrations/add_better_auth_tables.sql 2>/dev/null; then
    echo "✅ Better Auth tables created"
else
    echo "⚠️  Better Auth tables may already exist (this is normal)"
fi

# Setup default teams
echo "👥 Setting up default teams..."
EXISTING_TEAMS=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM teams;" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")

if [ "$EXISTING_TEAMS" -eq 0 ]; then
    echo "ERROR: no teams found after executing schema.sql; aborting" >&2
    exit 1
else
    echo "✅ Teams already exist"
fi

# Setup test user
echo "👤 Setting up test user for development..."
if [ -n "$TEST_USER_EMAIL" ] && [ -n "$TEST_USER_PASSWORD" ] && [ -n "$TEST_USER_NAME" ]; then
    EXISTING_USER=$(check_test_user_exists "$TEST_USER_EMAIL")
    
    if [ "$EXISTING_USER" -eq 0 ]; then
        create_test_user "$TEST_USER_EMAIL" "$TEST_USER_PASSWORD" "$TEST_USER_NAME"
    else
        echo "✅ Test user already exists"
    fi
else
    echo "⚠️  Test user credentials not found in .dev.vars"
    echo "   Set TEST_USER_EMAIL, TEST_USER_PASSWORD, and TEST_USER_NAME to create a test user"
fi

# Final verification
echo "🔍 Verifying setup..."
TEAM_COUNT=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM teams;" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
USER_COUNT=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM users;" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")

if [ "$TEAM_COUNT" -gt 0 ]; then
    echo "✅ Database setup complete"
    echo "   Teams: $TEAM_COUNT"
    echo "   Users: $USER_COUNT"
    
    echo ""
    echo "🎉 Setup complete! You can now:"
    echo "   • Run 'npm run dev:full' to start the development server"
    echo "   • Visit http://localhost:5173 to see the application"
    echo "   • Use the test user credentials from .dev.vars to log in"
    echo ""
    echo "📚 Next steps:"
    echo "   • Review the README.md for more information"
    echo "   • Check the API documentation in the worker/routes directory"
    echo "   • Customize your team settings in the database"
else
    echo "❌ Setup failed - no teams found in database"
    exit 1
fi