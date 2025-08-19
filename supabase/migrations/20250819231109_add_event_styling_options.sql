-- Add styling options to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS gradient_from_color VARCHAR(7) DEFAULT '#3B82F6';
ALTER TABLE events ADD COLUMN IF NOT EXISTS gradient_through_color VARCHAR(7) DEFAULT '#8B5CF6';
ALTER TABLE events ADD COLUMN IF NOT EXISTS gradient_to_color VARCHAR(7) DEFAULT '#EC4899';
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_title TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_subtitle TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS custom_description TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS grand_prize TEXT;

-- Add comments to document the new columns
COMMENT ON COLUMN events.gradient_from_color IS 'Starting color for background gradient (hex format)';
COMMENT ON COLUMN events.gradient_through_color IS 'Middle color for background gradient (hex format)';
COMMENT ON COLUMN events.gradient_to_color IS 'Ending color for background gradient (hex format)';
COMMENT ON COLUMN events.custom_title IS 'Custom title to display instead of event name';
COMMENT ON COLUMN events.custom_subtitle IS 'Custom subtitle for the event';
COMMENT ON COLUMN events.custom_description IS 'Custom description for the event';
COMMENT ON COLUMN events.grand_prize IS 'Grand prize description for the event';

-- Add constraints for hex color format
ALTER TABLE events ADD CONSTRAINT check_gradient_from_color_format 
    CHECK (gradient_from_color ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE events ADD CONSTRAINT check_gradient_through_color_format 
    CHECK (gradient_through_color ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE events ADD CONSTRAINT check_gradient_to_color_format 
    CHECK (gradient_to_color ~ '^#[0-9A-Fa-f]{6}$');
