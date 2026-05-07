-- Add public widget text fields + staff trusted IP auto-login settings

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS widget_heading TEXT,
  ADD COLUMN IF NOT EXISTS widget_cta_text TEXT,
  ADD COLUMN IF NOT EXISTS staff_ip_login_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS staff_trusted_ips TEXT;

