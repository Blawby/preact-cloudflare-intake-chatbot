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

# Insert team using heredoc for better readability and safety
# Escape single quotes for SQL safety
TEAM_ID_ESCAPED="${TEAM_ID//\'/\'\'}"
TEAM_SLUG_ESCAPED="${TEAM_SLUG//\'/\'\'}"
TEAM_NAME_ESCAPED="${TEAM_NAME//\'/\'\'}"
TEAM_CONFIG_ESCAPED="${TEAM_CONFIG//\'/\'\'}"

if ! wrangler d1 execute blawby-ai-chatbot --local --command "$(cat <<EOF
INSERT OR IGNORE INTO teams (id, slug, name, config) 
VALUES ('$TEAM_ID_ESCAPED', '$TEAM_SLUG_ESCAPED', '$TEAM_NAME_ESCAPED', '$TEAM_CONFIG_ESCAPED')
EOF
)"; then
    echo "Warning: Team '$TEAM_SLUG' already exists or insertion failed"
    exit 0
fi

echo "✅ Processed team: $TEAM_NAME ($TEAM_SLUG)"