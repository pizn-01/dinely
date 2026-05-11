require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, tables!inner(id, name, table_number)')
    .eq('reservation_date', '2026-05-15');

  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Reservations on 2026-05-15:");
  console.log(JSON.stringify(data.map(r => ({
    id: r.id,
    table: r.tables.name || r.tables.table_number,
    time: r.start_time + ' - ' + r.end_time,
    status: r.status,
    guest: r.guest_first_name
  })), null, 2));
}

check();
