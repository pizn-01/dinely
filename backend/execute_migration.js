const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    console.log('Executing migration: add_email_branding_fields.sql');
    
    // Execute the SQL directly
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE organizations 
        ADD COLUMN IF NOT EXISTS branding_color VARCHAR(7) DEFAULT '#0B1517',
        ADD COLUMN IF NOT EXISTS email_custom_note TEXT;
        
        COMMENT ON COLUMN organizations.branding_color IS 'Email background color in hex format for confirmation emails';
        COMMENT ON COLUMN organizations.email_custom_note IS 'Custom note that can be added to confirmation emails';
      `
    });

    if (error) {
      console.error('Migration failed:', error);
      
      // Try alternative approach - check if columns exist and add them one by one
      console.log('Trying alternative approach...');
      
      // Check if branding_color exists
      const { data: checkData, error: checkError } = await supabase
        .from('organizations')
        .select('branding_color')
        .limit(1);
      
      if (checkError && checkError.message.includes('column "branding_color" does not exist')) {
        console.log('Adding branding_color column...');
        // We'll need to use the Supabase SQL editor or direct database access
        console.log('Please run the following SQL manually in your Supabase SQL editor:');
        console.log(`
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS branding_color VARCHAR(7) DEFAULT '#0B1517',
ADD COLUMN IF NOT EXISTS email_custom_note TEXT;

COMMENT ON COLUMN organizations.branding_color IS 'Email background color in hex format for confirmation emails';
COMMENT ON COLUMN organizations.email_custom_note IS 'Custom note that can be added to confirmation emails';
        `);
      } else {
        console.log('Columns appear to exist already');
      }
    } else {
      console.log('Migration executed successfully!');
    }
    
  } catch (err) {
    console.error('Migration error:', err);
    console.log('\nPlease run the following SQL manually in your Supabase SQL editor:');
    console.log(`
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS branding_color VARCHAR(7) DEFAULT '#0B1517',
ADD COLUMN IF NOT EXISTS email_custom_note TEXT;

COMMENT ON COLUMN organizations.branding_color IS 'Email background color in hex format for confirmation emails';
COMMENT ON COLUMN organizations.email_custom_note IS 'Custom note that can be added to confirmation emails';
    `);
  }
}

executeMigration();
