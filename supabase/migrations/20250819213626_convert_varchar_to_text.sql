-- Convert all VARCHAR fields to TEXT fields for better flexibility and consistency

-- Update events table
ALTER TABLE events 
    ALTER COLUMN name TYPE TEXT,
    ALTER COLUMN url_slug TYPE TEXT;

-- Update attendees table
ALTER TABLE attendees 
    ALTER COLUMN first_name TYPE TEXT,
    ALTER COLUMN last_name TYPE TEXT,
    ALTER COLUMN phone TYPE TEXT;

-- Update saved table
ALTER TABLE saved 
    ALTER COLUMN first_name TYPE TEXT,
    ALTER COLUMN last_name TYPE TEXT,
    ALTER COLUMN phone TYPE TEXT,
    ALTER COLUMN email TYPE TEXT;

-- Note: profiles table already uses TEXT for first_name and last_name
-- Note: profile_permissions table doesn't have any VARCHAR fields
