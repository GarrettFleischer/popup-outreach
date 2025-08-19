-- Rename user_profiles table to profiles and update all references

-- Rename the table
ALTER TABLE public.user_profiles RENAME TO profiles;

-- Rename the foreign key constraint
ALTER TABLE public.profiles 
    RENAME CONSTRAINT user_profiles_user_id_fkey TO profiles_user_id_fkey;

-- Rename the unique constraint
ALTER TABLE public.profiles 
    RENAME CONSTRAINT user_profiles_user_id_unique TO profiles_user_id_unique;

-- Rename the names check constraint
ALTER TABLE public.profiles 
    RENAME CONSTRAINT user_profiles_names_not_empty TO profiles_names_not_empty;

-- Drop old indexes and recreate with new names
DROP INDEX IF EXISTS idx_user_profiles_user_id;
DROP INDEX IF EXISTS idx_user_profiles_composite;

-- Recreate indexes with new table name
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_composite ON public.profiles(user_id, first_name, last_name);

-- Update RLS policies for the renamed table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate RLS policies with new table name
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update the trigger function to use the new table name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, first_name, last_name)
    VALUES (NEW.id, '', '');
    
    INSERT INTO public.profile_permissions (user_id, permission_level)
    VALUES (NEW.id, 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update table and column comments
COMMENT ON TABLE public.profiles IS 'Stores user profile information including first and last names';
COMMENT ON COLUMN public.profiles.user_id IS 'References auth.users.id - the authenticated user';

-- Update grants to use new table name
-- Note: user_profiles table has already been renamed to profiles above
GRANT ALL ON public.profiles TO authenticated;
