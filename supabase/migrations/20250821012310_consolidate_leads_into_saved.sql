-- Consolidate leads table into saved table
-- Add missing fields to saved table that were in leads table

-- Add assigned_user_id field to saved table
ALTER TABLE saved ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add contacted field to saved table
ALTER TABLE saved ADD COLUMN IF NOT EXISTS contacted BOOLEAN DEFAULT FALSE;

-- Add notes field to saved table
ALTER TABLE saved ADD COLUMN IF NOT EXISTS notes TEXT;



-- Create indexes for performance on new fields
CREATE INDEX IF NOT EXISTS idx_saved_assigned_user_id ON saved(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_saved_contacted ON saved(contacted);

-- Update RLS policies for saved table to include lead management functionality
-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view saved submissions" ON saved;
DROP POLICY IF EXISTS "Authenticated users can create saved submissions" ON saved;
DROP POLICY IF EXISTS "Users can update saved submissions" ON saved;
DROP POLICY IF EXISTS "Users can delete saved submissions" ON saved;

-- Create new policies that include lead management
-- Admin users can view all saved submissions
CREATE POLICY "Admin users can view all saved submissions" ON saved
    FOR SELECT USING (is_admin());

-- Admin users can create saved submissions
CREATE POLICY "Admin users can create saved submissions" ON saved
    FOR INSERT WITH CHECK (is_admin());

-- Admin users can update saved submissions
CREATE POLICY "Admin users can update saved submissions" ON saved
    FOR UPDATE USING (is_admin());

-- Admin users can delete saved submissions
CREATE POLICY "Admin users can delete saved submissions" ON saved
    FOR DELETE USING (is_admin());

-- Assigned users can view and update their assigned saved submissions
CREATE POLICY "Assigned users can view their saved submissions" ON saved
    FOR SELECT USING (assigned_user_id = auth.uid());

CREATE POLICY "Assigned users can update their saved submissions" ON saved
    FOR UPDATE USING (assigned_user_id = auth.uid());

-- Public users can still view saved submissions (for event pages)
CREATE POLICY "Public users can view saved submissions" ON saved
    FOR SELECT USING (true);

-- Authenticated users can create saved submissions (for form submissions)
CREATE POLICY "Authenticated users can create saved submissions" ON saved
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Drop the leads table since it's no longer needed
DROP TABLE IF EXISTS leads CASCADE;

-- Update the unique constraint on saved to be more flexible for lead management
-- Drop the existing constraint
DROP INDEX IF EXISTS idx_saved_event_name_phone_unique;

-- Create a new constraint that allows multiple entries per event for lead management
-- but prevents exact duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_event_name_email_unique ON saved(event_id, first_name, last_name, email);

-- Add comment to explain the new structure
COMMENT ON TABLE saved IS 'Consolidated table for both saved form submissions and leads management';
COMMENT ON COLUMN saved.assigned_user_id IS 'User assigned to manage this lead';
COMMENT ON COLUMN saved.contacted IS 'Whether this lead has been contacted';
COMMENT ON COLUMN saved.notes IS 'Internal notes about this lead';
