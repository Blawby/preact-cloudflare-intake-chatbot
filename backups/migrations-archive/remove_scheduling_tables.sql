-- Migration to remove scheduling-related tables and data
-- This migration removes the appointments table and any related scheduling functionality

-- Drop the appointments table
DROP TABLE IF EXISTS appointments;

-- Note: The appointments table was used for storing consultation scheduling data
-- This migration removes all scheduling functionality from the application
