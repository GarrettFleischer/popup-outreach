-- Remove unnecessary fields from leads table
-- These fields don't make sense for lead management and outreach

ALTER TABLE leads DROP COLUMN IF EXISTS company;
ALTER TABLE leads DROP COLUMN IF EXISTS job_title;
ALTER TABLE leads DROP COLUMN IF EXISTS dietary_restrictions;
ALTER TABLE leads DROP COLUMN IF EXISTS additional_notes;

-- Add age_range field to leads table for outreach strategy
ALTER TABLE leads ADD COLUMN IF NOT EXISTS age_range age_range;
