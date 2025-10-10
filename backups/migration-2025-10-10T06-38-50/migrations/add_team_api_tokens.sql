-- Add team_api_tokens table for API token management
-- This table stores API tokens for teams with secure hashing

CREATE TABLE IF NOT EXISTS team_api_tokens (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  token_name TEXT NOT NULL, -- Human-readable name for the token
  token_hash TEXT NOT NULL, -- SHA-256 hash of the actual token
  permissions JSON, -- Array of permissions this token has
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  expires_at DATETIME, -- Optional expiration date
  created_by TEXT, -- Who created this token
  notes TEXT,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_team_api_tokens_team_id ON team_api_tokens(team_id);
CREATE INDEX IF NOT EXISTS idx_team_api_tokens_token_hash ON team_api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_team_api_tokens_active ON team_api_tokens(active);
