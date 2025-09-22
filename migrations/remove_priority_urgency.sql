-- Migration: Add priority column to matters table
-- Date: 2025-09-20
-- Description: Add priority column to matters table to support urgency mapping
-- This is a ONE-TIME migration that will fail if run multiple times

BEGIN TRANSACTION;

-- Add priority column with proper constraints
ALTER TABLE matters ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high'));

-- Backfill priority values from existing urgency column
UPDATE matters SET priority = 
  CASE 
    WHEN urgency = 'low' THEN 'low'
    WHEN urgency = 'high' THEN 'high'
    ELSE 'normal'
  END
WHERE urgency IS NOT NULL;

-- Create index on priority column for better query performance
CREATE INDEX IF NOT EXISTS idx_matters_priority ON matters(priority);

COMMIT;
