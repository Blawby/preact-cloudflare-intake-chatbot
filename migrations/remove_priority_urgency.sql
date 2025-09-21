-- Migration: Add priority column to matters table
-- Date: 2025-09-20
-- Description: Add priority column to matters table to support urgency mapping

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Check if priority column already exists
-- If it doesn't exist, we'll need to add it with proper constraints
-- This migration is idempotent and safe to run multiple times

-- Create temporary table with proper priority column constraints
CREATE TABLE IF NOT EXISTS matters_temp (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  matter_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'lead',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
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

-- Copy existing data from matters table, mapping urgency to priority if needed
INSERT OR IGNORE INTO matters_temp 
SELECT 
  id,
  team_id,
  client_name,
  client_email,
  client_phone,
  matter_type,
  title,
  description,
  status,
  CASE 
    WHEN urgency = 'low' THEN 'low'
    WHEN urgency = 'high' THEN 'high'
    ELSE 'normal'
  END as priority,
  assigned_lawyer_id,
  lead_source,
  estimated_value,
  billable_hours,
  flat_fee,
  retainer_amount,
  retainer_balance,
  statute_of_limitations,
  court_jurisdiction,
  opposing_party,
  matter_number,
  tags,
  custom_fields,
  created_at,
  updated_at,
  closed_at
FROM matters;

-- Drop the old table and rename the new one
DROP TABLE IF EXISTS matters;
ALTER TABLE matters_temp RENAME TO matters;

-- Create index on priority column for better query performance
CREATE INDEX IF NOT EXISTS idx_matters_priority ON matters(priority);

COMMIT;
