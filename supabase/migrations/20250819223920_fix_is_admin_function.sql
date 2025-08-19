-- Fix the is_admin function to use the correct column name
-- The function was incorrectly using 'id' instead of 'user_id'

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use a direct query with SECURITY DEFINER to bypass RLS
    -- Fixed: use user_id instead of id to match the table structure
    RETURN EXISTS (
        SELECT 1 FROM public.profile_permissions 
        WHERE user_id = auth.uid() AND permission_level = 0
    );
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current user has admin privileges (permission_level = 0). Fixed to use correct user_id column.';
