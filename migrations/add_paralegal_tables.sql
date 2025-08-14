-- Migration: Add paralegal agent tables
-- Date: 2025-01-31
-- Description: Add tables to support the Paralegal Agent state machine for matter formation

PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Matter formation stages table
-- Tracks the progress of matter formation through various stages
CREATE TABLE IF NOT EXISTS matter_formation_stages (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('collect_parties','conflicts_check','documents_needed','fee_scope','engagement','filing_prep','completed')), -- collect_parties, conflicts_check, documents_needed, fee_scope, engagement, filing_prep, completed
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','skipped')), -- pending, in_progress, completed, skipped
  data JSON CHECK (json_valid(data)), -- Stage-specific data and metadata
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(matter_id, stage),
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
);

-- Conflict checks table
-- Records conflict check results for matters
CREATE TABLE IF NOT EXISTS conflict_checks (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  parties JSON NOT NULL CHECK (json_valid(parties)), -- Array of party names checked
  result JSON NOT NULL CHECK (json_valid(result)), -- Conflict check results with details
  cleared BOOLEAN NOT NULL DEFAULT FALSE, -- Whether conflicts were cleared
  checked_by TEXT, -- Who performed the check
  checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
);

-- Document requirements table  
-- Tracks required documents for each matter
CREATE TABLE IF NOT EXISTS document_requirements (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  document_type TEXT NOT NULL, -- Type of document required
  description TEXT, -- Description of what's needed
  required BOOLEAN NOT NULL DEFAULT TRUE, -- Whether this document is required or optional
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','requested','received','reviewed','approved')), -- pending, requested, received, reviewed, approved
  assigned_to TEXT, -- Who is responsible for obtaining this document
  due_date DATE, -- When the document is due
  file_id TEXT, -- Reference to uploaded file if received
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(matter_id, document_type),
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
);

-- Engagement letters table
-- Tracks engagement letter generation and execution
CREATE TABLE IF NOT EXISTS engagement_letters (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  template_id TEXT, -- Which template was used
  content TEXT, -- Generated letter content
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','reviewed','signed','executed')), -- draft, sent, reviewed, signed, executed
  sent_at DATETIME,
  signed_at DATETIME,
  r2_key TEXT, -- R2 storage key for PDF version
  version INTEGER DEFAULT 1, -- Version number for revisions
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(matter_id, version),
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
);

-- Audit log table
-- Comprehensive audit trail for paralegal agent actions
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  matter_id TEXT, -- Optional: may be system-wide events
  team_id TEXT, -- Team context
  actor TEXT, -- Who performed the action (user, system, agent)
  action TEXT NOT NULL, -- What action was performed
  entity_type TEXT, -- Type of entity affected (matter, document, conflict, etc.)
  entity_id TEXT, -- ID of the affected entity
  old_values JSON, -- Previous state (for updates)
  new_values JSON, -- New state (for creates/updates)
  metadata JSON, -- Additional context data
  ip_address TEXT, -- IP address of the actor (if applicable)
  user_agent TEXT, -- User agent (if applicable)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE SET NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Risk assessments table
-- Store AI-generated risk assessments for matters
CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY,
  matter_id TEXT NOT NULL,
  assessment_type TEXT DEFAULT 'initial', -- initial, updated, final
  risk_level TEXT, -- low, medium, high, critical
  risk_factors JSON, -- Array of identified risk factors
  recommendations JSON, -- Array of risk mitigation recommendations
  confidence_score REAL, -- AI confidence in the assessment (0.0 to 1.0)
  model_used TEXT, -- Which AI model generated the assessment
  assessed_by TEXT, -- Who requested/reviewed the assessment
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (matter_id) REFERENCES matters(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matter_formation_stages_matter_id ON matter_formation_stages(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_formation_stages_stage_status ON matter_formation_stages(stage, status);
CREATE INDEX IF NOT EXISTS idx_matter_formation_stages_updated_at ON matter_formation_stages(updated_at);

CREATE INDEX IF NOT EXISTS idx_conflict_checks_matter_id ON conflict_checks(matter_id);
CREATE INDEX IF NOT EXISTS idx_conflict_checks_cleared ON conflict_checks(cleared);
CREATE INDEX IF NOT EXISTS idx_conflict_checks_checked_at ON conflict_checks(checked_at);
CREATE INDEX IF NOT EXISTS idx_conflict_checks_updated_at ON conflict_checks(updated_at);

CREATE INDEX IF NOT EXISTS idx_document_requirements_matter_id ON document_requirements(matter_id);
CREATE INDEX IF NOT EXISTS idx_document_requirements_status ON document_requirements(status);
CREATE INDEX IF NOT EXISTS idx_document_requirements_due_date ON document_requirements(due_date);
CREATE INDEX IF NOT EXISTS idx_document_requirements_required ON document_requirements(required);

CREATE INDEX IF NOT EXISTS idx_engagement_letters_matter_id ON engagement_letters(matter_id);
CREATE INDEX IF NOT EXISTS idx_engagement_letters_status ON engagement_letters(status);
CREATE INDEX IF NOT EXISTS idx_engagement_letters_signed_at ON engagement_letters(signed_at);

CREATE INDEX IF NOT EXISTS idx_audit_log_matter_id ON audit_log(matter_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_team_id ON audit_log(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_matter_id ON risk_assessments(matter_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_risk_level ON risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_created_at ON risk_assessments(created_at);

-- Triggers to auto-update updated_at timestamps
-- SQLite does not support assigning to NEW.*, so use AFTER UPDATE + UPDATE pattern
CREATE TRIGGER IF NOT EXISTS trg_matter_formation_stages_updated_at
AFTER UPDATE ON matter_formation_stages
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE matter_formation_stages SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- For document_requirements, use AFTER UPDATE to set updated_at as requested
CREATE TRIGGER IF NOT EXISTS trg_document_requirements_updated_at
AFTER UPDATE ON document_requirements
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE document_requirements SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Auto-update updated_at for engagement_letters on update
CREATE TRIGGER IF NOT EXISTS trg_engagement_letters_updated_at
AFTER UPDATE ON engagement_letters
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE engagement_letters SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Auto-update updated_at for conflict_checks on update
CREATE TRIGGER IF NOT EXISTS trg_conflict_checks_updated_at
AFTER UPDATE ON conflict_checks
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE conflict_checks SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

COMMIT;
