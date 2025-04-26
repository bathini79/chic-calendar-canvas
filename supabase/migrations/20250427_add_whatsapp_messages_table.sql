-- Create whatsapp_messages table for storing messages from both providers
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL, -- 'gupshup', 'meta_whatsapp', etc.
  direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
  from_number VARCHAR(50) NOT NULL,
  to_number VARCHAR(50) NOT NULL,
  message_content TEXT,
  message_type VARCHAR(20), -- 'text', 'image', 'document', etc.
  message_id VARCHAR(255), -- Provider's message ID
  status VARCHAR(20), -- 'sent', 'delivered', 'read', 'failed', etc.
  status_timestamp TIMESTAMPTZ,
  raw_payload JSONB, -- Raw response from provider API
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS whatsapp_messages_message_id_idx ON whatsapp_messages(message_id);
CREATE INDEX IF NOT EXISTS whatsapp_messages_provider_idx ON whatsapp_messages(provider);
CREATE INDEX IF NOT EXISTS whatsapp_messages_status_idx ON whatsapp_messages(status);

-- Add provider column to appointment_notifications if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'appointment_notifications' 
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE appointment_notifications ADD COLUMN provider VARCHAR(50);
  END IF;
END $$;

-- Add provider column to notification_queue if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'notification_queue' 
    AND column_name = 'provider'
  ) THEN
    ALTER TABLE notification_queue ADD COLUMN provider VARCHAR(50);
  END IF;
END $$;