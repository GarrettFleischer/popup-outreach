-- Fix infinite recursion in profiles RLS policies
-- The issue is that policies are trying to check permissions while the policies themselves
-- are creating circular dependencies when calling is_admin() function

-- Drop all existing policies on profiles to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;

-- Create simplified policies that don't cause recursion
-- Policy 1: Allow users to view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Allow users to update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy 3: Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow super admins (level 0) to view all profiles
-- This policy uses a direct check without calling functions to avoid recursion
CREATE POLICY "Super admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM public.profile_permissions pp
            WHERE pp.user_id = auth.uid() AND pp.permission_level = 0
        )
    );

-- Policy 5: Allow super admins (level 0) to update all profiles
-- This policy uses a direct check without calling functions to avoid recursion
CREATE POLICY "Super admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS(
            SELECT 1 FROM public.profile_permissions pp
            WHERE pp.user_id = auth.uid() AND pp.permission_level = 0
        )
    );

-- Add comments explaining the policies
COMMENT ON POLICY "Users can view their own profile" ON public.profiles 
    IS 'Allows users to view their own profile';

COMMENT ON POLICY "Users can update their own profile" ON public.profiles 
    IS 'Allows users to update their own profile';

COMMENT ON POLICY "Users can insert their own profile" ON public.profiles 
    IS 'Allows users to insert their own profile during registration';

COMMENT ON POLICY "Super admins can view all profiles" ON public.profiles 
    IS 'Allows super admins (level 0) to view all profiles without recursion';

COMMENT ON POLICY "Super admins can update all profiles" ON public.profiles 
    IS 'Allows super admins (level 0) to update all profiles without recursion';
