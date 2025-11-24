-- Migration 18: Add contact_id to user_job_applications table as a foreign key to contacts table. Also add unique constraints for user_id, job_id and contact_id

-- Add contact_id column to user_job_applications table
ALTER TABLE user_job_applications ADD COLUMN contact_id INTEGER;

-- Add foreign key constraint for contact_id referencing contacts(id)
-- (SQLite does not support adding a foreign key constraint to an existing table directly,
-- but we can document the intent. For new tables, this would be in the CREATE TABLE statement.)
-- For now, just add the column and index.
-- If you want to enforce the constraint, you would need to recreate the table.

-- Create index for contact_id for performance
CREATE INDEX IF NOT EXISTS idx_user_job_applications_contact_id ON user_job_applications(contact_id);

-- Add unique constraint for (user_id, job_id, contact_id)
-- SQLite does not support adding a unique constraint to an existing table directly.
-- As a workaround, create a unique index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_job_applications_user_job_contact_unique
ON user_job_applications(user_id, job_id, contact_id);
