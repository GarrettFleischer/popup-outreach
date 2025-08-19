-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    url_slug VARCHAR(255) UNIQUE NOT NULL,
    created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on url_slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_url_slug ON events(url_slug);

-- Create index on date for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

-- Create index on created_by for user relationship queries
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

-- Function to generate URL slug from event name and date
CREATE OR REPLACE FUNCTION generate_event_slug(event_name TEXT, event_date DATE)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert name to lowercase and replace spaces/special chars with hyphens
    base_slug := LOWER(REGEXP_REPLACE(event_name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
    base_slug := TRIM(BOTH '-' FROM base_slug);
    
    -- Add date in YYYY-MM-DD format
    base_slug := base_slug || '-' || TO_CHAR(event_date, 'YYYY-MM-DD');
    
    -- Check if slug exists and append counter if needed
    final_slug := base_slug;
    
    WHILE EXISTS(SELECT 1 FROM events WHERE url_slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate URL slug before insert
CREATE OR REPLACE FUNCTION set_event_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.url_slug IS NULL OR NEW.url_slug = '' THEN
        NEW.url_slug := generate_event_slug(NEW.name, NEW.date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_event_slug
    BEFORE INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION set_event_slug();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at();

-- Add RLS policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all events
CREATE POLICY "Users can view all events" ON events
    FOR SELECT USING (true);

-- Policy: Users can create events (they will be set as created_by)
CREATE POLICY "Users can create events" ON events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update events they created
CREATE POLICY "Users can update their own events" ON events
    FOR UPDATE USING (auth.uid() = created_by);

-- Policy: Users can delete events they created
CREATE POLICY "Users can delete their own events" ON events
    FOR DELETE USING (auth.uid() = created_by);

-- Grant permissions to authenticated users
GRANT SELECT ON events TO authenticated;
GRANT INSERT ON events TO authenticated;
GRANT UPDATE ON events TO authenticated;
GRANT DELETE ON events TO authenticated;
