-- Fix profiles table RLS policies to allow admin users to view all profiles
-- This is needed for the user assignment dropdown in leads management

-- Drop the restrictive policy that only allows users to view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new policy that allows users to view their own profile OR admin users to view all profiles
CREATE POLICY "Users can view own profile or admin users can view all" ON public.profiles
    FOR SELECT USING (
        auth.uid() = user_id OR is_admin()
    );

-- Add comment explaining the policy change
COMMENT ON POLICY "Users can view own profile or admin users can view all" ON public.profiles 
    IS 'Allows users to view their own profile and admin users (level 0) to view all profiles for lead assignment';
