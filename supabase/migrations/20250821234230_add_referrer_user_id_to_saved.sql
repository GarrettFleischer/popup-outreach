-- Add referrer_user_id field to saved table
-- This field will track which user created the saved record

-- Add the referrer_user_id column
ALTER TABLE saved ADD COLUMN IF NOT EXISTS referrer_user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_saved_referrer_user_id ON saved(referrer_user_id);

-- Create a function to automatically set the referrer_user_id
CREATE OR REPLACE FUNCTION set_referrer_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set referrer_user_id if it's not already set
    IF NEW.referrer_user_id IS NULL THEN
        NEW.referrer_user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set referrer_user_id on insert
DROP TRIGGER IF EXISTS trigger_set_referrer_user_id ON saved;
CREATE TRIGGER trigger_set_referrer_user_id
    BEFORE INSERT ON saved
    FOR EACH ROW
    EXECUTE FUNCTION set_referrer_user_id();

-- Update RLS policies to allow users to view records they referred
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Assigned users can view their saved submissions" ON saved;
DROP POLICY IF EXISTS "Assigned users can update their saved submissions" ON saved;

-- Recreate policies to include referrer access
-- Assigned users can view and update their assigned saved submissions
CREATE POLICY "Assigned users can view their saved submissions" ON saved
    FOR SELECT USING (assigned_user_id = auth.uid());

CREATE POLICY "Assigned users can update their saved submissions" ON saved
    FOR UPDATE USING (assigned_user_id = auth.uid());

-- Referrer users can view records they created
CREATE POLICY "Referrer users can view their saved submissions" ON saved
    FOR SELECT USING (referrer_user_id = auth.uid());

-- Referrer users can update records they created (for corrections)
CREATE POLICY "Referrer users can update their saved submissions" ON saved
    FOR UPDATE USING (referrer_user_id = auth.uid());

-- Add comment to explain the new field
COMMENT ON COLUMN saved.referrer_user_id IS 'User who created this saved record (referrer)';
COMMENT ON FUNCTION set_referrer_user_id() IS 'Automatically sets referrer_user_id to current user when inserting saved records';
