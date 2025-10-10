-- Add user_id columns for persistent storage
-- Allows tracking authenticated users while maintaining anonymous session support

-- Add user_id to conversations for authenticated users
ALTER TABLE conversations ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

-- Add user_id to matters for authenticated users
ALTER TABLE matters ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_matters_user ON matters(user_id);

-- Add user_id to messages for tracking
ALTER TABLE messages ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);

-- Add user_id to files for ownership
ALTER TABLE files ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);

