const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugOrgData() {
  try {
    console.log('Fetching organization data...');
    
    // Get first organization to check structure
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return;
    }

    console.log('Organization data structure:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check specifically for the new fields
    console.log('\n=== Email Branding Fields ===');
    console.log('branding_color:', data.branding_color);
    console.log('email_custom_note:', data.email_custom_note);
    console.log('logo_url:', data.logo_url);
    
    // Test updating the fields
    console.log('\n=== Testing Update ===');
    const testUpdate = {
      branding_color: '#FF5733',
      email_custom_note: 'Test custom note for debugging'
    };
    
    const { data: updateData, error: updateError } = await supabase
      .from('organizations')
      .update(testUpdate)
      .eq('id', data.id)
      .select()
      .single();
      
    if (updateError) {
      console.error('Update error:', updateError);
    } else {
      console.log('Update successful!');
      console.log('Updated branding_color:', updateData.branding_color);
      console.log('Updated email_custom_note:', updateData.email_custom_note);
    }
    
  } catch (err) {
    console.error('Debug error:', err);
  }
}

debugOrgData();
