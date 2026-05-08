const crypto = require('crypto');
const slug = 'east-eatery-3y425z';
const email = 'tablets.easteatery@gmail.com';
const secret = 'b8165159-e659-4acb-8512-c453f0b4d70f';
const hash = crypto.createHmac('sha256', secret).update(slug + '|' + email).digest('hex');
console.log("FINAL HASH:", hash);
