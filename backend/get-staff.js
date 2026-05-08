require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'abdul.syed@bssas.co.uk';
  const { data: staff } = await supabase.from('staff_members').select('id, user_id, restaurant_id, email, name').eq('email', email);
  console.log("Staff Members:", staff);
}

run();
