-- Update the update_user_permission function to use the new admin_users table
-- This avoids recursion by not querying profile_permissions in the function

-- Drop the old function
DROP FUNCTION IF EXISTS public.update_user_permission(UUID, INTEGER);

-- Create the new function that uses admin_users table
CREATE OR REPLACE FUNCTION public.update_user_permission(
  target_user_id UUID,
  new_permission_level INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is a super admin using the safe function
  IF NOT public.is_super_admin_safe() THEN
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

  -- The trigger will automatically update the admin_users table
  -- Return true if update was successful
  RETURN FOUND;
END;
$$;

-- Add comment explaining the updated function
COMMENT ON FUNCTION public.update_user_permission(UUID, INTEGER) 
    IS 'Allows super admins to update permission levels of other users using the safe admin_users table. Cannot change own permission level.';

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_permission(UUID, INTEGER) TO authenticated;
