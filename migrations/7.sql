-- Child jobs table - crawled jobs that belong to parent jobs
CREATE TABLE IF NOT EXISTS child_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_job_id INTEGER NOT NULL,
  
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  link TEXT NOT NULL,
  source TEXT NOT NULL,
  
  is_active BOOLEAN DEFAULT TRUE,
  last_crawled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_job_id) REFERENCES jobs (id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_child_jobs_parent_id ON child_jobs(parent_job_id);
CREATE INDEX IF NOT EXISTS idx_child_jobs_source ON child_jobs(source);
CREATE INDEX IF NOT EXISTS idx_child_jobs_city ON child_jobs(city);
CREATE INDEX IF NOT EXISTS idx_child_jobs_country ON child_jobs(country);
CREATE INDEX IF NOT EXISTS idx_child_jobs_active ON child_jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_child_jobs_created ON child_jobs(created_at DESC);
