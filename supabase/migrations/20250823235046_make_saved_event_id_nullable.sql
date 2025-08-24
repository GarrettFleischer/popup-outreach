-- Make saved.event_id nullable and change foreign key constraint to SET NULL
-- This allows saved records to exist without an associated event (when events are deleted)

-- First, drop the existing foreign key constraint
ALTER TABLE saved DROP CONSTRAINT IF EXISTS saved_event_id_fkey;

-- Make the event_id column nullable
ALTER TABLE saved ALTER COLUMN event_id DROP NOT NULL;

-- Recreate the foreign key constraint with SET NULL instead of CASCADE
ALTER TABLE saved ADD CONSTRAINT saved_event_id_fkey 
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL;

-- Drop the existing email-based unique constraint since we don't need it
-- Uniqueness should be based on names and phone number only
DROP INDEX IF EXISTS idx_saved_event_email_unique;

-- Add a comment explaining the change
COMMENT ON COLUMN saved.event_id IS 'Event ID - nullable to allow saved records to exist after event deletion';
