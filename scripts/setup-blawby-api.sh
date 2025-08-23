#!/bin/bash

# Setup script for Blawby API configuration
# This script creates a secure API token in the team_api_tokens table
# and updates the team config with only metadata (no sensitive data)

set -e

echo "🔧 Setting up Blawby API configuration securely..."

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

# Generate a SHA-256 hash of the API key for secure storage
API_KEY_HASH=$(echo -n "$BLAWBY_API_KEY" | openssl dgst -sha256 -binary | base64)

# Create a temporary SQL file with the actual values
TEMP_SQL_FILE=$(mktemp)
sed "s|__API_KEY_HASH__|$API_KEY_HASH|g; s|__TEAM_ULID__|$BLAWBY_TEAM_ULID|g" scripts/setup-blawby-api.sql > "$TEMP_SQL_FILE"

# Apply the secure migration
echo "🚀 Applying secure migration to local database..."
npx wrangler d1 execute DB --file "$TEMP_SQL_FILE"

echo "🚀 Applying secure migration to remote database..."
npx wrangler d1 execute DB --remote --file "$TEMP_SQL_FILE"

# Clean up temporary file
rm "$TEMP_SQL_FILE"

echo "✅ Blawby API configuration completed securely!"
echo ""
echo "🔒 Security improvements:"
echo "   - API key stored as SHA-256 hash in team_api_tokens table"
echo "   - Team config contains only metadata (no sensitive data)"
echo "   - Token validation uses secure hash comparison"
echo ""
echo "📋 Next steps:"
echo "   1. Test the configuration with: npm test -- tests/integration/api/blawby-api.test.ts"
echo "   2. Verify the secure setup with: npx wrangler d1 execute DB --command \"SELECT slug, json_extract(config, '$.blawbyApi.enabled') as api_enabled, CASE WHEN json_extract(config, '$.blawbyApi.apiKey') IS NOT NULL THEN 'INSECURE' ELSE 'SECURE' END as status FROM teams WHERE slug = 'blawby-ai';\""
