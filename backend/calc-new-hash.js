const crypto = require('crypto');
const slug = 'east-eatery-3y425z';
const email = 'tablets.easteatery@gmail.com';
const secret = '2101d25a-bfc7-4fa6-851a-23a76db49307';
const hash = crypto.createHmac('sha256', secret).update(slug + '|' + email).digest('hex');
console.log("NEW HASH:", hash);
