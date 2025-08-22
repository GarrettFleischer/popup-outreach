-- Add giveaways text field to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS giveaways_text TEXT;

-- Add comment to document the new column
COMMENT ON COLUMN events.giveaways_text IS 'Custom text for giveaways section. Leave empty to use default "GIVEAWAYS CASH PRIZES & GIFT CARDS"';
