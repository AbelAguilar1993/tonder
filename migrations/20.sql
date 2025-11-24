-- Migration 20: Add preset_chips column to user_job_applications table
-- This column will store the preset chips for the job application

-- Add preset_chips column to user_job_applications table
ALTER TABLE user_job_applications ADD COLUMN preset_chips TEXT;
