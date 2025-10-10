-- Base Schema Migration
-- Creates all base tables needed for Blawby AI Chatbot

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  domain TEXT,
  config JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_info JSON,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  matter_id TEXT,
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contact form submissions table
CREATE TABLE IF NOT EXISTS contact_forms (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  organization_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  matter_details TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  assigned_lawyer TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  payment_required BOOLEAN DEFAULT FALSE,
  payment_amount INTEGER,
  intake_form JSON,
  active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lawyers table
CREATE TABLE IF NOT EXISTS lawyers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialties JSON,
  status TEXT DEFAULT 'active',
  role TEXT DEFAULT 'attorney',
  hourly_rate INTEGER,
  bar_number TEXT,
  license_state TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Matters table
CREATE TABLE IF NOT EXISTS matters (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  matter_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'lead',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_lawyer_id TEXT,
  lead_source TEXT,
  estimated_value INTEGER,
  billable_hours REAL DEFAULT 0,
  flat_fee INTEGER,
  retainer_amount INTEGER,
  retainer_balance INTEGER DEFAULT 0,
  statute_of_limitations DATE,
  court_jurisdiction TEXT,
  opposing_party TEXT,
  matter_number TEXT,
  tags JSON,
  custom_fields JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME
);

-- Matter events table
CREATE TABLE IF NOT EXISTS matter_events (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATETIME NOT NULL,
  created_by_lawyer_id TEXT,
  billable_time REAL DEFAULT 0,
  billing_rate INTEGER,
  amount INTEGER,
  tags JSON,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Files table
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  matter_id TEXT,
  session_id TEXT,
  conversation_id TEXT,
  original_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  checksum TEXT,
  description TEXT,
  tags JSON,
  access_level TEXT DEFAULT 'private',
  shared_with JSON,
  version INTEGER DEFAULT 1,
  parent_file_id TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  uploaded_by_lawyer_id TEXT,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME
);

-- Chat logs table
CREATE TABLE IF NOT EXISTS chat_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  organization_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Matter questions table
CREATE TABLE IF NOT EXISTS matter_questions (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  organization_id TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT DEFAULT 'ai-form',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI generated summaries table
CREATE TABLE IF NOT EXISTS ai_generated_summaries (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  summary TEXT NOT NULL,
  model_used TEXT,
  prompt_snapshot TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI feedback table
CREATE TABLE IF NOT EXISTS ai_feedback (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  organization_id TEXT,
  rating INTEGER,
  thumbs_up BOOLEAN,
  comments TEXT,
  intent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert default organizations
INSERT OR IGNORE INTO organizations (id, slug, name, config) VALUES
('01K0TNGNKVCFT7V78Y4QF0PKH5', 'test-organization', 'Test Law Firm', '{"aiProvider": "workers-ai", "aiModel": "@cf/openai/gpt-oss-20b", "aiModelFallback": ["@cf/openai/gpt-oss-20b"], "requiresPayment": false}'),
('01K0TNGNKNJEP8EPKHXAQV4S0R', 'north-carolina-legal-services', 'North Carolina Legal Services', '{"aiProvider": "workers-ai", "aiModel": "@cf/openai/gpt-oss-20b", "aiModelFallback": ["@cf/openai/gpt-oss-20b"], "consultationFee": 75, "requiresPayment": true, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Small Business and Nonprofits", "Employment Law", "Tenant Rights Law", "Probate and Estate Planning", "Special Education and IEP Advocacy"], "serviceQuestions": {"Family Law": ["Thanks for reaching out. I know family situations can be really difficult. Can you tell me what type of family issue you''re going through? (For example, divorce, custody, child support...)"], "Small Business and Nonprofits": ["What type of business entity are you operating or planning to start?"], "Employment Law": ["I''m sorry you''re dealing with workplace issues - that can be really stressful. Can you tell me what''s been happening at work? (For example, discrimination, harassment, wage problems...)"], "Tenant Rights Law": ["What specific tenant rights issue are you facing? (eviction, repairs, security deposit, etc.)"], "Probate and Estate Planning": ["Are you dealing with probate of an estate or planning your own estate?"], "Special Education and IEP Advocacy": ["What grade level is your child in and what type of school do they attend?"]}, "domain": "northcarolinalegalservices.blawby.com", "description": "Affordable, comprehensive legal services for North Carolina. Family Law, Small Business, Employment, Tenant Rights, Probate, Special Education, and more.", "paymentLink": "https://app.blawby.com/northcarolinalegalservices/pay?amount=7500", "brandColor": "#059669", "accentColor": "#10b981", "introMessage": "Welcome to North Carolina Legal Services! I''m here to help you with affordable legal assistance in areas including Family Law, Small Business, Employment, Tenant Rights, Probate, and Special Education. I can answer your questions and help you connect with our experienced attorneys. How can I assist you today?", "profileImage": "https://app.blawby.com/storage/organization-photos/uCVk3tFuy4aTdR4ad18ibmUn4nOiVY8q4WBgYk1j.jpg", "voice": {"enabled": false, "provider": "cloudflare", "voiceId": null, "displayName": null, "previewUrl": null}}'),
('01K0TNGNKTM4Q0AG0XF0A8ST0Q', 'blawby-ai', 'Blawby AI', '{"aiProvider": "workers-ai", "aiModel": "@cf/openai/gpt-oss-20b", "aiModelFallback": ["@cf/openai/gpt-oss-20b"], "consultationFee": 0, "requiresPayment": false, "ownerEmail": "paulchrisluke@gmail.com", "availableServices": ["Family Law", "Business Law", "Contract Review", "Intellectual Property", "Employment Law", "Personal Injury", "Criminal Law", "Civil Law", "General Consultation"], "serviceQuestions": {"Family Law": ["I understand this is a difficult time. Can you tell me what type of family situation you''re dealing with?", "What are the main issues you''re facing?", "Have you taken any steps to address this situation?", "What would a good outcome look like for you?"], "Business Law": ["What type of business entity are you operating or planning to start?", "What specific legal issue are you facing with your business?", "Are you dealing with contracts, employment issues, or regulatory compliance?", "What is the size and scope of your business operations?"], "Contract Review": ["What type of contract do you need reviewed?", "What is the value or importance of this contract?", "Are there any specific concerns or red flags you''ve noticed?", "What is the timeline for this contract?"], "Intellectual Property": ["What type of intellectual property are you dealing with?", "Are you looking to protect, license, or enforce IP rights?", "What is the nature of your IP (patent, trademark, copyright, trade secret)?", "What is the commercial value or importance of this IP?"], "Employment Law": ["What specific employment issue are you facing?", "Are you an employer or employee in this situation?", "Have you taken any steps to address this issue?", "What is the timeline or urgency of your situation?"], "Personal Injury": ["Can you tell me about the incident that caused your injury?", "What type of injuries did you sustain?", "Have you received medical treatment?", "What is the current status of your recovery?"], "Criminal Law": ["What type of legal situation are you facing?", "Are you currently facing charges or under investigation?", "Have you been arrested or contacted by law enforcement?", "Do you have an attorney representing you?"], "Civil Law": ["What type of civil legal issue are you dealing with?", "Are you involved in a lawsuit or considering legal action?", "What is the nature of the dispute?", "What outcome are you hoping to achieve?"], "General Consultation": ["Thanks for reaching out! I''d love to help. Can you tell me what legal situation you''re dealing with?", "Have you been able to take any steps to address this yet?", "What would a good outcome look like for you?", "Do you have any documents or information that might be relevant?"]}, "domain": "ai.blawby.com", "description": "AI-powered legal assistance for businesses and individuals", "paymentLink": null, "brandColor": "#2563eb", "accentColor": "#3b82f6", "introMessage": "Hello! I''m Blawby AI, your intelligent legal assistant. I can help you with family law, business law, contract review, intellectual property, employment law, personal injury, criminal law, civil law, and general legal consultation. How can I assist you today?", "profileImage": null, "voice": {"enabled": false, "provider": "cloudflare", "voiceId": null, "displayName": null, "previewUrl": null}, "blawbyApi": {"enabled": false, "apiUrl": "https://staging.blawby.com"}}');

-- Insert sample lawyers
INSERT OR IGNORE INTO lawyers (id, organization_id, name, email, phone, specialties, role, hourly_rate, bar_number, license_state) VALUES
('lawyer-1', 'test-organization', 'Sarah Johnson', 'sarah@testlawfirm.com', '555-0101', '["Family Law", "Divorce", "Child Custody"]', 'attorney', 35000, 'CA123456', 'CA'),
('lawyer-2', 'test-organization', 'Michael Chen', 'michael@testlawfirm.com', '555-0102', '["Employment Law", "Workplace Discrimination"]', 'attorney', 40000, 'CA789012', 'CA'),
('paralegal-1', 'test-organization', 'Emily Rodriguez', 'emily@testlawfirm.com', '555-0103', '["Legal Research", "Document Preparation"]', 'paralegal', 7500, NULL, NULL);
