#!/bin/bash

# Setup script for Blawby API configuration
# This script demonstrates how to properly apply the migration with real API credentials

set -e

echo "🔧 Setting up Blawby API configuration..."

# Check if required environment variables are set
if [ -z "$BLAWBY_API_KEY" ]; then
    echo "❌ Error: BLAWBY_API_KEY environment variable is not set"
    echo "   Please set it with: export BLAWBY_API_KEY='your-actual-api-key'"
    exit 1
fi

if [ -z "$BLAWBY_TEAM_ULID" ]; then
    echo "⚠️  Warning: BLAWBY_TEAM_ULID not set, using default value"
    BLAWBY_TEAM_ULID="01jq70jnstyfzevc6423czh50e"
fi

echo "✅ Using API key: ***${BLAWBY_API_KEY: -4}"
echo "✅ Using team ULID: $BLAWBY_TEAM_ULID"

# Create a temporary migration file with real values
TEMP_MIGRATION=$(mktemp)
cat > "$TEMP_MIGRATION" << EOF
-- Temporary migration with real API credentials
-- This file is auto-generated and should not be committed to version control

UPDATE teams 
SET config = json_set(
  config,
  '$.blawbyApi',
  json_object(
    'enabled', true,
    'apiKey', '$BLAWBY_API_KEY',
    'teamUlid', '$BLAWBY_TEAM_ULID'
  )
)
WHERE slug = 'blawby-ai';

-- Verify the update was successful
SELECT 
  id,
  slug,
  name,
  json_extract(config, '$.blawbyApi.enabled') as api_enabled,
  json_extract(config, '$.blawbyApi.teamUlid') as team_ulid,
  CASE 
    WHEN json_extract(config, '$.blawbyApi.apiKey') IS NOT NULL 
    THEN '***' || substr(json_extract(config, '$.blawbyApi.apiKey'), -4)
    ELSE 'NOT SET'
  END as api_key_masked
FROM teams 
WHERE slug = 'blawby-ai';
EOF

echo "📝 Created temporary migration file: $TEMP_MIGRATION"

# Apply the migration
echo "🚀 Applying migration to local database..."
npx wrangler d1 execute DB --file "$TEMP_MIGRATION"

echo "🚀 Applying migration to remote database..."
npx wrangler d1 execute DB --remote --file "$TEMP_MIGRATION"

# Clean up
rm "$TEMP_MIGRATION"
echo "🧹 Cleaned up temporary migration file"

echo "✅ Blawby API configuration completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Test the configuration with: npm test -- tests/integration/api/blawby-api.test.ts"
echo "   2. Verify the setup with: npx wrangler d1 execute DB --command \"SELECT slug, json_extract(config, '$.blawbyApi.enabled') as api_enabled FROM teams WHERE slug = 'blawby-ai';\""
