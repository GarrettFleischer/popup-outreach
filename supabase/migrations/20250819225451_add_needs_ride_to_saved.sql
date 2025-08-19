-- Add needsRide column to saved table
ALTER TABLE saved ADD COLUMN IF NOT EXISTS needs_ride BOOLEAN DEFAULT FALSE;

-- Add comment to document the column purpose
COMMENT ON COLUMN saved.needs_ride IS 'Whether the person needs transportation via bus ministry';
