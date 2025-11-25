CREATE TABLE IF NOT EXISTS tonder_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id TEXT UNIQUE NOT NULL,
  intent_id TEXT UNIQUE,
  user_id INTEGER,
  payment_type TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'MXN',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  metadata TEXT,
  idempotency_key TEXT UNIQUE,
  secure_token TEXT,
  spei_reference TEXT,
  oxxo_voucher TEXT,
  oxxo_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_tonder_payments_payment_id ON tonder_payments(payment_id);
CREATE INDEX idx_tonder_payments_intent_id ON tonder_payments(intent_id);
CREATE INDEX idx_tonder_payments_user_id ON tonder_payments(user_id);
CREATE INDEX idx_tonder_payments_status ON tonder_payments(status);

CREATE TABLE IF NOT EXISTS tonder_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT UNIQUE NOT NULL,
  payment_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  processed BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (payment_id) REFERENCES tonder_payments(payment_id)
);

CREATE INDEX idx_webhook_events_event_id ON tonder_webhook_events(event_id);
CREATE INDEX idx_webhook_events_payment_id ON tonder_webhook_events(payment_id);
