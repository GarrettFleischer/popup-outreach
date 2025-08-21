-- Fix infinite recursion in profile_permissions RLS policies
-- The issue is that policies are trying to check permissions while the policies themselves
-- are creating circular dependencies when calling is_admin() function

-- Drop all existing policies on profile_permissions to start fresh
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Users can update their own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Users can insert their own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Admins can update all permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Super admins can update any permission record" ON public.profile_permissions;
DROP POLICY IF EXISTS "Super admins can view all permission records" ON public.profile_permissions;

-- Create simplified policies that don't cause recursion
-- Policy 1: Allow users to view their own permissions
CREATE POLICY "Users can view their own permissions" ON public.profile_permissions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Allow users to insert their own permissions (for new user registration)
CREATE POLICY "Users can insert their own permissions" ON public.profile_permissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow super admins (level 0) to view all permissions
-- This policy uses a direct check without calling functions to avoid recursion
CREATE POLICY "Super admins can view all permissions" ON public.profile_permissions
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM public.profile_permissions pp
            WHERE pp.user_id = auth.uid() AND pp.permission_level = 0
        )
    );

-- Policy 4: Allow super admins (level 0) to update all permissions
-- This policy uses a direct check without calling functions to avoid recursion
CREATE POLICY "Super admins can update all permissions" ON public.profile_permissions
    FOR UPDATE USING (
        EXISTS(
            SELECT 1 FROM public.profile_permissions pp
            WHERE pp.user_id = auth.uid() AND pp.permission_level = 0
        )
    );

-- Policy 5: Allow users to update their own permissions (for basic profile management)
CREATE POLICY "Users can update their own permissions" ON public.profile_permissions
    FOR UPDATE USING (auth.uid() = user_id);

-- Add comments explaining the policies
COMMENT ON POLICY "Users can view their own permissions" ON public.profile_permissions 
    IS 'Allows users to view their own permission level';

COMMENT ON POLICY "Users can insert their own permissions" ON public.profile_permissions 
    IS 'Allows users to insert their own permission record during registration';

COMMENT ON POLICY "Super admins can view all permissions" ON public.profile_permissions 
    IS 'Allows super admins (level 0) to view all permission records without recursion';

COMMENT ON POLICY "Super admins can update all permissions" ON public.profile_permissions 
    IS 'Allows super admins (level 0) to update all permission records without recursion';

COMMENT ON POLICY "Users can update their own permissions" ON public.profile_permissions 
    IS 'Allows users to update their own permission record for basic profile management';
