-- Add credits field to users table
-- Credits will be used to unlock contact information access
ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 0;

-- Create index for credits field for performance when filtering/sorting by credits
CREATE INDEX IF NOT EXISTS idx_users_credits ON users(credits);
