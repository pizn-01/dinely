const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running migration: add_email_branding_fields.sql');
    
    const { error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database connection test failed:', error);
      process.exit(1);
    }

    console.log('Database connection successful. Please run the migration manually using the SQL file.');
    console.log('Migration file: backend/migrations/add_email_branding_fields.sql');
    
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

runMigration();
