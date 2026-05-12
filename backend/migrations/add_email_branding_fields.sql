-- Add email branding fields to organizations table
ALTER TABLE organizations 
ADD COLUMN branding_color VARCHAR(7) DEFAULT '#0B1517',
ADD COLUMN email_custom_note TEXT;

-- Add comments
COMMENT ON COLUMN organizations.branding_color IS 'Email background color in hex format for confirmation emails';
COMMENT ON COLUMN organizations.email_custom_note IS 'Custom note that can be added to confirmation emails';
