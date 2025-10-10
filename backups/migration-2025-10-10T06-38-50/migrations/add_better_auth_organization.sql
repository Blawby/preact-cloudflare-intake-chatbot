-- Better Auth Organization Tables Migration
-- Creates organization tables for multi-tenant lawyer team management

-- Organizations table for Better Auth
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  logo TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  metadata TEXT -- JSON for additional team config
);

-- Organization members (lawyers) with roles
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'owner', 'admin', 'attorney', 'paralegal'
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(organization_id, user_id)
);

-- Invitations for lawyer onboarding
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'expired'
  invited_by TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL
);

-- Client-Team relationships (clients interacting with teams)
CREATE TABLE IF NOT EXISTS client_team_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- client user ID
  team_id TEXT NOT NULL, -- references teams.id
  first_contact_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  last_activity_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_members_org ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_client_team_access_user ON client_team_access(user_id);
CREATE INDEX IF NOT EXISTS idx_client_team_access_team ON client_team_access(team_id);

