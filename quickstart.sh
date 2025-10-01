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

# Function to check and create test user
check_test_user() {
    if [ -f ".dev.vars" ]; then
        # Source the dev vars to get test user credentials
        source .dev.vars
        
        # Check if test user already exists
        # Escape single quotes in email to prevent SQL injection
        ESCAPED_EMAIL=$(echo "$TEST_USER_EMAIL" | sed "s/'/''/g")
        EXISTING_USER=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM users WHERE email = '$ESCAPED_EMAIL';" --json | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
        
        if [ "$EXISTING_USER" -eq 0 ] && [ -n "$TEST_USER_EMAIL" ] && [ -n "$TEST_USER_PASSWORD" ] && [ -n "$TEST_USER_NAME" ]; then
            echo "  Creating test user: $TEST_USER_EMAIL"
            
            # Generate user and account IDs using single timestamp to prevent collisions
            TIMESTAMP=$(date +%s)
            USER_ID="test-user-$TIMESTAMP"
            ACCOUNT_ID="test-account-$TIMESTAMP"
            
            # Escape variables to prevent SQL injection
            ESCAPED_NAME=$(echo "$TEST_USER_NAME" | sed "s/'/''/g")
            ESCAPED_EMAIL=$(echo "$TEST_USER_EMAIL" | sed "s/'/''/g")
            ESCAPED_PASSWORD=$(echo "$TEST_USER_PASSWORD" | sed "s/'/''/g")
            
            # Hash the password using a simple approach (Better Auth will re-hash on first login)
            # Using a basic hash for development - in production, Better Auth handles this
            HASHED_PASSWORD=$(echo -n "$TEST_USER_PASSWORD" | openssl dgst -sha256 -binary | base64)
            
            # Insert the test user with proper error handling
            echo "  Inserting test user into database..."
            USER_INSERT_RESULT=$(wrangler d1 execute blawby-ai-chatbot --local --command "
            INSERT INTO users (id, name, email, email_verified, created_at, updated_at, team_id, role) 
            VALUES ('$USER_ID', '$ESCAPED_NAME', '$ESCAPED_EMAIL', 1, strftime('%s', 'now'), strftime('%s', 'now'), '01K0TNGNKTM4Q0AG0XF0A8ST0Q', 'admin');" 2>&1)
            
            if [ $? -ne 0 ]; then
                echo "❌ Failed to insert test user:"
                echo "$USER_INSERT_RESULT"
                exit 1
            fi
            
            # Insert password account for the test user with proper error handling
            echo "  Inserting test user account into database..."
            ACCOUNT_INSERT_RESULT=$(wrangler d1 execute blawby-ai-chatbot --local --command "
            INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at) 
            VALUES ('$ACCOUNT_ID', '$ESCAPED_EMAIL', 'credential', '$USER_ID', '$HASHED_PASSWORD', strftime('%s', 'now'), strftime('%s', 'now'));" 2>&1)
            
            if [ $? -ne 0 ]; then
                echo "❌ Failed to insert test user account:"
                echo "$ACCOUNT_INSERT_RESULT"
                exit 1
            fi
            
            echo "✅ Test user created successfully"
            echo "   Email: $TEST_USER_EMAIL"
            echo "   Password: $TEST_USER_PASSWORD"
            echo "   Name: $TEST_USER_NAME"
        else
            if [ "$EXISTING_USER" -gt 0 ]; then
                echo "✅ Test user already exists"
            else
                echo "⚠️  Test user credentials not found in .dev.vars"
            fi
        fi
    else
        echo "⚠️  .dev.vars file not found - skipping test user creation"
    fi
}

# Function to verify test user exists (for verification section)
verify_test_user() {
    if [ -f ".dev.vars" ]; then
        source .dev.vars
        if [ -n "$TEST_USER_EMAIL" ]; then
            USER_COUNT=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM users WHERE email = '$TEST_USER_EMAIL';" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
            if [ "$USER_COUNT" -gt 0 ]; then
                echo "👤 Test user available: $TEST_USER_EMAIL"
            fi
        fi
    fi
}

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

# Apply Better Auth migrations
echo "🔐 Setting up Better Auth tables..."
if wrangler d1 execute blawby-ai-chatbot --local --file=./migrations/add_better_auth_tables.sql 2>/dev/null; then
    echo "✅ Better Auth tables created successfully"
else
    echo "⚠️  Better Auth tables may already exist or had issues"
fi

# Insert default teams if they don't exist
echo "👥 Setting up default teams..."

# Teams are now managed via database and API
# Insert default teams if none exist for quick start
EXISTING_TEAMS=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM teams;" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")
if [ "$EXISTING_TEAMS" -eq 0 ]; then
    echo "Adding default teams for quick start..."
    
    # Insert Blawby AI team
    echo "  Adding Blawby AI team..."
    wrangler d1 execute blawby-ai-chatbot --local --command "INSERT INTO teams (id, name, slug, config, created_at, updated_at) VALUES ('01K0TNGNKTM4Q0AG0XF0A8ST0Q', 'Blawby AI', 'blawby-ai', '{\"aiModel\": \"llama\", \"consultationFee\": 0, \"requiresPayment\": false, \"ownerEmail\": \"paulchrisluke@gmail.com\", \"availableServices\": [\"Family Law\", \"Business Law\", \"Contract Review\", \"Intellectual Property\", \"Employment Law\", \"Personal Injury\", \"Criminal Law\", \"Civil Law\", \"General Consultation\"], \"serviceQuestions\": {\"Family Law\": [\"I understand this is a difficult time. Can you tell me what type of family situation you are dealing with?\", \"What are the main issues you are facing?\", \"Have you taken any steps to address this situation?\", \"What would a good outcome look like for you?\"], \"Business Law\": [\"What type of business entity are you operating or planning to start?\", \"What specific legal issue are you facing with your business?\", \"Are you dealing with contracts, employment issues, or regulatory compliance?\", \"What is the size and scope of your business operations?\"], \"Contract Review\": [\"What type of contract do you need reviewed?\", \"What is the value or importance of this contract?\", \"Are there any specific concerns or red flags you have noticed?\", \"What is the timeline for this contract?\"], \"Intellectual Property\": [\"What type of intellectual property are you dealing with?\", \"Are you looking to protect, license, or enforce IP rights?\", \"What is the nature of your IP (patent, trademark, copyright, trade secret)?\", \"What is the commercial value or importance of this IP?\"], \"Employment Law\": [\"What specific employment issue are you facing?\", \"Are you an employer or employee in this situation?\", \"Have you taken any steps to address this issue?\", \"What is the timeline or urgency of your situation?\"], \"Personal Injury\": [\"Can you tell me about the incident that caused your injury?\", \"What type of injuries did you sustain?\", \"Have you received medical treatment?\", \"What is the current status of your recovery?\"], \"Criminal Law\": [\"What type of legal situation are you facing?\", \"Are you currently facing charges or under investigation?\", \"Have you been arrested or contacted by law enforcement?\", \"Do you have an attorney representing you?\"], \"Civil Law\": [\"What type of civil legal issue are you dealing with?\", \"Are you involved in a lawsuit or considering legal action?\", \"What is the nature of the dispute?\", \"What outcome are you hoping to achieve?\"], \"General Consultation\": [\"Thanks for reaching out! I would love to help. Can you tell me what legal situation you are dealing with?\", \"Have you been able to take any steps to address this yet?\", \"What would a good outcome look like for you?\", \"Do you have any documents or information that might be relevant?\"]}, \"domain\": \"ai.blawby.com\", \"description\": \"AI-powered legal assistance for businesses and individuals\", \"paymentLink\": null, \"brandColor\": \"#2563eb\", \"accentColor\": \"#3b82f6\", \"introMessage\": \"Hello! I am Blawby AI, your intelligent legal assistant. I can help you with family law, business law, contract review, intellectual property, employment law, personal injury, criminal law, civil law, and general legal consultation. How can I assist you today?\", \"profileImage\": null, \"voice\": {\"enabled\": false, \"provider\": \"cloudflare\", \"voiceId\": null, \"displayName\": null, \"previewUrl\": null}, \"blawbyApi\": {\"enabled\": false, \"apiUrl\": \"https://staging.blawby.com\"}}', datetime('now'), datetime('now'));" 2>/dev/null || echo "Could not insert Blawby AI team"
    
    # Insert North Carolina Legal Services team
    echo "  Adding North Carolina Legal Services team..."
    wrangler d1 execute blawby-ai-chatbot --local --command "INSERT INTO teams (id, name, slug, config, created_at, updated_at) VALUES ('01K0TNGNKNJEP8EPKHXAQV4S0R', 'North Carolina Legal Services', 'north-carolina-legal-services', '{\"aiModel\": \"llama\", \"consultationFee\": 75, \"requiresPayment\": true, \"ownerEmail\": \"paulchrisluke@gmail.com\", \"availableServices\": [\"Family Law\", \"Small Business and Nonprofits\", \"Employment Law\", \"Tenant Rights Law\", \"Probate and Estate Planning\", \"Special Education and IEP Advocacy\"], \"serviceQuestions\": {\"Family Law\": [\"Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you are going through? (For example, divorce, custody, child support...)\"], \"Small Business and Nonprofits\": [\"What type of business entity are you operating or planning to start?\"], \"Employment Law\": [\"I am sorry you are dealing with workplace issues - that can be really stressful. Can you tell me what has been happening at work? (For example, discrimination, harassment, wage problems...)\"], \"Tenant Rights Law\": [\"What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)\"], \"Probate and Estate Planning\": [\"Are you dealing with probate of an estate or planning your own estate?\"], \"Special Education and IEP Advocacy\": [\"What grade level is your child in and what type of school do they attend?\"]}, \"domain\": \"northcarolinalegalservices.blawby.com\", \"description\": \"Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.\", \"paymentLink\": \"https://app.blawby.com/northcarolinalegalservices/pay?amount=7500\", \"brandColor\": \"#059669\", \"accentColor\": \"#10b981\", \"introMessage\": \"Welcome to North Carolina Legal Services! I am here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?\", \"profileImage\": \"https://app.blawby.com/storage/team-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg\", \"jurisdiction\": {\"type\": \"state\", \"description\": \"North Carolina\", \"supportedStates\": [\"NC\"], \"supportedCountries\": [\"US\"], \"allowOutOfJurisdiction\": true, \"requireLocation\": true, \"outOfJurisdictionMessage\": \"We primarily serve clients in North Carolina. While we can provide general guidance, we recommend consulting with a local attorney in your state for state-specific legal matters.\"}, \"voice\": {\"enabled\": false, \"provider\": \"cloudflare\", \"voiceId\": null, \"displayName\": null, \"previewUrl\": null}}', datetime('now'), datetime('now'));" 2>/dev/null || echo "Could not insert North Carolina Legal Services team"
    
    # Insert Test Law Firm team
    echo "  Adding Test Law Firm team..."
    wrangler d1 execute blawby-ai-chatbot --local --command "INSERT INTO teams (id, name, slug, config, created_at, updated_at) VALUES ('01K0TNGNKVCFT7V78Y4QF0PKH5', 'Test Law Firm', 'test-team', '{\"aiModel\": \"llama\", \"requiresPayment\": false}', datetime('now'), datetime('now'));" 2>/dev/null || echo "Could not insert Test Law Firm team"
    
    echo "✅ Default teams added"
