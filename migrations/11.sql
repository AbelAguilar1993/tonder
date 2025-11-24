-- Migration 11: Rename chip_templates table to chips and update related tables

-- Step 1: Create new chips table with same structure as chip_templates
CREATE TABLE IF NOT EXISTS chips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chip_key TEXT UNIQUE NOT NULL,
  chip_label TEXT NOT NULL,
  category TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Copy all data from chip_templates to chips
INSERT INTO chips (id, chip_key, chip_label, category, description, is_active, created_at, updated_at)
SELECT id, chip_key, chip_label, category, description, is_active, created_at, updated_at
FROM chip_templates;

-- Step 3: Create new job_chips table (rename from job_chip_templates)
CREATE TABLE IF NOT EXISTS job_chips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  chip_id INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
  FOREIGN KEY (chip_id) REFERENCES chips (id) ON DELETE CASCADE,
  UNIQUE(job_id, chip_id)
);

-- Step 4: Copy data from job_chip_templates to job_chips (if job_chip_templates exists)
INSERT OR IGNORE INTO job_chips (job_id, chip_id, display_order, created_at)
SELECT job_id, chip_template_id, display_order, created_at
FROM job_chip_templates
WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type='table' AND name='job_chip_templates');

-- Step 5: Create indexes for the new tables
CREATE INDEX IF NOT EXISTS idx_chips_category ON chips(category);
CREATE INDEX IF NOT EXISTS idx_chips_active ON chips(is_active);
CREATE INDEX IF NOT EXISTS idx_chips_chip_key ON chips(chip_key);

CREATE INDEX IF NOT EXISTS idx_job_chips_job_id ON job_chips(job_id);
CREATE INDEX IF NOT EXISTS idx_job_chips_chip_id ON job_chips(chip_id);
CREATE INDEX IF NOT EXISTS idx_job_chips_display_order ON job_chips(job_id, display_order);

-- Note: Old tables (chip_templates, job_chip_templates) are kept for rollback safety
-- They can be dropped in a future migration after verifying the new structure works
