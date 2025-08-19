-- Strengthen foreign key relationships and add additional constraints

-- Add explicit foreign key constraints with proper naming
ALTER TABLE public.user_profiles 
    DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

ALTER TABLE public.profile_permissions 
    DROP CONSTRAINT IF EXISTS profile_permissions_user_id_fkey;

ALTER TABLE public.profile_permissions 
    ADD CONSTRAINT profile_permissions_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Add NOT NULL constraints to ensure data integrity
ALTER TABLE public.user_profiles 
    ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.profile_permissions 
    ALTER COLUMN user_id SET NOT NULL;

-- Add check constraints for data validation
ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_names_not_empty 
    CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0);

ALTER TABLE public.profile_permissions 
    ADD CONSTRAINT profile_permissions_level_range 
    CHECK (permission_level >= 1 AND permission_level <= 10);

-- Add unique constraints to prevent duplicate entries
ALTER TABLE public.user_profiles 
    ADD CONSTRAINT user_profiles_user_id_unique 
    UNIQUE (user_id);

ALTER TABLE public.profile_permissions 
    ADD CONSTRAINT profile_permissions_user_id_unique 
    UNIQUE (user_id);

-- Create composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_composite 
    ON public.user_profiles (user_id, first_name, last_name);

CREATE INDEX IF NOT EXISTS idx_profile_permissions_composite 
    ON public.profile_permissions (user_id, permission_level);

-- Add comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Stores user profile information including first and last names';
COMMENT ON TABLE public.profile_permissions IS 'Stores user permission levels for access control';
COMMENT ON COLUMN public.user_profiles.user_id IS 'References auth.users.id - the authenticated user';
COMMENT ON COLUMN public.profile_permissions.user_id IS 'References auth.users.id - the authenticated user';
COMMENT ON COLUMN public.profile_permissions.permission_level IS 'Permission level from 1-10, where 1 is default user access';

-- Ensure the trigger function is properly secured
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
