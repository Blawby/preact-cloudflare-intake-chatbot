-- Migration: Add payment_history table
-- Date: 2025-07-31

-- Payment history table for tracking all payment transactions
CREATE TABLE IF NOT EXISTS payment_history (
  id TEXT PRIMARY KEY,
  payment_id TEXT UNIQUE NOT NULL,
  team_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  amount INTEGER NOT NULL CHECK (amount >= 0), -- in cents, prevent negative amounts
  currency CHAR(3) DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'CAD', 'AUD')), -- standardize currency codes
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')), -- validate status values
  event_type TEXT NOT NULL CHECK (event_type LIKE 'payment.%'), -- ensure event types follow pattern
  matter_type TEXT,
  matter_description TEXT,
  invoice_url TEXT,
  metadata JSON, -- Additional payment data
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