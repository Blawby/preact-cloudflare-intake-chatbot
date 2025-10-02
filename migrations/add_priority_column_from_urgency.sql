-- Migration: Add priority column to matters table
-- Date: 2025-01-20
-- Description: Add priority column to matters table and migrate data from urgency column
-- Note: This migration is now simplified since base schema already includes priority column
-- This migration only handles data backfill from urgency column if it exists

BEGIN TRANSACTION;

-- Backfill priority values from existing urgency column if it exists
-- SQLite doesn't have an easy way to check if a column exists, so we attempt the UPDATE
-- If urgency column doesn't exist, this migration will fail, but that's expected for fresh installs
-- For fresh installs using 00000000_base_schema.sql, this migration can be safely skipped

-- Try to update priority from urgency if urgency column exists
-- This will error on fresh installs (no urgency column), but that's okay - the migration system handles it
UPDATE matters SET priority =
  CASE
    WHEN urgency = 'low' THEN 'low'
    WHEN urgency = 'high' THEN 'high'
    ELSE 'normal'
  END
WHERE urgency IS NOT NULL
  AND (priority IS NULL OR priority = 'normal');

-- Create index on priority column for better query performance
-- This is idempotent - will only create if not exists
CREATE INDEX IF NOT EXISTS idx_matters_priority ON matters(priority);

COMMIT;
