const axios = require('axios');

async function test() {
  const url = 'http://localhost:3001/api/v1/auth/autologin';
  const params = {
    slug: 'east-eatery-3y425z',
    email: 'tablets.easteatery@gmail.com',
    hash: 'f5e583e6cdfe50e382f1ce1804d83862c574ac6cb2bf04a52f9432ffeb0c8a1c'
  };

  try {
    console.log("Testing local autologin...");
    const res = await axios.get(url, { params });
    console.log("Success! Status:", res.status);
    console.log("Response:", res.data);
  } catch (err) {
    console.error("Error! Status:", err.response?.status);
    console.error("Data:", err.response?.data);
  }
}

test();
