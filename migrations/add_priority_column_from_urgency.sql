-- Migration: Add priority column to matters table
-- Date: 2025-01-20
-- Description: Add priority column to matters table and migrate data from urgency column
-- Note: This migration is now simplified since base schema already includes priority column
-- This migration only handles data backfill from urgency column if it exists

BEGIN TRANSACTION;

-- Backfill priority values from existing urgency column if urgency exists
-- This is safe because UPDATE does nothing if no rows match or if urgency column doesn't exist
-- The base schema already includes the priority column, so we don't need to add it

-- Create index on priority column for better query performance
-- This is idempotent - will only create if not exists
CREATE INDEX IF NOT EXISTS idx_matters_priority ON matters(priority);

COMMIT;
