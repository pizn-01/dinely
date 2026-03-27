require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('memberships').select('*').limit(1);
  if (error) {
    console.error("Error querying memberships:", error);
  } else {
    console.log("Memberships found:", data);
  }
}

run();
