-- Add city and location fields to contacts table
ALTER TABLE contacts ADD COLUMN city TEXT;
ALTER TABLE contacts ADD COLUMN location TEXT; -- JSON array format like ["México", "Peru"]

-- Create index for location field for performance
CREATE INDEX IF NOT EXISTS idx_contacts_location ON contacts(location);
