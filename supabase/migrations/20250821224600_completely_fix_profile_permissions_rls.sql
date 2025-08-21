-- Fix profile_permissions RLS policies with a proper solution that avoids recursion
-- This migration creates a secure RLS setup without circular dependencies

-- First, completely disable RLS on profile_permissions temporarily
ALTER TABLE public.profile_permissions DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start completely fresh
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Users can update their own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Users can insert their own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Admins can update all permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Super admins can view all permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Super admins can update all permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Super admins can view all permission records" ON public.profile_permissions;
DROP POLICY IF EXISTS "Super admins can update any permission record" ON public.profile_permissions;
DROP POLICY IF EXISTS "Users can view own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Users can insert own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Users can update own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Super admins view all permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Super admins update all permissions" ON public.profile_permissions;

-- Create a simple admin tracking table to avoid recursion
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert current super admins (level 0) into the admin_users table
INSERT INTO public.admin_users (user_id, is_super_admin)
SELECT user_id, true
FROM public.profile_permissions
WHERE permission_level = 0
ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true;

-- Create a function to check if user is super admin without recursion
CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND is_super_admin = true
  );
$$;

-- Re-enable RLS on profile_permissions
ALTER TABLE public.profile_permissions ENABLE ROW LEVEL SECURITY;

-- Create secure RLS policies that don't cause recursion
-- Policy 1: Allow users to view their own permissions
CREATE POLICY "Users can view own permissions" ON public.profile_permissions
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Allow users to insert their own permissions (for registration)
CREATE POLICY "Users can insert own permissions" ON public.profile_permissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Allow users to update their own permissions (basic profile management)
CREATE POLICY "Users can update own permissions" ON public.profile_permissions
    FOR UPDATE USING (auth.uid() = user_id);

-- Policy 4: Allow super admins to view all permissions (using safe function)
CREATE POLICY "Super admins view all permissions" ON public.profile_permissions
    FOR SELECT USING (public.is_super_admin_safe());

-- Policy 5: Allow super admins to update all permissions (using safe function)
CREATE POLICY "Super admins update all permissions" ON public.profile_permissions
    FOR UPDATE USING (public.is_super_admin_safe());

-- Create trigger to maintain admin_users table when permissions change
CREATE OR REPLACE FUNCTION public.maintain_admin_users()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.permission_level = 0 THEN
        -- User became super admin
        INSERT INTO public.admin_users (user_id, is_super_admin)
        VALUES (NEW.user_id, true)
        ON CONFLICT (user_id) DO UPDATE SET is_super_admin = true;
    ELSIF OLD.permission_level = 0 AND NEW.permission_level != 0 THEN
        -- User lost super admin status
        UPDATE public.admin_users SET is_super_admin = false WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically maintain admin_users table
DROP TRIGGER IF EXISTS on_permission_change ON public.profile_permissions;
CREATE TRIGGER on_permission_change
    AFTER UPDATE ON public.profile_permissions
    FOR EACH ROW EXECUTE FUNCTION public.maintain_admin_users();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.admin_users TO authenticated;

-- Add comments
COMMENT ON TABLE public.admin_users IS 'Tracks super admin users to avoid RLS recursion';
COMMENT ON FUNCTION public.is_super_admin_safe() IS 'Safely checks if user is super admin without causing recursion';
COMMENT ON FUNCTION public.maintain_admin_users() IS 'Automatically maintains admin_users table when permissions change';
