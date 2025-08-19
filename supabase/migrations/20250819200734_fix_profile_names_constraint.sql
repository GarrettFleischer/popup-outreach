-- Fix profile names constraint issue by updating the trigger function
-- The current trigger function tries to insert empty strings for names,
-- but there's a check constraint preventing this

-- Update the trigger function to use user metadata for names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    first_name_val TEXT;
    last_name_val TEXT;
BEGIN
    -- Extract names from user metadata
    first_name_val := COALESCE(NEW.raw_user_meta_data->>'first_name', 'User');
    last_name_val := COALESCE(NEW.raw_user_meta_data->>'last_name', 'User');
    
    -- Ensure names are not empty (fallback to 'User' if they are)
    IF first_name_val = '' OR first_name_val IS NULL THEN
        first_name_val := 'User';
    END IF;
    
    IF last_name_val = '' OR last_name_val IS NULL THEN
        last_name_val := 'User';
    END IF;
    
    INSERT INTO public.profiles (user_id, first_name, last_name)
    VALUES (NEW.id, first_name_val, last_name_val);
    
    INSERT INTO public.profile_permissions (user_id, permission_level)
    VALUES (NEW.id, 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- This approach:
-- 1. Uses the first_name and last_name from user metadata if provided
-- 2. Falls back to 'User' as default if metadata is missing or empty
-- 3. Satisfies the names_not_empty constraint
-- 4. Allows users to provide their names during registration
-- 5. Uses raw_user_meta_data which contains the data passed during signup
-- 6. Handles edge cases where metadata might be empty strings
