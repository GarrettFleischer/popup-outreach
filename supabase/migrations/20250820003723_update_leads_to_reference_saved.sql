-- Update leads table to reference saved submissions instead of events directly
-- This allows better tracking of lead origin and supports manually created leads

-- Remove the event_id foreign key constraint first
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_event_id_fkey;

-- Drop the event_id column since leads should be related to saved submissions, not events directly
ALTER TABLE leads DROP COLUMN IF EXISTS event_id;

-- Add saved_id column to reference the saved submission this lead was created from
-- This is nullable to support manually created leads that don't come from saved submissions
ALTER TABLE leads ADD COLUMN IF NOT EXISTS saved_id UUID REFERENCES saved(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_leads_saved_id ON leads(saved_id);

-- Update the uniqueness constraint to be based on name, email, phone (without event)
-- since leads are now global and not tied to specific events
DROP INDEX IF EXISTS idx_leads_name_email_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_name_email_phone_unique ON leads(first_name, last_name, email, phone);
