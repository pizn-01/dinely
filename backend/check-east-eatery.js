require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, autologin_secret')
    .eq('slug', 'east-eatery-3y425z')
    .single();
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("East Eatery Secret:", data);
}

run();
