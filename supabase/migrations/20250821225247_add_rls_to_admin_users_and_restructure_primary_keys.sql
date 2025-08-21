-- Add RLS to admin_users table and restructure primary keys
-- This migration makes the schema more consistent and secure

-- First, let's check and properly restructure the profiles table
-- We need to handle foreign key dependencies first

-- Drop foreign key constraints that reference profiles.id
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_created_by_fkey;
ALTER TABLE public.saved DROP CONSTRAINT IF EXISTS saved_assigned_user_id_fkey;

-- Clean up any orphaned references before restructuring
-- Set created_by to NULL for events that reference non-existent profiles
UPDATE public.events 
SET created_by = NULL 
WHERE created_by IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = created_by);

-- Set assigned_user_id to NULL for saved records that reference non-existent profiles
UPDATE public.saved 
SET assigned_user_id = NULL 
WHERE assigned_user_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = assigned_user_id);

-- Get the current primary key constraint name and drop it
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND contype = 'p';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;

-- Drop the id column if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS id;

-- Make user_id the primary key
ALTER TABLE public.profiles ADD PRIMARY KEY (user_id);

-- Now restructure the profile_permissions table
-- Get the current primary key constraint name and drop it
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.profile_permissions'::regclass AND contype = 'p';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.profile_permissions DROP CONSTRAINT ' || quote_ident(constraint_name);
    END IF;
END $$;

-- Drop the id column if it exists
ALTER TABLE public.profile_permissions DROP COLUMN IF EXISTS id;

-- Make user_id the primary key
ALTER TABLE public.profile_permissions ADD PRIMARY KEY (user_id);

-- Recreate the foreign key constraints to reference user_id instead of id
ALTER TABLE public.events 
    ADD CONSTRAINT events_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

ALTER TABLE public.saved 
    ADD CONSTRAINT saved_assigned_user_id_fkey 
    FOREIGN KEY (assigned_user_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Now add RLS to the admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_users table
-- Policy 1: Users can view their own admin status
CREATE POLICY "Users can view own admin status" ON public.admin_users
    FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Super admins can view all admin users
CREATE POLICY "Super admins can view all admin users" ON public.admin_users
    FOR SELECT USING (public.is_super_admin_safe());

-- Policy 3: Super admins can insert new admin users
CREATE POLICY "Super admins can insert admin users" ON public.admin_users
    FOR INSERT WITH CHECK (public.is_super_admin_safe());

-- Policy 4: Super admins can update admin users
CREATE POLICY "Super admins can update admin users" ON public.admin_users
    FOR UPDATE USING (public.is_super_admin_safe());

-- Policy 5: Super admins can delete admin users
CREATE POLICY "Super admins can delete admin users" ON public.admin_users
    FOR DELETE USING (public.is_super_admin_safe());

-- Update the maintain_admin_users function to work with the new structure
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

-- Update the handle_new_user function to work with the new structure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, first_name, last_name)
    VALUES (NEW.id, '', '');
    
    INSERT INTO public.profile_permissions (user_id, permission_level)
    VALUES (NEW.id, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments explaining the new structure
COMMENT ON TABLE public.profiles IS 'User profiles with user_id as primary key for consistency';
COMMENT ON TABLE public.profile_permissions IS 'User permissions with user_id as primary key for consistency';
COMMENT ON TABLE public.admin_users IS 'Admin user tracking with RLS enabled for security';

-- Add comments on the policies
COMMENT ON POLICY "Users can view own admin status" ON public.admin_users 
    IS 'Allows users to view their own admin status';

COMMENT ON POLICY "Super admins can view all admin users" ON public.admin_users 
    IS 'Allows super admins to view all admin users';

COMMENT ON POLICY "Super admins can insert admin users" ON public.admin_users 
    IS 'Allows super admins to insert new admin users';

COMMENT ON POLICY "Super admins can update admin users" ON public.admin_users 
    IS 'Allows super admins to update admin users';

COMMENT ON POLICY "Super admins can delete admin users" ON public.admin_users 
    IS 'Allows super admins to delete admin users';
