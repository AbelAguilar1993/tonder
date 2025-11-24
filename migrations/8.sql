-- AI Snapshot content management
CREATE TABLE IF NOT EXISTS ai_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  
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
  
  FOREIGN KEY (created_by) REFERENCES users (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_job_title ON ai_snapshots(job_title);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_city ON ai_snapshots(city);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_country ON ai_snapshots(country);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_employment_type ON ai_snapshots(employment_type);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_active ON ai_snapshots(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_snapshots_priority ON ai_snapshots(priority DESC);
