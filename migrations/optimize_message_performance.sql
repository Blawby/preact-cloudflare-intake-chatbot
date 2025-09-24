-- Optimize Message Performance Migration
-- This migration adds indexes and metadata fields for better performance and analytics

-- Add indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_team_id ON conversations(team_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_user ON messages(is_user);

CREATE INDEX IF NOT EXISTS idx_files_session_id ON files(session_id);
CREATE INDEX IF NOT EXISTS idx_files_team_id ON files(team_id);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_is_deleted ON files(is_deleted);

-- Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_session_not_deleted ON files(session_id, is_deleted);

-- Add metadata columns to conversations for analytics (if they don't exist)
-- Note: SQLite doesn't support IF NOT EXISTS for columns, so we'll use a more careful approach

-- Check if columns exist first by trying to add them
-- This will fail silently if they already exist
ALTER TABLE conversations ADD COLUMN message_count INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN file_count INTEGER DEFAULT 0;
ALTER TABLE conversations ADD COLUMN last_message_at DATETIME;
ALTER TABLE conversations ADD COLUMN user_agent TEXT;
ALTER TABLE conversations ADD COLUMN ip_address TEXT;

-- Update existing conversations with current counts
UPDATE conversations 
SET message_count = (
  SELECT COUNT(*) 
  FROM messages 
  WHERE messages.conversation_id = conversations.id
),
file_count = (
  SELECT COUNT(*) 
  FROM files 
  WHERE files.session_id = conversations.session_id 
  AND files.is_deleted = FALSE
),
last_message_at = (
  SELECT MAX(created_at) 
  FROM messages 
  WHERE messages.conversation_id = conversations.id
)
WHERE id IN (
  SELECT DISTINCT conversation_id 
  FROM messages
);

-- Create triggers to maintain counts automatically
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_conversation_on_message_insert;
DROP TRIGGER IF EXISTS update_conversation_on_message_delete;
DROP TRIGGER IF EXISTS update_conversation_on_file_insert;
DROP TRIGGER IF EXISTS update_conversation_on_file_delete;

-- Trigger to update conversation when message is inserted
CREATE TRIGGER update_conversation_on_message_insert
AFTER INSERT ON messages
BEGIN
  UPDATE conversations 
  SET 
    message_count = message_count + 1,
    last_message_at = NEW.created_at,
    updated_at = datetime('now')
  WHERE id = NEW.conversation_id;
END;

-- Trigger to update conversation when message is deleted
CREATE TRIGGER update_conversation_on_message_delete
AFTER DELETE ON messages
BEGIN
  UPDATE conversations 
  SET 
    message_count = message_count - 1,
    updated_at = datetime('now')
  WHERE id = OLD.conversation_id;
END;

-- Trigger to update conversation when file is inserted
CREATE TRIGGER update_conversation_on_file_insert
AFTER INSERT ON files
BEGIN
  UPDATE conversations 
  SET 
    file_count = file_count + 1,
    updated_at = datetime('now')
  WHERE session_id = NEW.session_id;
END;

-- Trigger to update conversation when file is soft-deleted
CREATE TRIGGER update_conversation_on_file_delete
AFTER UPDATE OF is_deleted ON files
WHEN OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE
BEGIN
  UPDATE conversations 
  SET 
    file_count = file_count - 1,
    updated_at = datetime('now')
  WHERE session_id = NEW.session_id;
END;
