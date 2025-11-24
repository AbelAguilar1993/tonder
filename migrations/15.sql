-- Migration 15: Add user_job_applications table for tracking job unlock status
-- This table tracks the relationship between users and jobs with various status states

-- Create user_job_applications table
CREATE TABLE IF NOT EXISTS user_job_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'sent', 'replied', 'declined', 'hired')),
  credits_spent INTEGER DEFAULT 0, -- Track how many credits were spent to unlock (usually 1)
  unlocked_at DATETIME, -- When the job was unlocked (null if still locked)
  applied_at DATETIME, -- When the user applied/sent application
  response_at DATETIME, -- When company responded
  notes TEXT, -- Optional notes for the application
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE,
  UNIQUE(user_id, job_id) -- Ensure a user can only have one application record per job
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_job_applications_user_id ON user_job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_job_id ON user_job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_status ON user_job_applications(status);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_unlocked_at ON user_job_applications(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_applied_at ON user_job_applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_created_at ON user_job_applications(created_at DESC);

-- Create trigger to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_user_job_applications_timestamp
  AFTER UPDATE ON user_job_applications
  FOR EACH ROW
  BEGIN
    UPDATE user_job_applications 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;
