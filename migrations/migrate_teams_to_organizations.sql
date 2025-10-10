-- Migration: Teams to Better Auth Organizations
-- This migration replaces the legacy teams system with Better Auth organizations
-- Run this after ensuring all team data is backed up

-- Step 1: Drop foreign key constraints that reference team_id
-- Note: SQLite doesn't support DROP CONSTRAINT, so we'll recreate tables

-- Step 2: Rename all team_id columns to organization_id
-- conversations table
ALTER TABLE conversations ADD COLUMN organization_id TEXT;
UPDATE conversations SET organization_id = team_id WHERE team_id IS NOT NULL;
-- Note: We'll drop the old column after recreating the table

-- contact_forms table  
ALTER TABLE contact_forms ADD COLUMN organization_id TEXT;
UPDATE contact_forms SET organization_id = team_id WHERE team_id IS NOT NULL;

-- services table
ALTER TABLE services ADD COLUMN organization_id TEXT;
UPDATE services SET organization_id = team_id WHERE team_id IS NOT NULL;

-- client_team_access table
ALTER TABLE client_team_access ADD COLUMN organization_id TEXT;
UPDATE client_team_access SET organization_id = team_id WHERE team_id IS NOT NULL;

-- Step 3: Create new tables without team_id columns
-- Recreate conversations table
CREATE TABLE conversations_new (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_info JSON,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data to new table
INSERT INTO conversations_new (id, organization_id, session_id, user_info, status, created_at, updated_at)
SELECT id, organization_id, session_id, user_info, status, created_at, updated_at
FROM conversations;

-- Drop old table and rename new one
DROP TABLE conversations;
ALTER TABLE conversations_new RENAME TO conversations;

-- Recreate contact_forms table
CREATE TABLE contact_forms_new (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  organization_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  matter_details TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  assigned_lawyer TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data to new table
INSERT INTO contact_forms_new (id, conversation_id, organization_id, phone_number, email, matter_details, status, assigned_lawyer, notes, created_at, updated_at)
SELECT id, conversation_id, organization_id, phone_number, email, matter_details, status, assigned_lawyer, notes, created_at, updated_at
FROM contact_forms;

-- Drop old table and rename new one
DROP TABLE contact_forms;
ALTER TABLE contact_forms_new RENAME TO contact_forms;

-- Recreate services table
CREATE TABLE services_new (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  payment_required BOOLEAN DEFAULT FALSE,
  payment_amount INTEGER,
  intake_form JSON,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data to new table
INSERT INTO services_new (id, organization_id, name, description, payment_required, payment_amount, intake_form, active, created_at)
SELECT id, organization_id, name, description, payment_required, payment_amount, intake_form, active, created_at
FROM services;

-- Drop old table and rename new one
DROP TABLE services;
ALTER TABLE services_new RENAME TO services;

-- Recreate client_team_access as client_organization_access
CREATE TABLE client_organization_access (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  first_contact_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  last_activity_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  UNIQUE(user_id, organization_id)
);

-- Copy data to new table
INSERT INTO client_organization_access (id, user_id, organization_id, first_contact_at, last_activity_at)
SELECT id, user_id, organization_id, first_contact_at, last_activity_at
FROM client_team_access;

-- Drop old table
DROP TABLE client_team_access;

-- Step 4: Remove team_id and role columns from users table
-- Create new users table without team_id and role
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER DEFAULT 0 NOT NULL,
  image TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')) NOT NULL,
  phone TEXT
);

-- Copy data to new table (excluding team_id and role)
INSERT INTO users_new (id, name, email, email_verified, image, created_at, updated_at, phone)
SELECT id, name, email, email_verified, image, created_at, updated_at, phone
FROM users;

-- Drop old table and rename new one
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Step 5: Drop legacy tables
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS lawyers;

-- Step 6: Create indexes for new organization_id columns
CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_contact_forms_organization ON contact_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_organization ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_org_access_user ON client_organization_access(user_id);
CREATE INDEX IF NOT EXISTS idx_client_org_access_org ON client_organization_access(organization_id);

-- Step 7: Create foreign key constraints (if supported)
-- Note: SQLite foreign keys are enabled via PRAGMA foreign_keys = ON
-- The constraints will be enforced by the application layer

-- Step 8: Verify migration
-- Check that all tables have organization_id instead of team_id
-- Check that legacy tables are removed
-- Check that indexes are created

-- Migration complete!
-- Next steps:
-- 1. Update application code to use organization_id
-- 2. Implement Better Auth organization auto-creation
-- 3. Update RBAC middleware
-- 4. Test the new organization system
