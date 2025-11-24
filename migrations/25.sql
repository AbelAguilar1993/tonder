-- Migration 25: Message Relay System
-- Implements secure message relay between users and HR contacts
-- Similar to Craigslist/Airbnb relay systems

-- Relay addresses table - Maps relay addresses to real user/contact IDs
-- Relay addresses never expire to maintain conversation continuity
CREATE TABLE IF NOT EXISTS relay_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  relay_address TEXT UNIQUE NOT NULL, -- e.g., user123@relay.empleosafari.com
  entity_type TEXT NOT NULL CHECK (entity_type IN ('user', 'contact')),
  entity_id INTEGER NOT NULL, -- user_id or contact_id
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one relay address per entity
  UNIQUE(entity_type, entity_id)
);

-- Relay conversations table - Tracks conversation threads
-- A conversation is between a specific user and contact about a specific job
CREATE TABLE IF NOT EXISTS relay_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL,
  job_id INTEGER, -- Optional: the job this conversation is about
  subject TEXT NOT NULL, -- Initial subject line
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked', 'spam')),
  last_message_at DATETIME,
  message_count INTEGER DEFAULT 0,
  user_relay_address TEXT NOT NULL, -- Cached for performance
  contact_relay_address TEXT NOT NULL, -- Cached for performance
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts (id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES jobs (id) ON DELETE SET NULL,
  FOREIGN KEY (user_relay_address) REFERENCES relay_addresses (relay_address),
  FOREIGN KEY (contact_relay_address) REFERENCES relay_addresses (relay_address),
  
  -- One conversation per user-contact-job combination
  UNIQUE(user_id, contact_id, job_id)
);

-- Relay messages table - Stores all messages in the relay system
CREATE TABLE IF NOT EXISTS relay_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('user_to_contact', 'contact_to_user')),
  from_entity_type TEXT NOT NULL CHECK (from_entity_type IN ('user', 'contact')),
  from_entity_id INTEGER NOT NULL,
  to_entity_type TEXT NOT NULL CHECK (to_entity_type IN ('user', 'contact')),
  to_entity_id INTEGER NOT NULL,
  
  -- Relay addresses used
  from_relay_address TEXT NOT NULL,
  to_relay_address TEXT NOT NULL,
  
  -- Actual email addresses (for debugging and compliance)
  from_real_email TEXT NOT NULL,
  to_real_email TEXT NOT NULL,
  
  -- Message content
  subject TEXT NOT NULL,
  message_text TEXT, -- Plain text version
  message_html TEXT, -- HTML version (optional)
  
  -- Email metadata
  email_message_id TEXT, -- From email provider (Mailgun message ID)
  in_reply_to TEXT, -- For threading
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'spam')),
  sent_at DATETIME,
  delivered_at DATETIME,
  read_at DATETIME,
  
  -- Spam and moderation
  is_spam BOOLEAN DEFAULT FALSE,
  spam_score REAL DEFAULT 0.0,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('approved', 'pending', 'rejected')),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (conversation_id) REFERENCES relay_conversations (id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_relay_addresses_entity ON relay_addresses(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_relay_addresses_relay_address ON relay_addresses(relay_address);
CREATE INDEX IF NOT EXISTS idx_relay_addresses_active ON relay_addresses(is_active);

CREATE INDEX IF NOT EXISTS idx_relay_conversations_user_id ON relay_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_relay_conversations_contact_id ON relay_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_relay_conversations_job_id ON relay_conversations(job_id);
CREATE INDEX IF NOT EXISTS idx_relay_conversations_status ON relay_conversations(status);
CREATE INDEX IF NOT EXISTS idx_relay_conversations_last_message ON relay_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_relay_messages_conversation_id ON relay_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_relay_messages_direction ON relay_messages(direction);
CREATE INDEX IF NOT EXISTS idx_relay_messages_status ON relay_messages(status);
CREATE INDEX IF NOT EXISTS idx_relay_messages_email_message_id ON relay_messages(email_message_id);
CREATE INDEX IF NOT EXISTS idx_relay_messages_created_at ON relay_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relay_messages_spam ON relay_messages(is_spam);

-- Create triggers to automatically update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_relay_addresses_timestamp
  AFTER UPDATE ON relay_addresses
  FOR EACH ROW
  BEGIN
    UPDATE relay_addresses 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_relay_conversations_timestamp
  AFTER UPDATE ON relay_conversations
  FOR EACH ROW
  BEGIN
    UPDATE relay_conversations 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS update_relay_messages_timestamp
  AFTER UPDATE ON relay_messages
  FOR EACH ROW
  BEGIN
    UPDATE relay_messages 
    SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
  END;

-- Trigger to update conversation stats when a message is inserted
CREATE TRIGGER IF NOT EXISTS update_conversation_on_message_insert
  AFTER INSERT ON relay_messages
  FOR EACH ROW
  BEGIN
    UPDATE relay_conversations 
    SET 
      last_message_at = NEW.created_at,
      message_count = message_count + 1
    WHERE id = NEW.conversation_id;
  END;

