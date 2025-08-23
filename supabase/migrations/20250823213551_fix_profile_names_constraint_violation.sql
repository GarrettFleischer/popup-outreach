-- Fix profile names constraint violation during user signup
-- The issue is that the handle_new_user trigger function was inserting empty strings
-- which violated the profiles_names_not_empty constraint

-- Update the handle_new_user function to properly handle user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile with user metadata if available, otherwise use placeholder names
    -- that will be updated later when the user completes their profile
    INSERT INTO public.profiles (user_id, first_name, last_name)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User')
    );
    
    INSERT INTO public.profile_permissions (user_id, permission_level)
    VALUES (NEW.id, 2);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates profile and permissions for new users, using metadata if available or fallback names that satisfy the constraint';
