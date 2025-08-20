-- Create leads table for converted saved attendees
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    job_title VARCHAR(255),
    dietary_restrictions TEXT,
    additional_notes TEXT,
    needs_ride BOOLEAN DEFAULT FALSE,
    assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    contacted BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_event_id ON leads(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_user_id ON leads(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_contacted ON leads(contacted);

-- Create composite unique constraint to prevent duplicate leads based on name, email, and phone
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_name_email_phone_unique ON leads(first_name, last_name, email, phone);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();

-- Enable RLS on leads table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads table
-- Admin users can view all leads
CREATE POLICY "Admin users can view all leads" ON leads
    FOR SELECT USING (is_admin());

-- Admin users can create leads
CREATE POLICY "Admin users can create leads" ON leads
    FOR INSERT WITH CHECK (is_admin());

-- Admin users can update leads
CREATE POLICY "Admin users can update leads" ON leads
    FOR UPDATE USING (is_admin());

-- Admin users can delete leads
CREATE POLICY "Admin users can delete leads" ON leads
    FOR DELETE USING (is_admin());

-- Assigned users can view and update their assigned leads
CREATE POLICY "Assigned users can view their leads" ON leads
    FOR SELECT USING (assigned_user_id = auth.uid());

CREATE POLICY "Assigned users can update their leads" ON leads
    FOR UPDATE USING (assigned_user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO authenticated;
