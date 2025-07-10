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
  matter_id TEXT, -- Optional: link to specific matter for tighter integration
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (matter_id) REFERENCES matters(id)
);



-- Contact form submissions table
CREATE TABLE contact_forms (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  team_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  matter_details TEXT NOT NULL,
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
  matter_id TEXT, -- Link to matter instead of just conversation
  conversation_id TEXT, -- Optional: keep conversation link for context
  team_id TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  preferred_date DATETIME NOT NULL,
  preferred_time TEXT,
  matter_type TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Lawyers table for team member management
CREATE TABLE lawyers (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialties JSON, -- Array of practice areas
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'on_leave'
  role TEXT DEFAULT 'attorney', -- 'attorney', 'paralegal', 'admin'
  hourly_rate INTEGER, -- in cents
  bar_number TEXT,
  license_state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Matters table to represent legal matters
CREATE TABLE matters (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  matter_type TEXT NOT NULL, -- e.g., 'Family Law', 'Employment Law', etc.
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'lead', -- 'lead', 'open', 'in_progress', 'completed', 'archived'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  assigned_lawyer_id TEXT,
  lead_source TEXT, -- 'website', 'referral', 'advertising', etc.
  estimated_value INTEGER, -- in cents
  billable_hours REAL DEFAULT 0,
  flat_fee INTEGER, -- in cents, if applicable
  retainer_amount INTEGER, -- in cents
  retainer_balance INTEGER DEFAULT 0, -- in cents
  statute_of_limitations DATE,
  court_jurisdiction TEXT,
  opposing_party TEXT,
  matter_number TEXT, -- Changed from case_number to matter_number
  tags JSON, -- Array of tags for categorization
  custom_fields JSON, -- Flexible metadata storage
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (assigned_lawyer_id) REFERENCES lawyers(id)
);

-- Matter events table for matter activity logs
CREATE TABLE matter_events (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'note', 'call', 'email', 'meeting', 'filing', 'payment', 'status_change'
  title TEXT NOT NULL,
  description TEXT,
  event_date DATETIME NOT NULL,
  created_by_lawyer_id TEXT,
  billable_time REAL DEFAULT 0, -- hours
  billing_rate INTEGER, -- in cents per hour
  amount INTEGER, -- in cents, for expenses/payments
  tags JSON, -- Array of tags
  metadata JSON, -- Additional structured data
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id),
  FOREIGN KEY (created_by_lawyer_id) REFERENCES lawyers(id)
);

-- Files table (replaces uploaded_files) - general-purpose file management
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  matter_id TEXT, -- Optional: link to specific matter
  session_id TEXT, -- Optional: link to chat session
  conversation_id TEXT, -- Optional: link to conversation
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL, -- Storage filename
  file_path TEXT, -- Full storage path
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  checksum TEXT, -- For integrity verification
  description TEXT,
  tags JSON, -- Array of tags for categorization
  access_level TEXT DEFAULT 'private', -- 'public', 'private', 'team', 'client'
  shared_with JSON, -- Array of user IDs who have access
  version INTEGER DEFAULT 1,
  parent_file_id TEXT, -- For versioning
  is_deleted BOOLEAN DEFAULT FALSE,
  uploaded_by_lawyer_id TEXT,
  metadata JSON, -- Additional file metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (matter_id) REFERENCES matters(id),
  FOREIGN KEY (parent_file_id) REFERENCES files(id),
  FOREIGN KEY (uploaded_by_lawyer_id) REFERENCES lawyers(id)
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

-- Matter questions table for Q&A pairs from intake
CREATE TABLE matter_questions (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  team_id TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT DEFAULT 'ai-form', -- 'ai-form' | 'human-entry' | 'followup'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (matter_id) REFERENCES matters(id)
);

-- AI generated summaries table for markdown matter summaries
CREATE TABLE ai_generated_summaries (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  summary TEXT NOT NULL,
  model_used TEXT,
  prompt_snapshot TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id)
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

-- Insert sample lawyers
INSERT INTO lawyers (id, team_id, name, email, phone, specialties, role, hourly_rate, bar_number, license_state) VALUES 
('lawyer-1', 'test-team', 'Sarah Johnson', 'sarah@testlawfirm.com', '555-0101', '["Family Law", "Divorce", "Child Custody"]', 'attorney', 35000, 'CA123456', 'CA'),
('lawyer-2', 'test-team', 'Michael Chen', 'michael@testlawfirm.com', '555-0102', '["Employment Law", "Workplace Discrimination"]', 'attorney', 40000, 'CA789012', 'CA'),
('paralegal-1', 'test-team', 'Emily Rodriguez', 'emily@testlawfirm.com', '555-0103', '["Legal Research", "Document Preparation"]', 'paralegal', 7500, NULL, NULL); 