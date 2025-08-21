-- Allow level 0 admins to update user permissions
-- This migration creates policies and functions for super admins to manage user permissions

-- Create function to update user permission level (only callable by super admins)
CREATE OR REPLACE FUNCTION public.update_user_permission(
  target_user_id UUID,
  new_permission_level INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is a super admin (level 0)
  IF NOT EXISTS(
    SELECT 1 FROM public.profile_permissions
    WHERE user_id = auth.uid() AND permission_level = 0
  ) THEN
    RAISE EXCEPTION 'Only super admins can update user permissions';
  END IF;

  -- Validate permission level
  IF new_permission_level NOT IN (0, 1, 2) THEN
    RAISE EXCEPTION 'Invalid permission level. Must be 0, 1, or 2';
  END IF;

  -- Prevent super admins from changing their own permission level
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own permission level';
  END IF;

  -- Update the permission level
  UPDATE public.profile_permissions
  SET permission_level = new_permission_level,
      updated_at = NOW()
  WHERE user_id = target_user_id;

  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.update_user_permission(UUID, INTEGER) 
    IS 'Allows super admins (level 0) to update permission levels of other users. Cannot change own permission level.';

-- Create policy to allow super admins to update any permission record
CREATE POLICY "Super admins can update any permission record" ON public.profile_permissions
    FOR UPDATE USING (
        EXISTS(
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 0
        )
    );

-- Create policy to allow super admins to view all permission records
CREATE POLICY "Super admins can view all permission records" ON public.profile_permissions
    FOR SELECT USING (
        EXISTS(
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 0
        )
    );

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_permission(UUID, INTEGER) TO authenticated;
