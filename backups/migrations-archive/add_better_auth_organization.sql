-- Better Auth Organization Tables Migration
-- Creates organization tables for multi-tenant lawyer organization management

-- Organizations table for Better Auth (extends existing schema)
-- Note: This assumes the base organizations table already exists from schema.sql
-- We'll add Better Auth specific columns to the existing table
ALTER TABLE organizations ADD COLUMN logo TEXT;
ALTER TABLE organizations ADD COLUMN metadata TEXT; -- JSON for additional organization config

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

-- Client-Organization relationships (clients interacting with organizations)
CREATE TABLE IF NOT EXISTS client_organization_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- client user ID
  organization_id TEXT NOT NULL, -- references organizations.id
  first_contact_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  last_activity_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_members_org ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_user ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_client_organization_access_user ON client_organization_access(user_id);
CREATE INDEX IF NOT EXISTS idx_client_organization_access_organization ON client_organization_access(organization_id);

