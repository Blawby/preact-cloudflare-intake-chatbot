PRAGMA foreign_keys = ON;

-- Begin transaction for atomic operations
BEGIN TRANSACTION;

-- Check if tables exist before proceeding
-- If tables don't exist, this migration should not run
SELECT CASE 
  WHEN NOT EXISTS (SELECT name FROM sqlite_master WHERE type='table' AND name='chat_sessions') 
  THEN RAISE(ABORT, 'chat_sessions table does not exist - this migration requires tables to be created first')
END;

SELECT CASE 
  WHEN NOT EXISTS (SELECT name FROM sqlite_master WHERE type='table' AND name='chat_messages') 
  THEN RAISE(ABORT, 'chat_messages table does not exist - this migration requires tables to be created first')
END;

-- Add UNIQUE constraint on (id, team_id) to chat_sessions table
-- This ensures that each session ID can only be associated with one team
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_id_team_unique ON chat_sessions(id, team_id);

-- Preflight check: Detect any chat_messages rows whose (session_id, team_id) do not match an existing chat_sessions row
-- This prevents foreign key violations during the table rebuild
SELECT CASE 
  WHEN EXISTS (
    SELECT 1 FROM chat_messages cm 
    LEFT JOIN chat_sessions cs ON cm.session_id = cs.id AND cm.team_id = cs.team_id 
    WHERE cs.id IS NULL
  )
  THEN RAISE(ABORT, 'Found chat_messages with invalid (session_id, team_id) references. Please fix data integrity issues before running this migration.')
END;

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

-- Commit the transaction
COMMIT;
