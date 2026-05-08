require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, slug, autologin_secret')
    .is('autologin_secret', null);
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Organizations with NULL secrets:", data);
  
  if (data && data.length > 0) {
    console.log("Populating secrets...");
    for (const org of data) {
      await supabase.from('organizations').update({ autologin_secret: crypto.randomUUID() }).eq('id', org.id);
    }
    console.log("Done.");
  }
}

run();
