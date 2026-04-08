const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'SaaSLanding.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace 1: Starter button - first occurrence of /signup in pricing section
// We need to find and replace the three pricing CTA links

// Count occurrences of to="/signup" 
let count = 0;
content = content.replace(/to="\/signup"/g, (match) => {
  count++;
  // The pricing buttons are the 3rd, 4th, and 5th occurrences (after nav and hero buttons)
  if (count === 3) return 'to="/signup?plan=starter"';
  if (count === 4) return 'to="/signup?plan=professional"';
  // 5th is enterprise - we'll handle differently
  return match;
});

// Replace enterprise "Get Started" link with Contact Us mailto
// Find the last <Link to="/signup" in the pricing section (the 5th one, now unchanged)
content = content.replace(
  /(<Link to="\/signup" style=\{\{ display: 'block', textAlign: 'center', backgroundColor: primaryNavy, color: '#ffffff', padding: '14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 \}\}>Get Started<\/Link>)(?![\s\S]*<Link to="\/signup")/,
  `<a href="mailto:hello@dinely.co.uk?subject=Enterprise%20Plan%20Inquiry" style={{ display: 'block', textAlign: 'center', backgroundColor: primaryNavy, color: '#ffffff', padding: '14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Contact Us</a>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done! Updated pricing buttons in SaaSLanding.tsx');
console.log('- Starter: /signup?plan=starter');
console.log('- Professional: /signup?plan=professional');  
console.log('- Enterprise: mailto Contact Us');
