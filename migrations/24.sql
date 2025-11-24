-- Migration 24: Add 'drafted' status to user_job_applications
-- SQLite doesn't support altering CHECK constraints, so we need to recreate the table

-- Step 1: Create a new table with the updated status CHECK constraint
CREATE TABLE user_job_applications_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'drafted', 'sent', 'replied', 'declined', 'hired')),
  credits_spent INTEGER DEFAULT 0,
  unlocked_at DATETIME,
  applied_at DATETIME,
  response_at DATETIME,
  notes TEXT,
  preset_chips TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  contact_id INTEGER,
  
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE CASCADE
);

-- Step 2: Copy data from old table to new table
INSERT INTO user_job_applications_new 
SELECT id, user_id, job_id, status, credits_spent, unlocked_at, applied_at, response_at, notes, preset_chips, created_at, updated_at, contact_id
FROM user_job_applications;

-- Step 3: Drop the old table
DROP TABLE user_job_applications;

-- Step 4: Rename the new table
ALTER TABLE user_job_applications_new RENAME TO user_job_applications;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_user_job_applications_user_id ON user_job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_job_id ON user_job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_status ON user_job_applications(status);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_unlocked_at ON user_job_applications(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_applied_at ON user_job_applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_preset_chips ON user_job_applications(preset_chips);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_created_at ON user_job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_contact_id ON user_job_applications(contact_id);

-- Step 6: Recreate the unique index for (user_id, job_id, contact_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_job_applications_user_job_contact_unique
ON user_job_applications(user_id, job_id, contact_id);

-- Step 7: Recreate the trigger
CREATE TRIGGER IF NOT EXISTS update_user_job_applications_timestamp
  AFTER UPDATE ON user_job_applications
  FOR EACH ROW
  BEGIN
    UPDATE user_job_applications 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

