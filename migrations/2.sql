-- Migration 2: Update location fields to support multiple locations
-- Change location from single value to JSON array for companies and jobs
-- Note: SQLite doesn't support DROP CONSTRAINT, so we recreate tables

-- Step 1: Create new companies table without location CHECK constraint
CREATE TABLE companies_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  logo_url TEXT,
  color TEXT,
  short_description TEXT,
  full_description TEXT,
  location TEXT, -- Now stores JSON array like ["México", "Peru"]
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Step 2: Migrate companies data, converting single location to JSON array
INSERT INTO companies_new (id, name, logo_url, color, short_description, full_description, location, is_active, created_by, created_at, updated_at)
SELECT 
  id, 
  name, 
  logo_url, 
  color, 
  short_description, 
  full_description,
  CASE 
    WHEN location = 'México' THEN '["México"]'
    WHEN location = 'Peru' THEN '["Peru"]'
    WHEN location IS NULL OR location = '' THEN '[]'
    ELSE '["' || location || '"]'
  END as location,
  is_active, 
  created_by, 
  created_at, 
  updated_at
FROM companies;

-- Step 3: Replace old companies table
DROP TABLE companies;
ALTER TABLE companies_new RENAME TO companies;

-- Step 4: Create new jobs table without location CHECK constraint
CREATE TABLE jobs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  employment_type TEXT CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'temporary')),
  location TEXT, -- Now stores JSON array like ["México", "Peru"]
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

-- Step 5: Migrate jobs data, converting single location to JSON array
INSERT INTO jobs_new (id, company_id, title, employment_type, location, description, created_at, updated_at)
SELECT 
  id, 
  company_id, 
  title, 
  employment_type,
  CASE 
    WHEN location = 'México' THEN '["México"]'
    WHEN location = 'Peru' THEN '["Peru"]'
    WHEN location IS NULL OR location = '' THEN '[]'
    ELSE '["' || location || '"]'
  END as location,
  description, 
  created_at, 
  updated_at
FROM jobs;

-- Step 6: Replace old jobs table
DROP TABLE jobs;
ALTER TABLE jobs_new RENAME TO jobs;

-- Step 7: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies(location);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- Note: Location is now stored as JSON array string format like: ["México", "Peru"]
-- Valid values are still limited to "México" and "Peru" but now multiple can be selected
-- Example formats:
-- [] - No locations specified
-- ["México"] - México only
-- ["Peru"] - Peru only  
-- ["México", "Peru"] - Both locations
