require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const slug = 'east-eatery-3y425z';
  const secret = crypto.randomUUID();
  
  console.log(`Setting autologin_secret for ${slug}...`);
  
  const { data, error } = await supabase
    .from('organizations')
    .update({ autologin_secret: secret })
    .eq('slug', slug)
    .select()
    .single();
    
  if (error) {
    console.error("Error updating organization:", error.message);
    if (error.message.includes('column "autologin_secret" of relation "organizations" does not exist')) {
       console.log("The column does not exist yet. Please run the migration first.");
    }
    return;
  }
  
  console.log(`Success! Autologin Secret for ${slug}: ${secret}`);
}

run();
