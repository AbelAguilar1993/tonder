-- Create table to track which contacts users have unlocked
-- Once a user spends 1 credit to unlock a contact, they can access it forever
CREATE TABLE IF NOT EXISTS user_unlocked_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  credits_spent INTEGER DEFAULT 1, -- Track how many credits were spent to unlock
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
  UNIQUE(user_id, contact_id) -- Ensure a user can only unlock the same contact once
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_unlocked_contacts_user_id ON user_unlocked_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_contacts_contact_id ON user_unlocked_contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_user_unlocked_contacts_unlocked_at ON user_unlocked_contacts(unlocked_at DESC);
