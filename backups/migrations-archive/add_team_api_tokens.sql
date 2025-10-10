-- Add organization_api_tokens table for API token management
-- This table stores API tokens for organizations with secure hashing

CREATE TABLE IF NOT EXISTS organization_api_tokens (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  token_name TEXT NOT NULL, -- Human-readable name for the token
  token_hash TEXT NOT NULL, -- SHA-256 hash of the actual token
  permissions JSON, -- Array of permissions this token has
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  expires_at DATETIME, -- Optional expiration date
  created_by TEXT, -- Who created this token
  notes TEXT,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_organization_api_tokens_organization_id ON organization_api_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_api_tokens_token_hash ON organization_api_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_organization_api_tokens_active ON organization_api_tokens(active);
