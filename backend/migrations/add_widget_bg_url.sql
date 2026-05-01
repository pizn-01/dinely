-- Add widget_bg_url column to organizations table
-- This column stores the URL of the custom background image for the public reservation widget
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS widget_bg_url TEXT;
