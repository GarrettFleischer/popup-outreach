-- Fix permission_level constraint to only allow 0 (admin) or 1 (regular user)
-- This migration removes the old 1-10 constraint and ensures only 0 or 1 are valid

-- First, update any existing permission levels that are outside the 0-1 range
-- Set any values > 1 to 1 (regular user)
UPDATE public.profile_permissions 
SET permission_level = 1 
WHERE permission_level > 1;

-- Drop the old constraint that allowed levels 1-10 (if it exists)
ALTER TABLE public.profile_permissions 
    DROP CONSTRAINT IF EXISTS profile_permissions_level_range;

-- Drop the old constraint that allowed levels >= 1 (if it exists)
ALTER TABLE public.profile_permissions 
    DROP CONSTRAINT IF EXISTS profile_permissions_permission_level_check;

-- Ensure the constraint only allows 0 (admin) or 1 (regular user)
ALTER TABLE public.profile_permissions 
    DROP CONSTRAINT IF EXISTS profile_permissions_level_binary;
    
ALTER TABLE public.profile_permissions 
    ADD CONSTRAINT profile_permissions_level_binary 
    CHECK (permission_level IN (0, 1));

-- Update the default value to 1 (regular user) if not already set
ALTER TABLE public.profile_permissions 
    ALTER COLUMN permission_level SET DEFAULT 1;

-- Add comment explaining the new constraint
COMMENT ON CONSTRAINT profile_permissions_level_binary ON public.profile_permissions 
    IS 'Permission level constraint: 0 = admin user, 1 = regular user';
