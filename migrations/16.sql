-- Migration 16: Add city, linkedin, and signature fields to users table
-- These fields extend user profile information for better networking and communication

-- Add city field to store user's location
ALTER TABLE users ADD COLUMN city TEXT;

-- Add linkedin field to store user's LinkedIn profile URL
ALTER TABLE users ADD COLUMN linkedin TEXT;

-- Add signature field to store user's professional signature
ALTER TABLE users ADD COLUMN signature TEXT;
