-- Migration: Add priority column to matters table
-- Date: 2025-09-20
-- Description: Add priority column to matters table to support urgency mapping

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Add priority column to matters table if it doesn't exist
-- This supports the existing code that expects a priority column
ALTER TABLE matters ADD COLUMN priority TEXT DEFAULT 'normal';

COMMIT;
