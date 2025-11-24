-- Migration 23: Create drafts table for storing email drafts for job applications
-- This table has a 1-to-1 relationship with user_job_applications

CREATE TABLE IF NOT EXISTS drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_application_id INTEGER NOT NULL UNIQUE, -- 1-to-1 relationship with user_job_applications
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (job_application_id) REFERENCES user_job_applications (id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_drafts_job_application_id ON drafts(job_application_id);
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON drafts(created_at DESC);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_drafts_timestamp
  AFTER UPDATE ON drafts
  FOR EACH ROW
  BEGIN
    UPDATE drafts 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

