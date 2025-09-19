-- Migration to remove priority column from matters table
-- This migration removes the priority column that was previously used to categorize matter urgency

-- Drop the priority column from the matters table
ALTER TABLE matters DROP COLUMN priority;

-- Note: This migration assumes the priority column exists in the current database
-- If the column doesn't exist, this migration will fail gracefully in most SQLite implementations
