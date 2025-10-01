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

# Insert team using heredoc for better readability and safety
wrangler d1 execute blawby-ai-chatbot --local --command "$(cat <<EOF
INSERT OR IGNORE INTO teams (id, slug, name, config) 
VALUES ('$TEAM_ID', '$TEAM_SLUG', '$TEAM_NAME', '$TEAM_CONFIG')
EOF
)" 2>/dev/null || echo "Team '$TEAM_SLUG' already exists or insertion failed"

echo "✅ Processed team: $TEAM_NAME ($TEAM_SLUG)"