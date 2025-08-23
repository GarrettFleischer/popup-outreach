-- Fix saved table RLS policies to correctly check assigned_user_id and referrer_user_id
-- Both fields store user IDs directly, so we check against auth.uid()

-- Drop the existing policies that have incorrect checks
DROP POLICY IF EXISTS "Saved - Lead managers can view and edit assigned/referred" ON saved;
DROP POLICY IF EXISTS "Saved - Lead managers can update assigned records" ON saved;

-- Recreate the policies with correct user ID checks
-- Policy 2: Lead managers (permission_level = 1) can view and update only records they referred
-- or are assigned to them (no delete permissions)
CREATE POLICY "Saved - Lead managers can view and edit assigned/referred" ON saved
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 1
        ) AND (
            -- Can view records assigned to them (assigned_user_id stores user ID)
            assigned_user_id = auth.uid()
            OR
            -- Can view records they referred (referrer_user_id stores user ID)
            referrer_user_id = auth.uid()
        )
    );

CREATE POLICY "Saved - Lead managers can update assigned records" ON saved
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 1
        ) AND (
            -- Can only update records assigned to them (assigned_user_id stores user ID)
            assigned_user_id = auth.uid()
        )
    );

-- Add comments explaining the corrected policies
COMMENT ON POLICY "Saved - Lead managers can view and edit assigned/referred" ON saved 
    IS 'Allows users with permission_level = 1 (lead manager) to view and edit only records assigned to them or records they referred (fixed user ID checks)';

COMMENT ON POLICY "Saved - Lead managers can update assigned records" ON saved 
    IS 'Allows users with permission_level = 1 (lead manager) to update only records assigned to them (not records they referred)';
