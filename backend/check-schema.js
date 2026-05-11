require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('staff_members').select('*').limit(1);
  console.log("Staff_members error:", error);
  console.log("Staff_members data:", data);

  const { data: orgs, error: orgErr } = await supabase.from('organizations').select('*').limit(1);
  console.log("Orgs error:", orgErr);
  console.log("Orgs data:", orgs);
}

checkSchema();