else
    echo "✅ Teams already configured in database"
fi

# Create test user for development
echo "👤 Setting up test user for development..."
check_test_user

# Verify setup
echo "🔍 Verifying setup..."
TEAM_COUNT=$(wrangler d1 execute blawby-ai-chatbot --local --command "SELECT COUNT(*) as count FROM teams;" --json 2>/dev/null | jq -r '.[0].results[0].count' 2>/dev/null || echo "0")

if [ "$TEAM_COUNT" -gt 0 ]; then
    echo "✅ Success! Found $TEAM_COUNT teams in database."
    echo ""
    echo "📋 Available teams:"
    wrangler d1 execute blawby-ai-chatbot --local --command "SELECT slug, name FROM teams;" 2>/dev/null || echo "Could not list teams"
    echo ""
    
    # Check for test user
    verify_test_user
    
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
    if [ -f ".dev.vars" ] && [ -n "$TEST_USER_EMAIL" ]; then
        echo "4. Test authentication:"
        echo "   Use the test user credentials from .dev.vars to sign in"
        echo "   Email: $TEST_USER_EMAIL"
        echo "   Password: $TEST_USER_PASSWORD"
    fi
    echo ""
    echo "Happy coding! 🎯"
else
    echo "❌ Error: No teams found. Database setup may have failed."
    echo "You can try running the script again or check the database manually."
    exit 1
fi
