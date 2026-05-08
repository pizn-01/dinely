require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const saEmail = 'abdul.syed@bssas.co.uk';
  const saPassword = '##dinely-qwen*9';
  const restEmail = 'lutfishah@yahoo.com';
  const restPassword = 'shahlutfi##EastEatery!';
  
  console.log("Starting account split process...");

  // 1. Find existing Super Admin / Current account user_id
  const { data: users } = await supabase.auth.admin.listUsers();
  const saUser = users.users.find(u => u.email === saEmail);
  
  if (!saUser) {
    console.error("Super Admin user not found!");
    return;
  }
  
  const oldUserId = saUser.id;
  console.log(`Found current user ID for ${saEmail}: ${oldUserId}`);

  // 2. Create the NEW user for the restaurant
  console.log(`Creating new user for ${restEmail}...`);
  const { data: newAuthData, error: newAuthError } = await supabase.auth.admin.createUser({
    email: restEmail,
    password: restPassword,
    email_confirm: true,
    user_metadata: {
      name: 'Lutfi Shah',
      role: 'admin'
    }
  });

  if (newAuthError) {
    console.error("Error creating new user:", newAuthError.message);
    // If it already exists, we might need to handle it.
    if (newAuthError.message.includes('already exists')) {
       console.log("User already exists, checking ID...");
       const existingNewUser = users.users.find(u => u.email === restEmail);
       if (existingNewUser) {
         newAuthData.user = existingNewUser;
       } else {
         return;
       }
    } else {
      return;
    }
  }

  const newUserId = newAuthData.user.id;
  console.log(`New user ID for ${restEmail}: ${newUserId}`);

  // 3. Update staff_members record
  console.log("Updating staff_members record...");
  const { error: staffUpdateErr } = await supabase
    .from('staff_members')
    .update({
      user_id: newUserId,
      email: restEmail,
      name: 'Lutfi Shah'
    })
    .eq('user_id', oldUserId); // Move all staff memberships associated with this ID to the new one
    // Note: If Abdul has other memberships, they will all move. 
    // But since he's splitting his identity, this is usually what's wanted.

  if (staffUpdateErr) {
    console.error("Error updating staff_members:", staffUpdateErr.message);
  }

  // 4. Update organizations owner_id
  console.log("Updating organizations owner_id...");
  const { error: orgUpdateErr } = await supabase
    .from('organizations')
    .update({ owner_id: newUserId })
    .eq('owner_id', oldUserId);

  if (orgUpdateErr) {
    console.error("Error updating organizations:", orgUpdateErr.message);
  }

  // 5. Update Super Admin password
  console.log(`Updating Super Admin password for ${saEmail}...`);
  const { error: saPassError } = await supabase.auth.admin.updateUserById(oldUserId, {
    password: saPassword
  });

  if (saPassError) {
    console.error("Error updating Super Admin password:", saPassError.message);
  }

  console.log("Process completed!");
  console.log(`Super Admin: ${saEmail} / ${saPassword}`);
  console.log(`Restaurant: ${restEmail} / ${restPassword}`);
}

run();
