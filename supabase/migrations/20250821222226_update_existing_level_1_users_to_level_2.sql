-- Update existing users with level 1 permission to level 2
-- Level 1 should only be manually assigned to lead managers, not be the default

-- Update any existing users with level 1 permission to level 2
-- This ensures that only manually assigned lead managers have level 1
UPDATE public.profile_permissions 
SET permission_level = 2 
WHERE permission_level = 1;

-- Add comment explaining this change
COMMENT ON COLUMN public.profile_permissions.permission_level 
    IS 'Permission level: 0 = super admin (full access), 1 = lead manager (leads only, manually assigned), 2 = regular user (default)';
