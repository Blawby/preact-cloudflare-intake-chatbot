#!/bin/bash

# Helper script to insert team data from JSON configuration files
# Usage: ./scripts/insert-team.sh <team-config-file>

set -e

if [ $# -ne 1 ]; then
    echo "Usage: $0 <team-config-file>"
    echo "Example: $0 scripts/team-configs/test-team.json"
    exit 1
fi

CONFIG_FILE="$1"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: Configuration file '$CONFIG_FILE' not found"
    exit 1
fi

# Extract team data from JSON file
TEAM_ID=$(jq -r '.id' "$CONFIG_FILE")
TEAM_SLUG=$(jq -r '.slug' "$CONFIG_FILE")
TEAM_NAME=$(jq -r '.name' "$CONFIG_FILE")
TEAM_CONFIG=$(jq -c '.config' "$CONFIG_FILE")

# Validate extracted variables
if [ -z "$TEAM_ID" ] || [ "$TEAM_ID" = "null" ]; then
    echo "Error: TEAM_ID is empty or null in configuration file '$CONFIG_FILE'"
    exit 1
fi

if [ -z "$TEAM_SLUG" ] || [ "$TEAM_SLUG" = "null" ]; then
    echo "Error: TEAM_SLUG is empty or null in configuration file '$CONFIG_FILE'"
    exit 1
fi

if [ -z "$TEAM_NAME" ] || [ "$TEAM_NAME" = "null" ]; then
    echo "Error: TEAM_NAME is empty or null in configuration file '$CONFIG_FILE'"
    exit 1
fi

if [ -z "$TEAM_CONFIG" ] || [ "$TEAM_CONFIG" = "null" ]; then
    echo "Error: TEAM_CONFIG is empty or null in configuration file '$CONFIG_FILE'"
    exit 1
fi

# Validate TEAM_CONFIG is valid JSON
if ! echo "$TEAM_CONFIG" | jq empty >/dev/null 2>&1; then
    echo "Error: TEAM_CONFIG is not valid JSON in configuration file '$CONFIG_FILE'"
    exit 1
fi

# Insert team using Base64 encoding for complex JSON to avoid SQL injection
# This approach safely handles complex JSON with backslashes, newlines, and control characters
TEAM_CONFIG_B64=$(echo -n "$TEAM_CONFIG" | base64)

# Create a temporary SQL file with parameterized approach
# We'll use a more robust method that handles the Base64-encoded config
TEMP_SQL_FILE=$(mktemp)
cat > "$TEMP_SQL_FILE" <<EOF
-- Insert team with Base64-encoded config for safety
-- The config will be decoded by the application layer when needed
INSERT INTO teams (id, slug, name, config, created_at, updated_at) 
VALUES (
  '$(printf '%s' "$TEAM_ID" | sed "s/'/''/g")',
  '$(printf '%s' "$TEAM_SLUG" | sed "s/'/''/g")', 
  '$(printf '%s' "$TEAM_NAME" | sed "s/'/''/g")',
  '$(printf '%s' "$TEAM_CONFIG_B64" | sed "s/'/''/g")',
  datetime('now'),
  datetime('now')
);
EOF

# Execute the SQL and capture both output and exit code
# Temporarily disable set -e to handle constraint violations gracefully
set +e
OUTPUT=$(wrangler d1 execute blawby-ai-chatbot --local --file="$TEMP_SQL_FILE" 2>&1)
EXIT_CODE=$?
set -e

# Clean up temporary file
rm -f "$TEMP_SQL_FILE"

# Debug output removed for production

# Check for constraint violations (team already exists) vs other errors
if [ $EXIT_CODE -ne 0 ]; then
    # Check if this is a constraint violation (team already exists)
    if echo "$OUTPUT" | grep -qi "UNIQUE constraint failed\|constraint failed\|already exists"; then
        echo "Info: Team '$TEAM_SLUG' already exists (skipped)"
        exit 0
    else
        # This is a genuine error
        echo "Error: Failed to insert team '$TEAM_SLUG'"
        echo "$OUTPUT"
        exit 1
    fi
fi

# If we get here, the team was successfully inserted
echo "Success: Team '$TEAM_SLUG' inserted successfully"

echo "✅ Processed team: $TEAM_NAME ($TEAM_SLUG)"