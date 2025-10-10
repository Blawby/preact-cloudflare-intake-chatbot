-- Simple migration to rename organization tables (legacy team references)
-- This assumes the database already has both legacy and Better Auth tables

-- Step 1: Rename team_api_tokens to organization_api_tokens
ALTER TABLE team_api_tokens RENAME TO organization_api_tokens;

-- Step 2: Rename client_team_access to client_organization_access
ALTER TABLE client_team_access RENAME TO client_organization_access;

-- Step 3: Add organization_id columns to tables that still have team_id
-- conversations table
ALTER TABLE conversations ADD COLUMN organization_id TEXT;
UPDATE conversations SET organization_id = team_id WHERE team_id IS NOT NULL;

-- contact_forms table  
ALTER TABLE contact_forms ADD COLUMN organization_id TEXT;
UPDATE contact_forms SET organization_id = team_id WHERE team_id IS NOT NULL;

-- services table
ALTER TABLE services ADD COLUMN organization_id TEXT;
UPDATE services SET organization_id = team_id WHERE team_id IS NOT NULL;

-- client_organization_access table
ALTER TABLE client_organization_access ADD COLUMN organization_id TEXT;
UPDATE client_organization_access SET organization_id = team_id WHERE team_id IS NOT NULL;

-- Step 4: Create indexes for new organization_id columns
CREATE INDEX IF NOT EXISTS idx_conversations_organization ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_contact_forms_organization ON contact_forms(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_organization ON services(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_org_access_user ON client_organization_access(user_id);
CREATE INDEX IF NOT EXISTS idx_client_org_access_org ON client_organization_access(organization_id);

-- Migration complete!
-- Note: We're keeping the legacy tables for now to avoid breaking existing data
-- The application code now uses organization_id instead of team_id
