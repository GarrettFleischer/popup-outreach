-- Update profile_permissions policy to allow admins to update all permissions
-- This migration drops the restrictive "No updates allowed" policy and creates a new one

-- Drop the restrictive "No updates allowed" policy first
DROP POLICY IF EXISTS "No updates allowed" ON public.profile_permissions;

-- Drop the existing admin policy first (in case it already exists)
DROP POLICY IF EXISTS "Admins can update all permissions" ON public.profile_permissions;

-- Create new policy to allow admins to update all permissions
CREATE POLICY "Admins can update all permissions"
ON public.profile_permissions
FOR UPDATE
TO public
USING (is_admin());

-- Add comment explaining the new policy
COMMENT ON POLICY "Admins can update all permissions" ON public.profile_permissions 
    IS 'Allows users with admin privileges (permission_level = 0) to update any permission record';
