-- Migration 17: Add WhatsApp/Mobile and email notification preferences to users table
-- These fields extend user profile with contact information and communication preferences

-- Add whatsapp field to store user's WhatsApp number or mobile phone
ALTER TABLE users ADD COLUMN whatsapp TEXT;

-- Add email notification preference - whether user wants to receive notifications via email
ALTER TABLE users ADD COLUMN email_notifications BOOLEAN DEFAULT TRUE;

-- Add invoice email preference - whether user wants to receive invoices via email
ALTER TABLE users ADD COLUMN email_invoices BOOLEAN DEFAULT TRUE;
