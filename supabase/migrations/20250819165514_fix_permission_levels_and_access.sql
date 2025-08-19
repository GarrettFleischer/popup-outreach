-- Fix permission levels and access controls for profile_permissions table

-- First, update existing permission levels to ensure they're valid
-- Set any existing permission levels > 1 to 1 (regular user)
UPDATE public.profile_permissions 
SET permission_level = 1 
WHERE permission_level > 1;

-- Drop the old constraint that allowed levels 1-10
ALTER TABLE public.profile_permissions 
    DROP CONSTRAINT IF EXISTS profile_permissions_level_range;

-- Add new constraint to only allow 0 (admin) or 1 (regular user)
ALTER TABLE public.profile_permissions 
    ADD CONSTRAINT profile_permissions_level_binary 
    CHECK (permission_level IN (0, 1));

-- Update the default value to 1 (regular user)
ALTER TABLE public.profile_permissions 
    ALTER COLUMN permission_level SET DEFAULT 1;

-- Drop the old RLS policies that allowed updates
DROP POLICY IF EXISTS "Users can update their own permissions" ON public.profile_permissions;
DROP POLICY IF EXISTS "Users can insert their own permissions" ON public.profile_permissions;

-- Create new RLS policies that only allow viewing
-- Everyone can view all permissions (for transparency)
CREATE POLICY "Everyone can view all permissions" ON public.profile_permissions
    FOR SELECT USING (true);

-- Only allow the system to insert new permissions (via trigger function)
CREATE POLICY "System can insert permissions" ON public.profile_permissions
    FOR INSERT WITH CHECK (false); -- This prevents manual inserts

-- Prevent any updates to permissions table
CREATE POLICY "No updates allowed" ON public.profile_permissions
    FOR UPDATE USING (false);

-- Prevent any deletes from permissions table
CREATE POLICY "No deletes allowed" ON public.profile_permissions
    FOR DELETE USING (false);

-- Update the trigger function to use the new default permission level
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, first_name, last_name)
    VALUES (NEW.id, '', '');
    
    INSERT INTO public.profile_permissions (user_id, permission_level)
    VALUES (NEW.id, 1); -- Default to regular user (1)
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the column comment to reflect the new permission system
COMMENT ON COLUMN public.profile_permissions.permission_level IS 'Permission level: 0 = admin user, 1 = regular user. Only manually editable in database.';

-- Add a comment explaining the access control
COMMENT ON TABLE public.profile_permissions IS 'Stores user permission levels. 0 = admin, 1 = regular user. Read-only for users, only manually editable in database.';
