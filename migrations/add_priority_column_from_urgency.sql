-- Migration: Add priority column to matters table
-- Date: 2025-01-20
-- Description: Add priority column to matters table and migrate data from urgency column
-- Note: Migration is now idempotent - can be run multiple times safely

BEGIN TRANSACTION;

-- Add priority column with proper constraints (idempotent)
DO $$
BEGIN
    -- Check if priority column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matters' 
        AND column_name = 'priority'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE matters ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal';
    END IF;
    
    -- Check if check constraint exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_name = 'matters'
        AND tc.constraint_type = 'CHECK'
        AND cc.check_clause LIKE '%priority%'
        AND tc.table_schema = 'public'
    ) THEN
        ALTER TABLE matters ADD CONSTRAINT matters_priority_check CHECK(priority IN ('low','normal','high'));
    END IF;
END $$;

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
