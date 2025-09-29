PRAGMA foreign_keys = ON;

-- Add UNIQUE constraint on (id, team_id) to chat_sessions table
-- This ensures that each session ID can only be associated with one team
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_id_team_unique ON chat_sessions(id, team_id);

-- Drop the existing foreign key constraint on team_id in chat_messages
-- We need to recreate the table to change the foreign key constraint
-- First, create a backup table with the new structure
CREATE TABLE chat_messages_new (
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

-- Copy data from old table to new table
INSERT INTO chat_messages_new 
SELECT id, session_id, team_id, role, content, metadata, token_count, created_at
FROM chat_messages;

-- Drop the old table
DROP TABLE chat_messages;

-- Rename the new table to the original name
ALTER TABLE chat_messages_new RENAME TO chat_messages;

-- Recreate the indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_team ON chat_messages(team_id);
