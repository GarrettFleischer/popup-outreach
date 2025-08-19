-- Add archived field to events table
ALTER TABLE events ADD COLUMN archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Create index for better performance when filtering by archived status
CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived);

-- Create index for filtering active events by date (most common query)
CREATE INDEX IF NOT EXISTS idx_events_active_date ON events(date DESC) WHERE archived = FALSE;
