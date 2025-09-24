-- Blawby AI Chatbot Database Schema

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY, -- This will be the ULID
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- Human-readable identifier (e.g., "north-carolina-legal-services")
  domain TEXT,
  config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
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
CREATE TABLE IF NOT EXISTS messages (
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
CREATE TABLE IF NOT EXISTS contact_forms (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  team_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  matter_details TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'closed'
  assigned_lawyer TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
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



-- Lawyers table for team member management
CREATE TABLE IF NOT EXISTS lawyers (
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
CREATE TABLE IF NOT EXISTS matters (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  matter_type TEXT NOT NULL, -- e.g., 'Family Law', 'Employment Law', etc.
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'lead', -- 'lead', 'open', 'in_progress', 'completed', 'archived'
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')), -- 'low', 'normal', 'high' - maps from urgency
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
CREATE TABLE IF NOT EXISTS matter_events (
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
CREATE TABLE IF NOT EXISTS files (
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
CREATE TABLE IF NOT EXISTS chat_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  team_id TEXT,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Matter questions table for Q&A pairs from intake
CREATE TABLE IF NOT EXISTS matter_questions (
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
CREATE TABLE IF NOT EXISTS ai_generated_summaries (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  summary TEXT NOT NULL,
  model_used TEXT,
  prompt_snapshot TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id)
);

-- AI feedback table for user quality ratings and intent tags
CREATE TABLE IF NOT EXISTS ai_feedback (
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



-- Insert default teams with proper ULIDs
-- Note: API keys and sensitive configuration should be set via the setup script, not in schema
-- Run ./scripts/setup-blawby-api.sh to configure the blawby-ai team with API credentials
INSERT INTO teams (id, slug, name, config) VALUES 
('01K0TNGNKVCFT7V78Y4QF0PKH5', 'test-team', 'Test Law Firm', '{"aiModel": "llama", "requiresPayment": false}'),
('01K0TNGNKNJEP8EPKHXAQV4S0R', 'north-carolina-legal-services', 'North Carolina Legal Services', '{"aiModel": "llama", "consultationFee": 75, "requiresPayment": true, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Small Business and Nonprofits", "Employment Law", "Tenant Rights Law", "Probate and Estate Planning", "Special Education and IEP Advocacy"], "serviceQuestions": {"Family Law": ["Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you're going through? (For example, divorce, custody, child support...)"], "Small Business and Nonprofits": ["What type of business entity are you operating or planning to start?"], "Employment Law": ["I'm sorry you're dealing with workplace issues - that can be really stressful. Can you tell me what's been happening at work? (For example, discrimination, harassment, wage problems...)"], "Tenant Rights Law": ["What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)"], "Probate and Estate Planning": ["Are you dealing with probate of an estate or planning your own estate?"], "Special Education and IEP Advocacy": ["What grade level is your child in and what type of school do they attend?"]}, "domain": "northcarolinalegalservices.blawby.com", "description": "Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.", "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I'm here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/team-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg"}'),
('01K0TNGNKTM4Q0AG0XF0A8ST0Q', 'blawby-ai', 'Blawby AI', '{"aiModel": "llama", "consultationFee": 0, "requiresPayment": false, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Business Law", "Contract Review", "Intellectual Property", "Employment Law", "Personal Injury", "Criminal Law", "Civil Law", "General Consultation"], "serviceQuestions": {"Family Law": ["I understand this is a difficult time. Can you tell me what type of family situation you're dealing with?", "What are the main issues you're facing?", "Have you taken any steps to address this situation?", "What would a good outcome look like for you?"], "Business Law": ["What type of business entity are you operating or planning to start?", "What specific legal issue are you facing with your business?", "Are you dealing with contracts, employment issues, or regulatory compliance?", "What is the size and scope of your business operations?"], "Contract Review": ["What type of contract do you need reviewed?", "What is the value or importance of this contract?", "Are there any specific concerns or red flags you've noticed?", "What is the timeline for this contract?"], "Intellectual Property": ["What type of intellectual property are you dealing with?", "Are you looking to protect, license, or enforce IP rights?", "What is the nature of your IP (patent, trademark, copyright, trade secret)?", "What is the commercial value or importance of this IP?"], "Employment Law": ["What specific employment issue are you facing?", "Are you an employer or employee in this situation?", "Have you taken any steps to address this issue?", "What is the timeline or urgency of your situation?"], "Personal Injury": ["Can you tell me about the incident that caused your injury?", "What type of injuries did you sustain?", "Have you received medical treatment?", "What is the current status of your recovery?"], "Criminal Law": ["What type of legal situation are you facing?", "Are you currently facing charges or under investigation?", "Have you been arrested or contacted by law enforcement?", "Do you have an attorney representing you?"], "Civil Law": ["What type of civil legal issue are you dealing with?", "Are you involved in a lawsuit or considering legal action?", "What is the nature of the dispute?", "What outcome are you hoping to achieve?"], "General Consultation": ["Thanks for reaching out! I'd love to help. Can you tell me what legal situation you're dealing with?", "Have you been able to take any steps to address this yet?", "What would a good outcome look like for you?", "Do you have any documents or information that might be relevant?"]}, "domain": "ai.blawby.com", "description": "AI-powered legal assistance for businesses and individuals", "paymentLink": null, "brandColor": "#2563eb", "accentColor": "#3b82f6", "introMessage": "Hello! I'm Blawby AI, your intelligent legal assistant. I can help you with family law, business law, contract review, intellectual property, employment law, personal injury, criminal law, civil law, and general legal consultation. How can I assist you today?", "profileImage": null, "blawbyApi": {"enabled": false, "apiUrl": "https://staging.blawby.com"}}');

-- Payment history table for tracking all payment transactions
CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  team_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed', 'cancelled', 'refunded'
  event_type TEXT NOT NULL, -- 'payment.completed', 'payment.failed', 'payment.refunded', etc.
  matter_type TEXT,
  matter_description TEXT,
  invoice_url TEXT,
  metadata JSON, -- Additional payment data
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Team API tokens table for secure token storage
CREATE TABLE IF NOT EXISTS team_api_tokens (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  token_name TEXT NOT NULL, -- Human-readable name for the token
  token_hash TEXT NOT NULL, -- SHA-256 hash of the actual token
  permissions JSON, -- Array of permissions this token has
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  expires_at DATETIME, -- Optional expiration date
  created_by TEXT, -- Who created this token
  notes TEXT,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Insert sample lawyers
INSERT INTO lawyers (id, team_id, name, email, phone, specialties, role, hourly_rate, bar_number, license_state) VALUES 
('lawyer-1', 'test-team', 'Sarah Johnson', 'sarah@testlawfirm.com', '555-0101', '["Family Law", "Divorce", "Child Custody"]', 'attorney', 35000, 'CA123456', 'CA'),
('lawyer-2', 'test-team', 'Michael Chen', 'michael@testlawfirm.com', '555-0102', '["Employment Law", "Workplace Discrimination"]', 'attorney', 40000, 'CA789012', 'CA'),
('paralegal-1', 'test-team', 'Emily Rodriguez', 'emily@testlawfirm.com', '555-0103', '["Legal Research", "Document Preparation"]', 'paralegal', 7500, NULL, NULL); 