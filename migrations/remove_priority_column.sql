-- Migration to remove priority column from matters table
-- This migration removes the priority column that was previously used to categorize matter urgency
-- This migration is idempotent and safe to run even if the priority column doesn't exist

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Create a new table without the priority column, using the correct schema from schema.sql
CREATE TABLE matters_new (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    matter_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'lead',
    assigned_lawyer_id TEXT,
    lead_source TEXT,
    estimated_value INTEGER,
    billable_hours REAL DEFAULT 0,
    flat_fee INTEGER,
    retainer_amount INTEGER,
    retainer_balance INTEGER DEFAULT 0,
    statute_of_limitations DATE,
    court_jurisdiction TEXT,
    opposing_party TEXT,
    matter_number TEXT,
    tags JSON,
    custom_fields JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (assigned_lawyer_id) REFERENCES lawyers(id)
);

-- Copy data from old table to new table, excluding the priority column
-- This will work whether or not the priority column exists
INSERT INTO matters_new (
    id, team_id, client_name, client_email, client_phone, matter_type, title, description,
    status, assigned_lawyer_id, lead_source, estimated_value, billable_hours, flat_fee,
    retainer_amount, retainer_balance, statute_of_limitations, court_jurisdiction,
    opposing_party, matter_number, tags, custom_fields, created_at, updated_at, closed_at
)
SELECT 
    id, team_id, client_name, client_email, client_phone, matter_type, title, description,
    status, assigned_lawyer_id, lead_source, estimated_value, billable_hours, flat_fee,
    retainer_amount, retainer_balance, statute_of_limitations, court_jurisdiction,
    opposing_party, matter_number, tags, custom_fields, created_at, updated_at, closed_at
FROM matters;

-- Drop the old table
DROP TABLE matters;

-- Rename the new table to the original name
ALTER TABLE matters_new RENAME TO matters;

-- Recreate any indexes that might have existed on the original table
CREATE INDEX IF NOT EXISTS idx_matters_team_id ON matters(team_id);
CREATE INDEX IF NOT EXISTS idx_matters_status ON matters(status);
CREATE INDEX IF NOT EXISTS idx_matters_assigned_lawyer ON matters(assigned_lawyer_id);
CREATE INDEX IF NOT EXISTS idx_matters_created_at ON matters(created_at);
CREATE INDEX IF NOT EXISTS idx_matters_matter_type ON matters(matter_type);
CREATE INDEX IF NOT EXISTS idx_matters_client_name ON matters(client_name);

COMMIT;
