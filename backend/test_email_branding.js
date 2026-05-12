const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testBranding() {
  try {
    console.log('Testing email branding fields...');
    
    // Get first organization to test
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching organization:', error);
      return;
    }

    console.log('Organization data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check specifically for branding fields
    console.log('\n=== Branding Fields Check ===');
    console.log('branding_color:', data.branding_color);
    console.log('email_custom_note:', data.email_custom_note);
    console.log('logo_url:', data.logo_url);
    
    // Test updating branding color
    const testColor = '#C99C63';
    const testNote = 'Test custom note for debugging';
    
    console.log('\n=== Testing Update ===');
    const { data: updateData, error: updateError } = await supabase
      .from('organizations')
      .update({ 
        branding_color: testColor,
        email_custom_note: testNote
      })
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
    console.error('Test error:', err);
  }
}

testBranding();
