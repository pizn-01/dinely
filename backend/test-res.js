const axios = require('axios');
const API_URL = 'https://dinely.fly.dev/api/v1';

async function test() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config();
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // The previous script failed because it used staff_members.
    // Let's use organizations to get an org and check reservations.
    // Actually, I can just query the database directly.
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const rid = orgs[0].id;
    
    const { data: resvs } = await supabase.from('reservations').select('*').eq('restaurant_id', rid).eq('reservation_date', '2026-05-15');
    console.log(`Reservations for ${rid} on May 15:`, resvs.length);
    
    // What if the table ID is different?
    console.log(resvs.map(r => ({ table_id: r.table_id, status: r.status })));
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
