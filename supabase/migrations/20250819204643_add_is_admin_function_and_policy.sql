-- Add is_admin function to check if a user has admin privileges
-- This function uses SECURITY DEFINER to bypass RLS and check permission levels

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use a direct query with SECURITY DEFINER to bypass RLS
    RETURN EXISTS (
        SELECT 1 FROM public.profile_permissions 
        WHERE user_id = auth.uid() AND permission_level = 0
    );
END;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Update the existing policy to allow admins to update all permissions
DROP POLICY IF EXISTS "Admins can update all permissions" ON public.profile_permissions;

CREATE POLICY "Admins can update all permissions"
ON public.profile_permissions
FOR UPDATE
TO public
USING (is_admin());

-- Add comment explaining the function
COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current user has admin privileges (permission_level = 0)';
