ALTER TABLE organizations ADD COLUMN autologin_secret UUID DEFAULT gen_random_uuid();
