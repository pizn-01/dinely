import { Terminal, Key, ShieldCheck, Zap, Layers, RefreshCw } from 'lucide-react'

interface IntegrationGuideTabProps {
  theme: 'dark' | 'light'
}

export default function IntegrationGuideTab({ theme }: IntegrationGuideTabProps) {
  const isDark = theme === 'dark'
  
  const cardBg = isDark ? '#161B22' : '#ffffff'
  const borderColor = isDark ? '#30363d' : '#e5e7eb'
  const textColor = isDark ? '#ffffff' : '#1f2937'
  const textMuted = isDark ? '#8b949e' : '#6b7280'
  const codeBg = isDark ? '#0d1117' : '#f3f4f6'
  const accentColor = '#C99C63'

  const headingStyle = { color: textColor, fontWeight: 600, marginTop: '24px', marginBottom: '16px' }
  const pStyle = { color: textMuted, lineHeight: 1.6, marginBottom: '16px' }
  const codeBlockStyle = {
    backgroundColor: codeBg,
    padding: '16px',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '0.875rem',
    color: isDark ? '#c9d1d9' : '#374151',
    overflowX: 'auto' as const,
    marginBottom: '20px',
    border: `1px solid ${borderColor}`
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ backgroundColor: cardBg, borderRadius: '12px', padding: '40px', border: `1px solid ${borderColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(201,156,99,0.1)', borderRadius: '12px', color: accentColor }}>
            <Layers size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: textColor, margin: 0 }}>ePOS Integration Guide</h1>
            <p style={{ color: textMuted, margin: '4px 0 0 0', fontSize: '1rem' }}>Connect your point of sale system with Dinely</p>
          </div>
        </div>

        <div style={{ height: '1px', backgroundColor: borderColor, margin: '32px 0' }} />

        <section>
          <h2 style={{ ...headingStyle, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} color={accentColor} /> 1. Authentication
          </h2>
          <p style={pStyle}>
            All integration API requests must be authenticated using the <code>X-API-Key</code> header. You can generate an API key from your admin dashboard settings.
          </p>
          <pre style={codeBlockStyle}>
{`GET /api/v1/integration/reservations
Host: api.dinely.com
X-API-Key: your_generated_api_key_here`}
          </pre>
        </section>

        <section>
          <h2 style={{ ...headingStyle, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={20} color={accentColor} /> 2. Core Endpoints
          </h2>
          <p style={pStyle}>Base URL: <code>https://api.dinely.com/api/v1/integration</code></p>
          
          <h3 style={{ ...headingStyle, fontSize: '1.1rem' }}>Fetch Today's Reservations</h3>
          <p style={pStyle}>Retrieve all reservations scheduled for the current date.</p>
          <pre style={codeBlockStyle}>GET /reservations?date=YYYY-MM-DD</pre>

          <h3 style={{ ...headingStyle, fontSize: '1.1rem' }}>Create Walk-In</h3>
          <p style={pStyle}>Quickly create a new reservation from the POS for walk-in guests.</p>
          <pre style={codeBlockStyle}>POST /reservations
{`{
  "tableId": "uuid-of-table",
  "partySize": 2,
  "guestFirstName": "Walk-in"
}`}</pre>

          <h3 style={{ ...headingStyle, fontSize: '1.1rem' }}>Update Status</h3>
          <p style={pStyle}>Keep Dinely in sync with the POS (e.g., when guests are seated or finish their meal).</p>
          <pre style={codeBlockStyle}>PATCH /reservations/:id/status
{`{
  "status": "seated" // "confirmed", "seated", "completed", "cancelled", "no_show"
}`}</pre>

          <h3 style={{ ...headingStyle, fontSize: '1.1rem' }}>Push Sale Total</h3>
          <p style={pStyle}>Send the final bill amount back to Dinely for analytics.</p>
          <pre style={codeBlockStyle}>PATCH /reservations/:id/total
{`{
  "totalAmount": 145.50
}`}</pre>
        </section>

        <div style={{ height: '1px', backgroundColor: borderColor, margin: '32px 0' }} />

        <section>
          <h2 style={{ ...headingStyle, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Key size={20} color={accentColor} /> 3. POS Autologin Setup (HMAC-Signed)
          </h2>
          <p style={pStyle}>
            To allow staff to jump from the ePOS screen directly into the Dinely staff dashboard without typing passwords, use the HMAC-signed autologin URL.
          </p>
          <p style={pStyle}>
            <strong>Base URL:</strong> <code>https://your-restaurant.dinely.com/autologin</code>
          </p>
          <p style={pStyle}>
            Generate an HMAC-SHA256 hash using your Integration Secret (found in the Settings tab). The message to sign must be exactly the staff member's email address.
          </p>
          
          <pre style={codeBlockStyle}>
{`const crypto = require('crypto');

const secret = 'your_integration_secret';
const email = 'staff@restaurant.com';
const slug = 'my-restaurant';

const hash = crypto
  .createHmac('sha256', secret)
  .update(email)
  .digest('hex');

const autologinUrl = \`https://your-restaurant.dinely.com/autologin?slug=\${slug}&email=\${encodeURIComponent(email)}&hash=\${hash}\`;`}
          </pre>
        </section>

        <section>
          <h2 style={{ ...headingStyle, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={20} color={accentColor} /> 4. Error Handling
          </h2>
          <ul style={{ ...pStyle, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><strong>400 Bad Request:</strong> Missing or invalid parameters.</li>
            <li><strong>401 Unauthorized:</strong> Invalid or missing <code>X-API-Key</code>.</li>
            <li><strong>403 Forbidden:</strong> Organization is not on the Professional plan.</li>
            <li><strong>404 Not Found:</strong> Resource does not exist.</li>
            <li><strong>429 Too Many Requests:</strong> Exceeded the API rate limit (Standard is 100 req/min).</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
