-- Job offer chips/attributes system
CREATE TABLE IF NOT EXISTS job_offer_chips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  chip_key TEXT NOT NULL,
  chip_label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
  UNIQUE(job_id, chip_key)
);

-- Global chip templates for reuse
CREATE TABLE IF NOT EXISTS chip_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chip_key TEXT UNIQUE NOT NULL,
  chip_label TEXT NOT NULL,
  category TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_offer_chips_job_id ON job_offer_chips(job_id);
CREATE INDEX IF NOT EXISTS idx_job_offer_chips_active ON job_offer_chips(is_active);
CREATE INDEX IF NOT EXISTS idx_job_offer_chips_display_order ON job_offer_chips(job_id, display_order);
CREATE INDEX IF NOT EXISTS idx_chip_templates_category ON chip_templates(category);
CREATE INDEX IF NOT EXISTS idx_chip_templates_active ON chip_templates(is_active);
