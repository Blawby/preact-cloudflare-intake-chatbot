PRAGMA foreign_keys = ON;

-- Ensure files table exists for file metadata persistence. This migration
-- intentionally keeps the column set minimal so it can run safely in
-- production even if a more feature-rich schema is introduced later.
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  session_id TEXT,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  mime_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_files_team_session ON files(team_id, session_id);

