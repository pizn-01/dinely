const axios = require('axios');
const API_URL = 'http://localhost:5000/api/v1';

async function test() {
  try {
    // 1. Login as staff (replace with a known staff email or query DB for one)
    const { createClient } = require('@supabase/supabase-js');
    require('dotenv').config();
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: staff } = await supabase.from('staff_members').select('email').limit(1);
    if (!staff || staff.length === 0) {
      console.log("No staff found");
      return;
    }
    
    const email = staff[0].email;
    console.log("Testing with staff email:", email);
    
    const loginRes = await axios.post(`${API_URL}/auth/staff-login`, {
      email: email,
      password: 'password123' // assuming default password
    });
    
    const token = loginRes.data.data.token;
    const rid = loginRes.data.data.restaurant.id;
    console.log("Logged in. Restaurant ID:", rid);
    
    const tablesRes = await axios.get(`${API_URL}/organizations/${rid}/tables`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("Tables Response Data:", JSON.stringify(tablesRes.data, null, 2));
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

test();
