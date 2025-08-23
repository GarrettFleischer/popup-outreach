-- Create event_assignments table to assign users to events
-- This allows users to view leads from events they are assigned to

CREATE TABLE IF NOT EXISTS event_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
    UNIQUE(event_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_assignments_event_id ON event_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_user_id ON event_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_event_assignments_assigned_by ON event_assignments(assigned_by);

-- Enable RLS on event_assignments table
ALTER TABLE event_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_assignments table
-- Admin users can view all assignments
CREATE POLICY "Admin users can view all event assignments" ON event_assignments
    FOR SELECT USING (is_admin());

-- Admin users can create assignments
CREATE POLICY "Admin users can create event assignments" ON event_assignments
    FOR INSERT WITH CHECK (is_admin());

-- Admin users can update assignments
CREATE POLICY "Admin users can update event assignments" ON event_assignments
    FOR UPDATE USING (is_admin());

-- Admin users can delete assignments
CREATE POLICY "Admin users can delete event assignments" ON event_assignments
    FOR DELETE USING (is_admin());

-- Assigned users can view their own assignments
CREATE POLICY "Users can view their own event assignments" ON event_assignments
    FOR SELECT USING (user_id = auth.uid());

-- Grant permissions to authenticated users
GRANT SELECT ON event_assignments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON event_assignments TO authenticated;

-- Update saved table RLS policies to allow assigned users to view leads from their assigned events
-- Drop the existing policy that only allows viewing assigned records
DROP POLICY IF EXISTS "Saved - Lead managers can view and edit assigned/referred" ON saved;

-- Create new policy that allows lead managers to view:
-- 1. Records assigned to them (assigned_user_id)
-- 2. Records they referred (referrer_user_id)  
-- 3. Records from events they are assigned to (new condition)
CREATE POLICY "Saved - Lead managers can view assigned/referred/event-assigned" ON saved
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profile_permissions
            WHERE user_id = auth.uid() AND permission_level = 1
        ) AND (
            -- Can view records assigned to them (assigned_user_id stores user ID)
            assigned_user_id = auth.uid()
            OR
            -- Can view records they referred (referrer_user_id stores user ID)
            referrer_user_id = auth.uid()
            OR
            -- Can view records from events they are assigned to
            EXISTS (
                SELECT 1 FROM event_assignments
                WHERE event_assignments.event_id = saved.event_id
                AND event_assignments.user_id = auth.uid()
            )
        )
    );

-- Add comments explaining the new structure
COMMENT ON TABLE event_assignments IS 'Table for assigning users to events, allowing them to view leads from those events';
COMMENT ON COLUMN event_assignments.event_id IS 'The event the user is assigned to';
COMMENT ON COLUMN event_assignments.user_id IS 'The user assigned to the event';
COMMENT ON COLUMN event_assignments.assigned_at IS 'When the user was assigned to the event';
COMMENT ON COLUMN event_assignments.assigned_by IS 'Who assigned the user to the event';

COMMENT ON POLICY "Saved - Lead managers can view assigned/referred/event-assigned" ON saved 
    IS 'Allows users with permission_level = 1 (lead manager) to view records assigned to them, records they referred, or records from events they are assigned to';
