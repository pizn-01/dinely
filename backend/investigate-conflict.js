require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const email = 'abdul.syed@bssas.co.uk';
  
  // 1. Check staff_members
  const { data: staff, error: staffErr } = await supabase
    .from('staff_members')
    .select('*, organizations(*)')
    .eq('email', email);
    
  console.log("Staff Members for", email, ":", staff);
  
  // 2. Check super_admins
  // Note: super_admins table might not have email, usually links via user_id
  // We need to find the user_id first.
  
  const { data: userData, error: userErr } = await supabase.auth.admin.listUsers();
  const user = userData.users.find(u => u.email === email);
  
  if (!user) {
    console.log("User not found in Supabase Auth:", email);
    return;
  }
  
  console.log("Supabase Auth User ID:", user.id);
  
  const { data: superAdmin, error: saErr } = await supabase
    .from('super_admins')
    .select('*')
    .eq('user_id', user.id);
    
  console.log("Super Admin Record:", superAdmin);
  
  if (staff && staff.length > 0) {
    console.log("Linked Organization ID:", staff[0].restaurant_id);
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', staff[0].restaurant_id)
      .single();
    console.log("Organization Data:", org);
  }
}

run();
