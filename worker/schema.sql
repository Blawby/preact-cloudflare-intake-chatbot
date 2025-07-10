-- Blawby AI Chatbot Database Schema

-- Teams table
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_info JSON,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);



-- Contact form submissions table
CREATE TABLE contact_forms (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  team_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  case_details TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'consultation_scheduled', 'closed'
  assigned_lawyer TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Services table
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  requires_payment BOOLEAN DEFAULT FALSE,
  payment_amount INTEGER,
  intake_form JSON,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Appointments table
CREATE TABLE appointments (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  scheduled_date DATETIME NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- File uploads table
CREATE TABLE uploaded_files (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- AI Training Data Tables --

-- Chat logs table for long-term storage of chat sessions
CREATE TABLE chat_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  team_id TEXT,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Case questions table for Q&A pairs from intake
CREATE TABLE case_questions (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  team_id TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT DEFAULT 'ai-form', -- 'ai-form' | 'human-entry' | 'followup'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- AI generated summaries table for markdown case summaries
CREATE TABLE ai_generated_summaries (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  summary TEXT NOT NULL,
  model_used TEXT,
  prompt_snapshot TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI feedback table for user quality ratings and intent tags
CREATE TABLE ai_feedback (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  team_id TEXT,
  rating INTEGER, -- 1-5 scale
  thumbs_up BOOLEAN,
  comments TEXT,
  intent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Insert default team
INSERT INTO teams (id, name, config) VALUES 
('test-team', 'Test Law Firm', '{"aiModel": "llama", "requiresPayment": false}'); 