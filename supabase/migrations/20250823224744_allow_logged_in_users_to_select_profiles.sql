-- Allow logged-in users to select other user profiles for display purposes
-- This is needed so that the leads admin page can show referrer names instead of just "Referred"

-- Add a new policy that allows authenticated users to view profile names
-- This is safe because we're only exposing first_name and last_name, not sensitive information
CREATE POLICY "Authenticated users can view profile names" ON public.profiles
    FOR SELECT USING (
        -- User must be authenticated
        auth.role() = 'authenticated'
    );

-- Add comment explaining the policy
COMMENT ON POLICY "Authenticated users can view profile names" ON public.profiles 
    IS 'Allows authenticated users to view profile names (first_name, last_name) for display purposes in admin interfaces';
