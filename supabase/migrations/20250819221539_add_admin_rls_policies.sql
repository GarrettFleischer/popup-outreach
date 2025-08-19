-- Add RLS policies with correct access patterns
-- Events: Public view, admin-only edit
-- Attendees: Public create, admin-only view/edit/delete
-- Saved: Public create, admin-only view/edit/delete

-- Events table RLS policies
-- Everyone can view events (public access)
DROP POLICY IF EXISTS "Everyone can view events" ON events;
CREATE POLICY "Everyone can view events" ON events
    FOR SELECT USING (true);

-- Only admins can create events
DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
CREATE POLICY "Only admins can create events" ON events
    FOR INSERT WITH CHECK (is_admin());

-- Only admins can update events
DROP POLICY IF EXISTS "Users can update events" ON events;
CREATE POLICY "Only admins can update events" ON events
    FOR UPDATE USING (is_admin());

-- Only admins can delete events
DROP POLICY IF EXISTS "Users can delete events" ON events;
CREATE POLICY "Only admins can delete events" ON events
    FOR DELETE USING (is_admin());

-- Attendees table RLS policies
-- Only admins can view attendees (for admin dashboard)
DROP POLICY IF EXISTS "Everyone can view attendees" ON attendees;
CREATE POLICY "Only admins can view attendees" ON attendees
    FOR SELECT USING (is_admin());

-- Anyone can create attendees (public registration)
DROP POLICY IF EXISTS "Authenticated users can create attendee registrations" ON attendees;
CREATE POLICY "Anyone can create attendees" ON attendees
    FOR INSERT WITH CHECK (true);

-- Only admins can update attendees
DROP POLICY IF EXISTS "Users can update attendee registrations" ON attendees;
CREATE POLICY "Only admins can update attendees" ON attendees
    FOR UPDATE USING (is_admin());

-- Only admins can delete attendees
DROP POLICY IF EXISTS "Users can delete attendee registrations" ON attendees;
CREATE POLICY "Only admins can delete attendees" ON attendees
    FOR DELETE USING (is_admin());

-- Saved table RLS policies
-- Only admins can view saved submissions (for admin dashboard)
DROP POLICY IF EXISTS "Everyone can view saved submissions" ON saved;
CREATE POLICY "Only admins can view saved" ON saved
    FOR SELECT USING (is_admin());

-- Anyone can create saved submissions (public interest form)
DROP POLICY IF EXISTS "Authenticated users can create saved submissions" ON saved;
CREATE POLICY "Anyone can create saved" ON saved
    FOR INSERT WITH CHECK (true);

-- Only admins can update saved submissions
DROP POLICY IF EXISTS "Users can update saved submissions" ON saved;
CREATE POLICY "Only admins can update saved" ON saved
    FOR UPDATE USING (is_admin());

-- Only admins can delete saved submissions
DROP POLICY IF EXISTS "Users can delete saved submissions" ON saved;
CREATE POLICY "Only admins can delete saved" ON saved
    FOR DELETE USING (is_admin());

-- Note: The is_admin() function should already exist from previous migrations
-- This function checks if the current user has admin privileges
