-- Add RLS policies for the leads table to support the new permission system
-- This allows level 1 users (lead managers) to see and update leads assigned to them

-- Enable RLS on the leads table if not already enabled
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Leads - Super admins can do everything" ON public.leads;
DROP POLICY IF EXISTS "Leads - Lead managers can see and update their assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Leads - Regular users cannot access" ON public.leads;

-- Policy 1: Super admins (permission_level = 0) can do everything
CREATE POLICY "Leads - Super admins can do everything" ON public.leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 0
        )
    );

-- Policy 2: Lead managers (permission_level = 1) can see and update leads assigned to them
CREATE POLICY "Leads - Lead managers can see and update their assigned leads" ON public.leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 1
        ) AND assigned_user_id = auth.uid()
    );

-- Policy 3: Regular users (permission_level = 2) cannot access leads
-- This is implicit since no policy allows them access, but we can be explicit
CREATE POLICY "Leads - Regular users cannot access" ON public.leads
    FOR ALL USING (false);

-- Add comments explaining the policies
COMMENT ON POLICY "Leads - Super admins can do everything" ON public.leads 
    IS 'Allows users with permission_level = 0 (super admin) to perform all operations on all leads';

COMMENT ON POLICY "Leads - Lead managers can see and update their assigned leads" ON public.leads 
    IS 'Allows users with permission_level = 1 (lead manager) to see and update only leads assigned to them';

COMMENT ON POLICY "Leads - Regular users cannot access" ON public.leads 
    IS 'Prevents users with permission_level = 2 (regular user) from accessing any leads';
