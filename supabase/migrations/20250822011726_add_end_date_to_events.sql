-- Add end_date field to events table
-- This field will store the end date and time of the event
-- Default to the same value as the main date field for existing events

-- Add the end_date column
ALTER TABLE events ADD COLUMN end_date TIMESTAMP WITH TIME ZONE;

-- Set existing events to have the same end_date as their start date
UPDATE events SET end_date = date WHERE end_date IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE events ALTER COLUMN end_date SET NOT NULL;

-- Add a default value for future events (will be set by application logic)
ALTER TABLE events ALTER COLUMN end_date SET DEFAULT NULL;

-- Add an index for better performance when filtering by end date
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);

-- Add a comment to document the new column
COMMENT ON COLUMN events.end_date IS 'Event end date and time stored in UTC timestamp format';

-- Add a constraint to ensure end_date is not before start date
ALTER TABLE events ADD CONSTRAINT check_event_end_date_after_start 
    CHECK (end_date >= date);
