-- Update default gradient colors to match the original orange theme
-- First, update any existing events that have the old default colors
UPDATE events 
SET 
  gradient_from_color = '#f97316',
  gradient_through_color = '#ea580c',
  gradient_to_color = '#dc2626'
WHERE 
  gradient_from_color = '#3B82F6' 
  OR gradient_through_color = '#8B5CF6' 
  OR gradient_to_color = '#EC4899'
  OR gradient_from_color IS NULL
  OR gradient_through_color IS NULL
  OR gradient_to_color IS NULL;

-- Change the column defaults for future events
ALTER TABLE events ALTER COLUMN gradient_from_color SET DEFAULT '#f97316';
ALTER TABLE events ALTER COLUMN gradient_through_color SET DEFAULT '#ea580c';
ALTER TABLE events ALTER COLUMN gradient_to_color SET DEFAULT '#dc2626';
