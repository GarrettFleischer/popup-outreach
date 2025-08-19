-- Change the date field from DATE to TIMESTAMP WITH TIME ZONE to store time information
-- First, we need to handle existing data by converting dates to timestamps at noon UTC

-- Add a temporary column for the new timestamp
ALTER TABLE events ADD COLUMN date_timestamp TIMESTAMP WITH TIME ZONE;

-- Convert existing date values to timestamp (set to noon UTC to avoid timezone issues)
UPDATE events 
SET date_timestamp = (date || 'T12:00:00Z')::TIMESTAMP WITH TIME ZONE;

-- Drop the old date column
ALTER TABLE events DROP COLUMN date;

-- Rename the new column to date
ALTER TABLE events RENAME COLUMN date_timestamp TO date;

-- Make the date column NOT NULL since it's required
ALTER TABLE events ALTER COLUMN date SET NOT NULL;

-- Update the index to work with the new timestamp column
DROP INDEX IF EXISTS idx_events_active_date;
CREATE INDEX IF NOT EXISTS idx_events_active_date ON events(date DESC) WHERE archived = FALSE;

-- Add a comment to document the change
COMMENT ON COLUMN events.date IS 'Event date and time stored in UTC timestamp format';
