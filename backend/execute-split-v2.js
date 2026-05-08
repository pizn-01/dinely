require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const saEmail = 'abdul.syed@bssas.co.uk';
  const saPassword = '##dinely-qwen*9';
  const restEmail = 'lutfishah@yahoo.com';
  const restPassword = 'shahlutfi##EastEatery!';
  
  console.log("Starting account split process (v2)...");

  // 1. Get IDs for both accounts
  const { data: userData } = await supabase.auth.admin.listUsers();
  const saUser = userData.users.find(u => u.email === saEmail);
  let restUser = userData.users.find(u => u.email === restEmail);
  
  if (!saUser) {
    console.error(`Super Admin user ${saEmail} not found!`);
    return;
  }
  
  const oldUserId = saUser.id;
  console.log(`Super Admin user ID: ${oldUserId}`);

  if (restUser) {
    console.log(`Found existing user for ${restEmail}: ${restUser.id}`);
  } else {
    console.log(`Creating new user for ${restEmail}...`);
    const { data: newAuthData, error: newAuthError } = await supabase.auth.admin.createUser({
      email: restEmail,
      password: restPassword,
      email_confirm: true,
      user_metadata: { name: 'Lutfi Shah', role: 'admin' }
    });
    if (newAuthError) {
      console.error("Error creating user:", newAuthError.message);
      return;
    }
    restUser = newAuthData.user;
  }
  
  const newUserId = restUser.id;

  // 2. Update staff_members
  console.log("Updating staff_members record...");
  const { data: staffRecs } = await supabase.from('staff_members').select('*').eq('user_id', oldUserId);
  console.log(`Found ${staffRecs ? staffRecs.length : 0} staff records to migrate.`);

  const { error: staffUpdateErr } = await supabase
    .from('staff_members')
    .update({
      user_id: newUserId,
      email: restEmail,
      name: 'Lutfi Shah'
    })
    .eq('user_id', oldUserId);

  if (staffUpdateErr) console.error("Error updating staff_members:", staffUpdateErr.message);

  // 3. Update organizations owner_id
  console.log("Updating organizations owner_id...");
  const { error: orgUpdateErr } = await supabase
    .from('organizations')
    .update({ owner_id: newUserId })
    .eq('owner_id', oldUserId);

  if (orgUpdateErr) console.error("Error updating organizations:", orgUpdateErr.message);

  // 4. Update Passwords
  console.log(`Updating ${saEmail} password...`);
  await supabase.auth.admin.updateUserById(oldUserId, { password: saPassword });

  console.log(`Updating ${restEmail} password...`);
  await supabase.auth.admin.updateUserById(newUserId, { password: restPassword });

  console.log("DONE.");
}

run();
