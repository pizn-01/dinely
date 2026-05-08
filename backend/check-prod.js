const axios = require('axios');

async function checkProd() {
  const url = 'https://dinely.fly.dev/api/v1/auth/autologin';
  try {
    console.log("Checking production autologin endpoint...");
    await axios.get(url);
  } catch (err) {
    if (err.response?.status === 404) {
      console.log("Status: 404 - STILL NOT DEPLOYED");
    } else if (err.response?.status === 400 || err.response?.status === 401) {
      console.log(`Status: ${err.response.status} - DEPLOYED AND REACHABLE!`);
    } else {
      console.log("Status:", err.response?.status || "Unknown");
    }
  }
}

checkProd();
