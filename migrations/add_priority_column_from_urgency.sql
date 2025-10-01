-- Migration: Add priority column to matters table
-- Date: 2025-01-20
-- Description: Add priority column to matters table and migrate data from urgency column
-- Note: This migration has already been applied - priority column exists

-- This migration is now a no-op since the priority column already exists
-- We just need to ensure the index exists
CREATE INDEX IF NOT EXISTS idx_matters_priority ON matters(priority);
