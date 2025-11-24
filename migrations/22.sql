-- Migration 22: Create invoices table for tracking payment receipts
-- This table stores invoice information for credit purchases

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL, -- Human-readable invoice number (e.g., INV-2025-00001)
  amount REAL NOT NULL, -- Total amount in the currency paid
  currency TEXT NOT NULL DEFAULT 'USD', -- Currency code (USD, COP, MXN, etc.)
  credits_purchased INTEGER NOT NULL, -- Number of credits purchased
  discount_rate REAL DEFAULT 0, -- Discount percentage applied (0-1)
  discount_amount REAL DEFAULT 0, -- Discount amount in currency
  subtotal REAL NOT NULL, -- Amount before discount
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_method TEXT, -- Payment method used (card, transfer, etc.)
  payment_gateway TEXT DEFAULT 'dLocalGo', -- Payment gateway used
  payment_gateway_id TEXT, -- ID from payment gateway
  paid_at DATETIME, -- When payment was confirmed
  pdf_url TEXT, -- URL to invoice PDF (if generated)
  notes TEXT, -- Additional notes about the invoice
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_gateway_id ON invoices(payment_gateway_id);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_invoices_timestamp
  AFTER UPDATE ON invoices
  FOR EACH ROW
  BEGIN
    UPDATE invoices 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

