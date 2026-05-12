require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
  // Find all reservations across all orgs to understand the state
  const { data: allRes, error } = await supabase
    .from('reservations')
    .select('id, restaurant_id, table_id, reservation_date, start_time, end_time, status, guest_first_name, created_at')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total recent reservations: ${allRes.length}`);
  console.log('');
  
  for (const r of allRes) {
    console.log(`  ${r.id.slice(0, 8)} | ${r.reservation_date} ${r.start_time}-${r.end_time} | ${r.status.padEnd(12)} | ${r.guest_first_name || 'no-name'} | table: ${r.table_id?.slice(0, 8) || 'none'} | ${r.created_at}`);
  }

  // Find duplicates: same table, same date, same time, status=confirmed
  const { data: dupes } = await supabase
    .from('reservations')
    .select('id, table_id, reservation_date, start_time, status')
    .in('status', ['confirmed', 'pending'])
    .order('created_at', { ascending: true });

  const seen = new Map();
  const toCancel = [];
  
  for (const r of (dupes || [])) {
    const key = `${r.table_id}|${r.reservation_date}|${r.start_time}`;
    if (seen.has(key)) {
      toCancel.push(r.id);
    } else {
      seen.set(key, r.id);
    }
  }

  if (toCancel.length > 0) {
    console.log(`\nFound ${toCancel.length} duplicate reservation(s) to cancel:`, toCancel);
  } else {
    console.log('\nNo duplicate reservations found.');
  }
}

cleanup();
