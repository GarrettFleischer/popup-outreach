-- Add address field to saved table
-- This field will allow admins to input addresses after contacting saved attendees

-- Add the address column
ALTER TABLE saved ADD COLUMN IF NOT EXISTS address TEXT;

-- Create index for potential address-based queries
CREATE INDEX IF NOT EXISTS idx_saved_address ON saved(address) WHERE address IS NOT NULL;

-- Add comment to explain the new field
COMMENT ON COLUMN saved.address IS 'Optional address field for saved attendees, typically filled in by admins after contact';
