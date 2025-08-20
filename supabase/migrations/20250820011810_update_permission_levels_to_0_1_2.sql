-- Update permission levels to use 0, 1, 2 system
-- 0 = Super Admin (can access everything)
-- 1 = Lead Manager (can only access admin leads page and see leads assigned to them)
-- 2 = Regular User (default, no admin access)

-- First, update any existing permission levels
-- Set current level 1 users to level 2 (regular user)
UPDATE public.profile_permissions 
SET permission_level = 2 
WHERE permission_level = 1;

-- Set current level 0 users to level 0 (super admin)
-- This ensures existing admins stay as super admins

-- Drop the old constraint that only allowed 0 or 1
ALTER TABLE public.profile_permissions 
    DROP CONSTRAINT IF EXISTS profile_permissions_level_binary;

-- Add new constraint that allows 0, 1, 2
ALTER TABLE public.profile_permissions 
    ADD CONSTRAINT profile_permissions_level_three_tier 
    CHECK (permission_level IN (0, 1, 2));

-- Update the default value to 2 (regular user)
ALTER TABLE public.profile_permissions 
    ALTER COLUMN permission_level SET DEFAULT 2;

-- Update the is_admin function to check for level 0 (super admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profile_permissions
    WHERE user_id = auth.uid() AND permission_level = 0
  );
$$;

-- Create function to check if user is a lead manager (level 1)
CREATE OR REPLACE FUNCTION public.is_lead_manager()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profile_permissions
    WHERE user_id = auth.uid() AND permission_level = 1
  );
$$;

-- Create function to check if user has admin access (level 0 or 1)
CREATE OR REPLACE FUNCTION public.has_admin_access()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profile_permissions
    WHERE user_id = auth.uid() AND permission_level IN (0, 1)
  );
$$;

-- Add comment explaining the new constraint
COMMENT ON CONSTRAINT profile_permissions_level_three_tier ON public.profile_permissions 
    IS 'Permission level constraint: 0 = super admin, 1 = lead manager, 2 = regular user';

-- Add comment explaining the new default
COMMENT ON COLUMN public.profile_permissions.permission_level 
    IS 'Permission level: 0 = super admin (full access), 1 = lead manager (leads only), 2 = regular user (default)';
