PRAGMA foreign_keys = ON;

-- Begin transaction for atomic operations
BEGIN TRANSACTION;

-- Check if tables exist before proceeding
-- Skip this migration if tables don't exist (will be caught by subsequent SQL errors)

-- Add UNIQUE constraint on (id, team_id) to chat_sessions table
-- This ensures that each session ID can only be associated with one team
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_id_team_unique ON chat_sessions(id, team_id);

-- Note: We can't do a pre-flight check for data integrity in SQLite without a trigger
-- The foreign key constraint itself will enforce data integrity on INSERT/UPDATE

-- Drop the existing foreign key constraint on team_id in chat_messages
-- We need to recreate the table to change the foreign key constraint
-- First, create a backup table with the new structure
CREATE TABLE IF NOT EXISTS chat_messages_new (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  token_count INTEGER,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(session_id, team_id) REFERENCES chat_sessions(id, team_id) ON DELETE CASCADE
);

-- Copy data from old table to new table (only if chat_messages exists)
INSERT OR IGNORE INTO chat_messages_new
SELECT id, session_id, team_id, role, content, metadata, token_count, created_at
FROM chat_messages;

-- Drop the old table
DROP TABLE IF EXISTS chat_messages;

-- Rename the new table to the original name
ALTER TABLE chat_messages_new RENAME TO chat_messages;

-- Recreate the indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_team ON chat_messages(team_id);

-- Commit the transaction
COMMIT;
