-- Blawby AI Chatbot Database Schema

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Organizations table
CREATE TABLE IF NOT EXISTS organization (
  id TEXT PRIMARY KEY, -- This will be the ULID
  name TEXT NOT NULL,
  slug TEXT UNIQUE, -- Human-readable identifier (e.g., "north-carolina-legal-services")
  domain TEXT,
  config JSON,
  stripe_customer_id TEXT UNIQUE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'plus', 'business', 'enterprise')),
  seats INTEGER DEFAULT 1 CHECK (seats > 0),
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id TEXT,
  user_info JSON,
  status TEXT DEFAULT 'active',
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  matter_id TEXT, -- Optional: link to specific matter for tighter integration
  user_id TEXT,
  content TEXT NOT NULL,
  is_user BOOLEAN NOT NULL,
  metadata JSON,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Contact form submissions table
CREATE TABLE IF NOT EXISTS contact_forms (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  organization_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  matter_details TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'contacted', 'closed'
  assigned_lawyer TEXT,
  notes TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
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
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Lawyers table for organization member management
CREATE TABLE IF NOT EXISTS lawyers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialties JSON, -- Array of practice areas
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'on_leave'
  role TEXT DEFAULT 'attorney', -- 'attorney', 'paralegal', 'admin'
  hourly_rate INTEGER, -- in cents
  bar_number TEXT,
  license_state TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Matters table to represent legal matters
CREATE TABLE IF NOT EXISTS matters (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  matter_type TEXT NOT NULL, -- e.g., 'Family Law', 'Employment Law', etc.
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'lead', -- 'lead', 'open', 'in_progress', 'completed', 'archived'
  priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high' - maps from urgency
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
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  closed_at INTEGER
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
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Files table (replaces uploaded_files) - general-purpose file management
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT,
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
  access_level TEXT DEFAULT 'private', -- 'public', 'private', 'organization', 'client'
  shared_with JSON, -- Array of user IDs who have access
  version INTEGER DEFAULT 1,
  parent_file_id TEXT, -- For versioning
  is_deleted BOOLEAN DEFAULT FALSE,
  uploaded_by_lawyer_id TEXT,
  metadata JSON, -- Additional file metadata
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  deleted_at INTEGER
);

-- AI Training Data Tables --

-- Chat logs table for long-term storage of chat sessions
CREATE TABLE IF NOT EXISTS chat_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  organization_id TEXT,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Matter questions table for Q&A pairs from intake
CREATE TABLE IF NOT EXISTS matter_questions (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  organization_id TEXT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source TEXT DEFAULT 'ai-form', -- 'ai-form' | 'human-entry' | 'followup'
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- AI generated summaries table for markdown matter summaries
CREATE TABLE IF NOT EXISTS ai_generated_summaries (
  id TEXT PRIMARY KEY,
  matter_id TEXT,
  summary TEXT NOT NULL,
  model_used TEXT,
  prompt_snapshot TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- AI feedback table for user quality ratings and intent tags
CREATE TABLE IF NOT EXISTS ai_feedback (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  organization_id TEXT,
  rating INTEGER, -- 1-5 scale
  thumbs_up BOOLEAN,
  comments TEXT,
  intent TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);


-- ========================================
-- DEFAULT ORGANIZATIONS
-- ========================================
-- Default organizations are seeded via ./scripts/seed-organizations.sh
-- This keeps the schema file clean and allows for more flexible seeding

-- Payment history table for tracking all payment transactions
CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  organization_id TEXT NOT NULL,
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
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Organization API tokens table for secure token storage
CREATE TABLE IF NOT EXISTS organization_api_tokens (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  token_name TEXT NOT NULL, -- Human-readable name for the token
  token_hash TEXT NOT NULL, -- SHA-256 hash of the actual token
  permissions JSON, -- Array of permissions this token has
  active BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  last_used_at INTEGER,
  expires_at INTEGER, -- Optional expiration date
  created_by TEXT, -- Who created this token
  notes TEXT
);

-- Chat sessions table for session management
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT,
  token_hash TEXT,
  state TEXT NOT NULL DEFAULT 'active',
  status_reason TEXT,
  retention_horizon_days INTEGER NOT NULL DEFAULT 180,
  is_hold INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  last_active INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  closed_at INTEGER,
  UNIQUE(id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_team_state ON chat_sessions(organization_id, state);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_active ON chat_sessions(last_active);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_token_hash_organization ON chat_sessions(token_hash, organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

-- Chat messages table for storing conversation messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  token_count INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_organization ON chat_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);

-- Session summaries table for AI-generated summaries
CREATE TABLE IF NOT EXISTS session_summaries (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  token_count INTEGER,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_summaries_session ON session_summaries(session_id, created_at DESC);

-- Session audit events table for activity tracking
CREATE TABLE IF NOT EXISTS session_audit_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  payload TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_audit_events_session ON session_audit_events(session_id, created_at);

-- Sample data removed - use seed scripts for development data

-- ========================================
-- BETTER AUTH TABLES (SECURE SCHEMA)
-- ========================================
-- Note: Geolocation and IP detection features are disabled by default
-- Set ENABLE_AUTH_GEOLOCATION=true and ENABLE_AUTH_IP_DETECTION=true to enable

-- Users table for Better Auth
CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER DEFAULT 0 NOT NULL,
  image TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  organization_id TEXT,
  stripe_customer_id TEXT UNIQUE,
  role TEXT,
  phone TEXT
);

-- Organization members for Better Auth multi-tenancy
CREATE TABLE IF NOT EXISTS member (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'owner', 'admin', 'attorney', 'paralegal'
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  UNIQUE(organization_id, user_id)
);

-- Invitations for organization member onboarding
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  invited_by TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Stripe subscription table managed by Better Auth Stripe plugin
CREATE TABLE IF NOT EXISTS subscription (
  id TEXT PRIMARY KEY,
  plan TEXT NOT NULL,
  reference_id TEXT NOT NULL, -- References organization.id for organization-level subscriptions
  stripe_customer_id TEXT, -- Added for Better Auth Stripe plugin
  stripe_subscription_id TEXT UNIQUE,
  status TEXT DEFAULT 'incomplete' NOT NULL CHECK(status IN ('incomplete', 'incomplete_expired', 'active', 'canceled', 'past_due', 'unpaid', 'trialing')),
  period_start INTEGER,
  period_end INTEGER,
  trial_start INTEGER,
  trial_end INTEGER,
  cancel_at_period_end INTEGER DEFAULT 0 NOT NULL,
  seats INTEGER CHECK(seats > 0),
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
  -- Foreign key constraints for data integrity
  FOREIGN KEY (reference_id) REFERENCES organization(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_reference_id ON subscription(reference_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON subscription(status);
-- Note: stripe_subscription_id already has UNIQUE constraint in table definition

-- Organization events table for audit logging
CREATE TABLE IF NOT EXISTS organization_events (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_user_id TEXT,
  metadata JSON,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Sessions table for Better Auth
CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  user_id TEXT NOT NULL
);

-- Accounts table for OAuth providers (SECURE)
-- OAuth provider data only, tokens should be encrypted at application level
CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  -- OAuth tokens (should be encrypted at application level)
  access_token TEXT, -- Note: Should be encrypted before storage
  refresh_token TEXT, -- Note: Should be encrypted before storage
  id_token TEXT, -- Note: Should be encrypted before storage
  access_token_expires_at INTEGER,
  refresh_token_expires_at INTEGER,
  scope TEXT,
  password TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  -- Critical: Prevent duplicate provider accounts
  UNIQUE(provider_id, account_id),
  -- Also ensure one account per provider per user
  UNIQUE(provider_id, user_id)
);

-- Verifications table for email verification, password reset, etc.
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL,
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000) NOT NULL
);

-- Create indexes for Better Auth tables
CREATE INDEX IF NOT EXISTS idx_user_email ON user(email);
CREATE INDEX IF NOT EXISTS idx_user_email_verified ON user(email, email_verified);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_stripe_customer_id_unique ON user(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(user_id);
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(provider_id, account_id);
CREATE INDEX IF NOT EXISTS idx_account_provider_user ON account(provider_id, user_id);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_value ON verification(value);
CREATE INDEX IF NOT EXISTS idx_verification_expires_at ON verification(expires_at);

-- Create indexes for organization membership tables
CREATE INDEX IF NOT EXISTS idx_member_org ON member(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_user ON member(user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_organization ON invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_events_org_created ON organization_events(organization_id, created_at DESC);

-- Create indexes for user_id columns
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_matters_user ON matters(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);

-- Create a view for secure user authentication data
-- This view can be used by the application to safely access user auth data
CREATE VIEW IF NOT EXISTS user_auth_summary AS
SELECT
  u.id,
  u.email,
  u.email_verified,
  u.name,
  u.created_at,
  -- Count OAuth providers
  COUNT(DISTINCT a.provider_id) as oauth_provider_count,
  -- Check if user has local password
  MAX(CASE WHEN a.password IS NOT NULL THEN 1 ELSE 0 END) as has_local_password
FROM user u
LEFT JOIN account a ON u.id = a.user_id
GROUP BY u.id, u.email, u.email_verified, u.name, u.created_at;

-- ========================================
-- TRIGGERS FOR AUTOMATIC UPDATED_AT TIMESTAMPS
-- ========================================
-- These triggers ensure that updated_at columns are automatically updated
-- when rows are modified, using the same millisecond timestamp format
-- as the auth schema defaults: (strftime('%s', 'now') * 1000)

-- Trigger for user table
CREATE TRIGGER IF NOT EXISTS trigger_user_updated_at
  AFTER UPDATE ON user
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE user SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Trigger for session table
CREATE TRIGGER IF NOT EXISTS trigger_session_updated_at
  AFTER UPDATE ON session
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE session SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Trigger for account table
CREATE TRIGGER IF NOT EXISTS trigger_account_updated_at
  AFTER UPDATE ON account
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE account SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Trigger for verification table
CREATE TRIGGER IF NOT EXISTS trigger_verification_updated_at
  AFTER UPDATE ON verification
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE verification SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Trigger for organization table
CREATE TRIGGER IF NOT EXISTS trigger_organization_updated_at
  AFTER UPDATE ON organization
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE organization SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

-- Trigger for subscription table
CREATE TRIGGER IF NOT EXISTS trigger_subscription_updated_at
  AFTER UPDATE ON subscription
  FOR EACH ROW
  WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE subscription SET updated_at = (strftime('%s', 'now') * 1000) WHERE id = NEW.id;
END;

