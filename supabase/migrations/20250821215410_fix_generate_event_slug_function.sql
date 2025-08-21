-- Fix the generate_event_slug function to work with TIMESTAMP WITH TIME ZONE instead of DATE
-- The function signature needs to be updated to match the new column type

-- Drop the existing function and trigger first
DROP TRIGGER IF EXISTS trigger_set_event_slug ON events;
DROP FUNCTION IF EXISTS generate_event_slug(TEXT, DATE);
DROP FUNCTION IF EXISTS set_event_slug();

-- Recreate the function with the correct parameter type
CREATE OR REPLACE FUNCTION generate_event_slug(event_name TEXT, event_date TIMESTAMP WITH TIME ZONE)
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
    
    -- Add date in YYYY-MM-DD format (extract date part from timestamp)
    base_slug := base_slug || '-' || TO_CHAR(event_date::DATE, 'YYYY-MM-DD');
    
    -- Check if slug exists and append counter if needed
    final_slug := base_slug;
    
    WHILE EXISTS(SELECT 1 FROM events WHERE url_slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter::TEXT;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION set_event_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.url_slug IS NULL OR NEW.url_slug = '' THEN
        NEW.url_slug := generate_event_slug(NEW.name, NEW.date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_set_event_slug
    BEFORE INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION set_event_slug();
