-- Migration 21: Create credit_transactions table for tracking credit purchases and usage
-- This table stores all credit-related transactions (purchases, usage, refunds, etc.)

CREATE TABLE IF NOT EXISTS credit_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'use', 'refund', 'admin_adjustment', 'bonus')),
  amount INTEGER NOT NULL, -- Positive for additions, negative for deductions
  balance_after INTEGER NOT NULL, -- User's credit balance after this transaction
  description TEXT, -- Human-readable description of the transaction
  reference_type TEXT, -- e.g., 'invoice', 'job_unlock', 'contact_unlock', 'manual'
  reference_id INTEGER, -- ID of related record (invoice_id, job_application_id, etc.)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_reference ON credit_transactions(reference_type, reference_id);

