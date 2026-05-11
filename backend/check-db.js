require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkData() {
  console.log("Checking DB...");
  const { data: orgs } = await supabase.from('organizations').select('id, name');
  console.log("Organizations:", orgs);

  if (orgs && orgs.length > 0) {
    for (const org of orgs) {
      const { data: tables } = await supabase.from('tables').select('id, name, table_number').eq('restaurant_id', org.id);
      console.log(`Tables for ${org.name}:`, tables?.length);

      const { data: staff } = await supabase.from('staff_members').select('id, email, restaurant_id').eq('restaurant_id', org.id);
      console.log(`Staff for ${org.name}:`, staff?.length);
    }
  }
}

checkData();
