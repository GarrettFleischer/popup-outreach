-- Add foreign key relationship between profile_permissions and profiles tables
-- This enables Supabase's built-in relationship feature for joins

-- Add foreign key constraint from profile_permissions to profiles
ALTER TABLE public.profile_permissions 
    ADD CONSTRAINT profile_permissions_profile_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(user_id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE;

-- Add comment explaining the relationship
COMMENT ON CONSTRAINT profile_permissions_profile_id_fkey ON public.profile_permissions 
    IS 'Links profile_permissions to profiles table via user_id to enable Supabase relationships';
