-- Migration: Remove priority/urgency from matters table
-- Date: 2025-09-20
-- Description: Remove priority column from matters table to simplify the app

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Remove priority column from matters table
ALTER TABLE matters DROP COLUMN priority;

COMMIT;
