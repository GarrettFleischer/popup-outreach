-- Drop existing tables to recreate them with simplified structure
DROP TABLE IF EXISTS attendees CASCADE;
DROP TABLE IF EXISTS saved CASCADE;

-- Recreate attendees table with simplified structure
CREATE TABLE IF NOT EXISTS attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate saved table with simplified structure
CREATE TABLE IF NOT EXISTS saved (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendees_event_id ON attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_attendees_phone ON attendees(phone);
CREATE INDEX IF NOT EXISTS idx_saved_event_id ON saved(event_id);
CREATE INDEX IF NOT EXISTS idx_saved_phone ON saved(phone);
CREATE INDEX IF NOT EXISTS idx_saved_email ON saved(email);

-- Create composite unique constraint to prevent duplicate registrations per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendees_event_phone_unique ON attendees(event_id, phone);

-- Create composite unique constraint to prevent duplicate saved submissions per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_event_phone_unique ON saved(event_id, phone);

-- Triggers to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_attendees_updated_at
    BEFORE UPDATE ON attendees
    FOR EACH ROW
    EXECUTE FUNCTION update_attendees_updated_at();

CREATE OR REPLACE FUNCTION update_saved_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saved_updated_at
    BEFORE UPDATE ON saved
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_updated_at();

-- Enable RLS on both tables
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attendees table
-- Everyone can view attendees (for public event pages)
CREATE POLICY "Everyone can view attendees" ON attendees
    FOR SELECT USING (true);

-- Authenticated users can create attendee registrations
CREATE POLICY "Authenticated users can create attendee registrations" ON attendees
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own registrations (if we add user_id later)
-- For now, allow updates by anyone (could be restricted later)
CREATE POLICY "Users can update attendee registrations" ON attendees
    FOR UPDATE USING (true);

-- Users can delete their own registrations (if we add user_id later)
-- For now, allow deletion by anyone (could be restricted later)
CREATE POLICY "Users can delete attendee registrations" ON attendees
    FOR DELETE USING (true);

-- RLS Policies for saved table
-- Everyone can view saved submissions (for public event pages)
CREATE POLICY "Everyone can view saved submissions" ON saved
    FOR SELECT USING (true);

-- Authenticated users can create saved submissions
CREATE POLICY "Authenticated users can create saved submissions" ON saved
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own saved submissions (if we add user_id later)
-- For now, allow updates by anyone (could be restricted later)
CREATE POLICY "Users can update saved submissions" ON saved
    FOR UPDATE USING (true);

-- Users can delete their own saved submissions (if we add user_id later)
-- For now, allow deletion by anyone (could be restricted later)
CREATE POLICY "Users can delete saved submissions" ON saved
    FOR DELETE USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON attendees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON saved TO authenticated;
