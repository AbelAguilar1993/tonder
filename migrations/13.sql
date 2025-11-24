-- Migration 13: Add snapshot_id to jobs table for bidirectional one-to-one relationship with ai_snapshots
-- This complements the parent_job_id in ai_snapshots table from migration 12

-- Step 1: Add snapshot_id column to jobs table
ALTER TABLE jobs ADD COLUMN snapshot_id INTEGER;

-- Step 2: Add foreign key constraint and unique constraint
-- Note: SQLite doesn't support adding constraints to existing tables directly,
-- so we need to recreate the table

-- Create new jobs table with snapshot_id
CREATE TABLE jobs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  employment_type TEXT,
  location TEXT DEFAULT '[]',
  description TEXT,
  snapshot_id INTEGER UNIQUE, -- One-to-one relationship with ai_snapshots
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE,
  FOREIGN KEY (snapshot_id) REFERENCES ai_snapshots (id) ON DELETE SET NULL
);

-- Step 3: Copy all existing data from old table
INSERT INTO jobs_new (
  id, company_id, title, employment_type, location, description, 
  created_at, updated_at
)
SELECT 
  id, company_id, title, employment_type, location, description,
  created_at, updated_at
FROM jobs;

-- Step 4: Drop old table and rename new one
DROP TABLE jobs;
ALTER TABLE jobs_new RENAME TO jobs;

-- Step 5: Recreate indexes with snapshot_id
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_employment_type ON jobs(employment_type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_snapshot_id ON jobs(snapshot_id);

-- Step 6: Sync existing relationships where possible
-- If an ai_snapshot has a parent_job_id, set the corresponding job's snapshot_id
UPDATE jobs 
SET snapshot_id = (
  SELECT ai.id 
  FROM ai_snapshots ai 
  WHERE ai.parent_job_id = jobs.id
)
WHERE EXISTS (
  SELECT 1 
  FROM ai_snapshots ai 
  WHERE ai.parent_job_id = jobs.id
);

-- Note: After this migration, jobs and ai_snapshots have a bidirectional one-to-one relationship
-- - ai_snapshots.parent_job_id -> jobs.id
-- - jobs.snapshot_id -> ai_snapshots.id
-- Both relationships should be kept in sync when creating/updating records
