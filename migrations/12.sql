-- Migration 12: Add parent_job_id to ai_snapshots for one-to-one relationship with jobs
-- Each job can have at most one AI snapshot

-- Step 1: Add parent_job_id column to ai_snapshots table
ALTER TABLE ai_snapshots ADD COLUMN parent_job_id INTEGER;

-- Step 2: Add foreign key constraint and unique constraint
-- Note: SQLite doesn't support adding constraints to existing tables directly,
-- so we need to recreate the table

-- Create new ai_snapshots table with parent_job_id
CREATE TABLE ai_snapshots_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_job_id INTEGER UNIQUE, -- One-to-one relationship with jobs
  
  job_title TEXT,
  city TEXT,
  country TEXT,
  employment_type TEXT,
  
  market_insights TEXT,
  salary_range TEXT,
  required_skills TEXT,
  application_tips TEXT,
  company_specific_tips TEXT,
  
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users (id),
  FOREIGN KEY (parent_job_id) REFERENCES jobs (id) ON DELETE CASCADE
);

-- Step 3: Copy all existing data from old table
INSERT INTO ai_snapshots_new (
  id, job_title, city, country, employment_type,
  market_insights, salary_range, required_skills,
  application_tips, company_specific_tips,
  is_active, priority, created_by, created_at, updated_at
)
SELECT 
  id, job_title, city, country, employment_type,
  market_insights, salary_range, required_skills,
  application_tips, company_specific_tips,
  is_active, priority, created_by, created_at, updated_at
FROM ai_snapshots;

-- Step 4: Drop old table and rename new one
DROP TABLE ai_snapshots;
ALTER TABLE ai_snapshots_new RENAME TO ai_snapshots;

-- Step 5: Recreate indexes with parent_job_id
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_parent_job_id ON ai_snapshots(parent_job_id);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_job_title ON ai_snapshots(job_title);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_city ON ai_snapshots(city);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_country ON ai_snapshots(country);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_employment_type ON ai_snapshots(employment_type);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_active ON ai_snapshots(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_priority ON ai_snapshots(priority DESC);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_created_by ON ai_snapshots(created_by);

-- Note: After this migration, AI snapshots will need to be manually linked to specific jobs
-- The old matching logic will be replaced with direct parent_job_id lookups
