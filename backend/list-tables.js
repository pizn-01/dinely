require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.rpc('get_tables'); // This might not exist
  
  if (error) {
    // Try querying a system table if possible
    const { data: tables, error: err } = await supabase.from('pg_catalog.pg_tables').select('tablename');
    if (err) {
      console.error("Could not list tables:", err.message);
      return;
    }
    console.log("Tables:", tables.map(t => t.tablename));
  } else {
    console.log("Tables:", data);
  }
}

run();
