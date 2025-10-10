PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

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
  status TEXT NOT NULL CHECK (status IN ('pending','completed','failed','cancelled','refunded')), -- enum
  event_type TEXT NOT NULL, -- 'payment.completed', 'payment.failed', 'payment.refunded', etc.
  matter_type TEXT,
  matter_description TEXT,
  invoice_url TEXT,
  metadata JSON CHECK (json_valid(metadata)), -- Additional payment data
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_history_team_id ON payment_history(team_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_customer_email ON payment_history(customer_email);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at); 

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS trg_payment_history_updated_at
AFTER UPDATE ON payment_history
FOR EACH ROW
BEGIN
  UPDATE payment_history SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

COMMIT;