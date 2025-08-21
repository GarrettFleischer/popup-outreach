-- Ensure new users get level 2 permission by default
-- This migration updates the handle_new_user function to use level 2 as default

-- Update the handle_new_user function to use level 2 as default permission
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

-- Add comment explaining the updated function
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates profile and permissions for new users with level 2 (regular user) permission by default';

-- Verify the trigger is still in place (it should be)
-- The trigger on_auth_user_created should already exist from previous migrations
-- If for some reason it doesn't exist, uncomment the following lines:
-- CREATE OR REPLACE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
