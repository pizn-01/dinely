-- ═══════════════════════════════════════════════════════════════
-- Super Admin Setup — Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Create the super_admins table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert the super admin record
--    ⚠️ REPLACE 'PASTE_USER_UUID_HERE' with the UUID from Step 1
INSERT INTO super_admins (user_id, name, email, is_active)
VALUES (
  '9ca19270-62f5-414a-8ea4-2b8be9d59a11',
  'Abdul Syed',
  'abdul.syed@bssas.co.uk',
  true
)
ON CONFLICT (email) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  is_active = true,
  updated_at = now();
