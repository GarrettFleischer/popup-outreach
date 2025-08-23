-- Update saved table RLS policies to allow lead managers to see and edit only people they referred
-- or are assigned to them (no delete permissions, level 2 users have no access)

-- Drop existing policies for saved table
-- Drop policies from various migrations to ensure clean slate
DROP POLICY IF EXISTS "Everyone can view saved submissions" ON saved;
DROP POLICY IF EXISTS "Authenticated users can create saved submissions" ON saved;
DROP POLICY IF EXISTS "Users can update their own saved submissions" ON saved;
DROP POLICY IF EXISTS "Users can delete their own saved submissions" ON saved;
DROP POLICY IF EXISTS "Only admins can view saved" ON saved;
DROP POLICY IF EXISTS "Anyone can create saved" ON saved;
DROP POLICY IF EXISTS "Only admins can update saved" ON saved;
DROP POLICY IF EXISTS "Only admins can delete saved" ON saved;
DROP POLICY IF EXISTS "Admin users can view all saved submissions" ON saved;
DROP POLICY IF EXISTS "Admin users can create saved submissions" ON saved;
DROP POLICY IF EXISTS "Admin users can update saved submissions" ON saved;
DROP POLICY IF EXISTS "Admin users can delete saved submissions" ON saved;
DROP POLICY IF EXISTS "Assigned users can view their saved submissions" ON saved;
DROP POLICY IF EXISTS "Assigned users can update their saved submissions" ON saved;
DROP POLICY IF EXISTS "Public users can view saved submissions" ON saved;
DROP POLICY IF EXISTS "Referrer users can view their saved submissions" ON saved;
DROP POLICY IF EXISTS "Referrer users can update their saved submissions" ON saved;

-- Policy 1: Super admins (permission_level = 0) can do everything
CREATE POLICY "Saved - Super admins can do everything" ON saved
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 0
        )
    );

-- Policy 2: Lead managers (permission_level = 1) can view and update only records they referred
-- or are assigned to them (no delete permissions)
CREATE POLICY "Saved - Lead managers can view and edit assigned/referred" ON saved
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 1
        ) AND (
            -- Can view records assigned to them
            assigned_user_id = (
                SELECT id FROM public.profiles WHERE user_id = auth.uid()
            )
            OR
            -- Can view records they referred
            referrer_user_id = auth.uid()
        )
    );

CREATE POLICY "Saved - Lead managers can update assigned records" ON saved
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 1
        ) AND (
            -- Can update records assigned to them
            assigned_user_id = (
                SELECT id FROM public.profiles WHERE user_id = auth.uid()
            )
            OR
            -- Can update records they referred
            referrer_user_id = auth.uid()
        )
    );

-- Policy 3: Regular users (permission_level = 2) have no access to saved records
-- They are implicitly denied access since no policy allows them

-- Policy 4: Anyone can create saved records (for form submissions)
CREATE POLICY "Saved - Anyone can create records" ON saved
    FOR INSERT WITH CHECK (true);

-- Add comments explaining the policies
COMMENT ON POLICY "Saved - Super admins can do everything" ON saved 
    IS 'Allows users with permission_level = 0 (super admin) to perform all operations on all saved records';

COMMENT ON POLICY "Saved - Lead managers can view and edit assigned/referred" ON saved 
    IS 'Allows users with permission_level = 1 (lead manager) to view and edit only records assigned to them or records they referred';

COMMENT ON POLICY "Saved - Lead managers can update assigned records" ON saved 
    IS 'Allows users with permission_level = 1 (lead manager) to update only records assigned to them or records they referred';

COMMENT ON POLICY "Saved - Anyone can create records" ON saved 
    IS 'Allows anyone (including anonymous users) to create saved records for form submissions';