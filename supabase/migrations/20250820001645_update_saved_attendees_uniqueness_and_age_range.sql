-- Update uniqueness constraints for saved and attendees tables
-- Drop existing unique constraints
DROP INDEX IF EXISTS idx_attendees_event_phone_unique;
DROP INDEX IF EXISTS idx_saved_event_phone_unique;

-- Create new composite unique constraints that include event_id, first_name, last_name, and phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_event_name_phone_unique ON attendees(event_id, first_name, last_name, phone);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_event_name_phone_unique ON saved(event_id, first_name, last_name, phone);

-- Create age_range enum type
CREATE TYPE age_range AS ENUM ('Child', 'Young Adult', 'Adult');

-- Add age_range column to saved table
ALTER TABLE saved ADD COLUMN IF NOT EXISTS age_range age_range;

-- Add comment to explain the age range values
COMMENT ON TYPE age_range IS 'Age range categories: Child, Young Adult, Adult';
COMMENT ON COLUMN saved.age_range IS 'Age range of the person saved for the event';

-- Create index on age_range for potential filtering
CREATE INDEX IF NOT EXISTS idx_saved_age_range ON saved(age_range);
