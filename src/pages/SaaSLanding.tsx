import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ChevronRight, Check, Table, Building2, Globe } from 'lucide-react'
import dinelyLogo from '../assets/dinely-logo.png'
import heroImg from '../assets/image 33.png'
import feat1Img from '../assets/image 32.png'
import feat2Img from '../assets/Mask group.png'

// ─── Currency Geo-Detection ─────────────────────────────
interface CurrencyInfo {
  symbol: string;
  code: string;
  starterPrice: number;
  proPrice: number;
}

function detectCurrency(): CurrencyInfo {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const locale = navigator.language || '';

    // UK detection: timezone or locale
    if (tz.startsWith('Europe/London') || tz.startsWith('Europe/Belfast') || locale.startsWith('en-GB')) {
      return { symbol: '£', code: 'GBP', starterPrice: 29, proPrice: 79 };
    }

    // European detection
    const euroTimezones = ['Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Brussels', 'Europe/Vienna', 'Europe/Lisbon', 'Europe/Dublin', 'Europe/Helsinki', 'Europe/Athens', 'Europe/Warsaw', 'Europe/Prague', 'Europe/Budapest', 'Europe/Bucharest', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen'];
    if (euroTimezones.some(t => tz.startsWith(t)) || locale.match(/^(de|fr|es|it|nl|pt|el|pl|cs|hu|ro|sv|da|fi|no)/)) {
      return { symbol: '€', code: 'EUR', starterPrice: 29, proPrice: 79 };
    }

    // Default: USD
    return { symbol: '$', code: 'USD', starterPrice: 29, proPrice: 79 };
  } catch {
    return { symbol: '£', code: 'GBP', starterPrice: 29, proPrice: 79 };
  }
}


export default function SaaSLanding() {
  const primaryNavy = '#2b4461';
  const lightBg = '#f8fafc';
  const goldAccent = '#E5A96A'; // lighter orange-gold to match image
  const textDark = '#1e293b';
  const textMuted = '#64748b';

  const [currency, setCurrency] = useState<CurrencyInfo>(detectCurrency);

  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', fontFamily: 'var(--font-sans)', color: textDark }}>
      
      {/* Navigation */}
      <nav className="res-saas-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={dinelyLogo} alt="Dinely" style={{ height: '28px' }} />
        </div>
        
        <div className="res-saas-nav-links" style={{ gap: '32px', display: 'none', '@media(min-width: 768px)': { display: 'flex' } } as any}>
           <a href="#features" style={{ color: textDark, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Features</a>
           <a href="#how-it-works" style={{ color: textDark, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>How it Works</a>
           <a href="#pricing" style={{ color: textDark, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>Pricing</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
           <Link to="/login" style={{ color: textDark, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>Log In</Link>
           <Link to="/get-started?plan=professional" style={{ 
              backgroundColor: primaryNavy, color: '#ffffff', padding: '10px 20px', borderRadius: '6px', 
              textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, transition: 'opacity 0.2s' 
           }}>
              Get Started
           </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="res-saas-hero" style={{ padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '1200px', margin: '0 auto', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px', maxWidth: '480px' }}>
          <h1 className="res-saas-hero-title" style={{ fontSize: '3.4rem', fontWeight: 800, color: '#162b47', lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-0.02em' }}>
            Smart Table<br/>Reservation Software<br/>for Modern Restaurants
          </h1>
          <p style={{ fontSize: '1.15rem', color: textMuted, lineHeight: 1.6, marginBottom: '40px', maxWidth: '440px' }}>
            Manage bookings, optimize tables, and deliver better dining experiences — all in one platform.
          </p>
          <div className="res-saas-cta-btns" style={{ display: 'flex', gap: '16px' }}>
            <Link to="/get-started?plan=professional" style={{ 
                backgroundColor: primaryNavy, color: '#ffffff', padding: '14px 30px', borderRadius: '8px', 
                textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600
            }}>
                Get Started
            </Link>
            <a href="#pricing" style={{ 
                border: `1px solid ${textMuted}`, color: textDark, padding: '14px 30px', borderRadius: '8px', 
                textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600
            }}>
                View Pricing
            </a>
          </div>
        </div>

        {/* Hero Mockup */}
        <div style={{ flex: '1 1 500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img src={heroImg} alt="Hero Mockup" style={{ width: '100%', maxWidth: '640px', height: 'auto', borderRadius: '12px', opacity: 0.98 }} />
        </div>
      </section>

      {/* Value Proposition Banner */}
      <section style={{ backgroundColor: lightBg, padding: '48px 24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }}>
         <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: textDark, marginBottom: '24px' }}>
           Built for Modern Restaurants and Growing Hospitality Businesses
         </h3>
         <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>
              <Table size={20} color={primaryNavy} /> Built for restaurants of all sizes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>
              <Building2 size={20} color={primaryNavy} /> Hotel & hospitality ready
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b', fontSize: '1rem', fontWeight: 600 }}>
              <Globe size={20} color={primaryNavy} /> Works anywhere, on any device
            </div>
         </div>
      </section>

      {/* Features I */}
      <section id="features" className="res-saas-features" style={{ padding: '100px 48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '80px', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
         {/* Features I Mockup */}
         <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
            <img src={feat1Img} alt="Features I Mockup" style={{ width: '100%', maxWidth: '500px', height: 'auto', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
         </div>

         {/* Content */}
         <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#162b47', marginBottom: '16px', lineHeight: 1.2 }}>
              Take Control of Your<br/>Reservations
            </h2>
            <p style={{ fontSize: '1.05rem', color: textMuted, marginBottom: '32px' }}>
              Manage bookings from one simple dashboard.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Check size={16} color={goldAccent} strokeWidth={3} />
                 </div>
                 <span style={{ fontWeight: 600, color: textDark }}>Real-time availability</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Check size={16} color={goldAccent} strokeWidth={3} />
                 </div>
                 <span style={{ fontWeight: 600, color: textDark }}>Simple booking management</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Check size={16} color={goldAccent} strokeWidth={3} />
                 </div>
                 <span style={{ fontWeight: 600, color: textDark }}>Clean interface</span>
               </div>
            </div>
         </div>
      </section>

      {/* Flexible Reservation Flows Section */}
      <section style={{ backgroundColor: lightBg, padding: '80px 24px', textAlign: 'center' }}>
         <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#162b47', marginBottom: '12px' }}>Flexible Reservation Flows</h2>
         <p style={{ fontSize: '1.05rem', color: textMuted, marginBottom: '48px' }}>
           Four booking types to cover every scenario your restaurant needs.
         </p>
         
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
           <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 color={goldAccent} size={24} />
             </div>
             <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#162b47' }}>Premium Reservation</h4>
             <p style={{ fontSize: '0.85rem', color: textMuted, lineHeight: 1.5 }}>VIP and priority booking with special table preferences.</p>
           </div>
           <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 color={goldAccent} size={24} />
             </div>
             <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#162b47' }}>Staff Reservation</h4>
             <p style={{ fontSize: '0.85rem', color: textMuted, lineHeight: 1.5 }}>Internal booking for staff-managed reservations.</p>
           </div>
           <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 color={goldAccent} size={24} />
             </div>
             <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#162b47' }}>Logged-In Booking</h4>
             <p style={{ fontSize: '0.85rem', color: textMuted, lineHeight: 1.5 }}>Seamless booking for returning customers.</p>
           </div>
           <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 color={goldAccent} size={24} />
             </div>
             <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#162b47' }}>Guest Booking</h4>
             <p style={{ fontSize: '0.85rem', color: textMuted, lineHeight: 1.5 }}>Quick booking without account creation.</p>
           </div>
         </div>
      </section>

      {/* Features II */}
      <section className="res-saas-features" style={{ padding: '100px 48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '80px', flexWrap: 'wrap', maxWidth: '1200px', margin: '0 auto' }}>
         <div style={{ flex: '1 1 400px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#162b47', marginBottom: '32px', lineHeight: 1.2 }}>
              Designed for Smooth Dining<br/>Experiences
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Check size={16} color={goldAccent} strokeWidth={3} />
                 </div>
                 <span style={{ fontWeight: 600, color: textDark }}>Flexible booking flows</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Check size={16} color={goldAccent} strokeWidth={3} />
                 </div>
                 <span style={{ fontWeight: 600, color: textDark }}>Mobile-friendly</span>
               </div>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Check size={16} color={goldAccent} strokeWidth={3} />
                 </div>
                 <span style={{ fontWeight: 600, color: textDark }}>Easy to use</span>
               </div>
            </div>
         </div>

         {/* Features II Mockup */}
         <div style={{ flex: '1 1 400px', display: 'flex', justifyContent: 'center' }}>
            <img src={feat2Img} alt="Features II Mockup" style={{ width: '100%', maxWidth: '500px', height: 'auto', borderRadius: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
         </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{ backgroundColor: lightBg, padding: '80px 24px', textAlign: 'center' }}>
         <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#162b47', marginBottom: '12px' }}>How It Works</h2>
         <p style={{ fontSize: '1.05rem', color: textMuted, marginBottom: '64px' }}>
           Three simple steps to manage every reservation.
         </p>
         
         <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap', maxWidth: '1000px', margin: '0 auto', position: 'relative' }}>
           <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: primaryNavy, marginBottom: '24px' }}>1</div>
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Select Table</h4>
              <p style={{ fontSize: '0.85rem', color: textMuted }}>Browse available tables and pick the perfect one.</p>
           </div>
           <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: primaryNavy, marginBottom: '24px' }}>2</div>
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Choose Booking Type</h4>
              <p style={{ fontSize: '0.85rem', color: textMuted }}>Select from guest, logged in, staff, or premium booking.</p>
           </div>
           <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: primaryNavy, marginBottom: '24px' }}>3</div>
              <h4 style={{ fontWeight: 700, marginBottom: '8px' }}>Confirm</h4>
              <p style={{ fontSize: '0.85rem', color: textMuted }}>Review details and confirm — it's that simple.</p>
           </div>
         </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '80px 24px', textAlign: 'center' }}>
         <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#162b47', marginBottom: '12px' }}>Simple, Flexible Pricing</h2>
         <p style={{ fontSize: '1.05rem', color: textMuted, marginBottom: '64px' }}>
           Try any plan free for 14 days. Continue only if it fits your needs.
         </p>
         
         <div className="res-saas-pricing" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', maxWidth: '1100px', margin: '0 auto', alignItems: 'center' }}>
           {/* Starter */}
           <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px 32px', textAlign: 'left', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, color: textMuted, marginBottom: '16px' }}>14 Days Free Trial</div>
             <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>Starter</h3>
             <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '24px' }}>{currency.symbol}{currency.starterPrice} <span style={{ fontSize: '1rem', color: textMuted, fontWeight: 500 }}>/ month</span></div>
             <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Basic reservation system</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Unlimited bookings</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Guest + user booking</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Email notifications</li>
             </ul>
             <Link to="/get-started?plan=starter" style={{ display: 'block', textAlign: 'center', backgroundColor: primaryNavy, color: '#ffffff', padding: '14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Get Started</Link>
           </div>
           
           {/* Professional */}
           <div style={{ border: `1px solid ${primaryNavy}`, borderRadius: '16px', padding: '48px 32px', textAlign: 'left', backgroundColor: primaryNavy, color: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', position: 'relative' }}>
             <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', backgroundColor: goldAccent, color: '#ffffff', padding: '6px 16px', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 700 }}>Most Popular</div>
             <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>14 Days Free Trial</div>
             <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>Professional</h3>
             <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '24px' }}>{currency.symbol}{currency.proPrice} <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>/ month</span></div>
             <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={goldAccent} /> Unlimited bookings</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={goldAccent} /> All reservation flows</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={goldAccent} /> Staff booking system</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={goldAccent} /> Basic analytics</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={goldAccent} /> Priority support</li>
             </ul>
             <Link to="/get-started?plan=professional" style={{ display: 'block', textAlign: 'center', backgroundColor: '#ffffff', color: primaryNavy, padding: '14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 700 }}>Get Started</Link>
           </div>

           {/* Enterprise */}
           <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '40px 32px', textAlign: 'left', backgroundColor: '#ffffff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ display: 'inline-block', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 600, color: textMuted, marginBottom: '16px' }}>Contact Sales</div>
             <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>Enterprise</h3>
             <div style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '24px' }}>Custom</div>
             <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Multi-location support</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Advanced analytics</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Integration needs</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Dedicated account manager</li>
               <li style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem' }}><Check size={18} color={primaryNavy} /> Custom SLA</li>
             </ul>
             <a href="mailto:hello@dinely.co.uk?subject=Enterprise Plan Inquiry" style={{ display: 'block', textAlign: 'center', backgroundColor: primaryNavy, color: '#ffffff', padding: '14px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600 }}>Contact Us</a>
           </div>
         </div>
      </section>

      {/* Built to Grow Section */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
         <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#162b47', marginBottom: '48px' }}>Built to Grow With Your Business</h2>
         
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
           <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 color={goldAccent} size={24} />
             </div>
             <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#162b47' }}>Scalable System</h4>
             <p style={{ fontSize: '0.85rem', color: textMuted, lineHeight: 1.5 }}>Grows with your restaurant, from one location to many.</p>
           </div>
           <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 color={goldAccent} size={24} />
             </div>
             <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#162b47' }}>Easy Onboarding</h4>
             <p style={{ fontSize: '0.85rem', color: textMuted, lineHeight: 1.5 }}>Get started in minutes with a guided setup.</p>
           </div>
           <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '40px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
             <div style={{ backgroundColor: '#fff7ed', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                <CheckCircle2 color={goldAccent} size={24} />
             </div>
             <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '12px', color: '#162b47' }}>No Complex Setup</h4>
             <p style={{ fontSize: '0.85rem', color: textMuted, lineHeight: 1.5 }}>Plug and play — no developer required.</p>
           </div>
         </div>
      </section>

      {/* CTA Footer Wrapper */}
      <div style={{ backgroundColor: primaryNavy, color: '#ffffff', textAlign: 'center', paddingTop: '80px' }}>
         <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>Start Free. Upgrade When You're Ready.</h2>
         <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '40px' }}>Test the platform with a short trial and continue only if it works for you.</p>
         <Link to="/get-started" style={{ 
            backgroundColor: '#ffffff', color: primaryNavy, padding: '16px 36px', borderRadius: '8px', 
            textDecoration: 'none', fontSize: '1.05rem', fontWeight: 700, display: 'inline-block', marginBottom: '80px'
         }}>
            Get Started
         </Link>

         {/* Standard Footer */}
         <footer className="res-saas-footer" style={{ backgroundColor: '#ffffff', padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={dinelyLogo} alt="Dinely" style={{ height: '24px' }} />
            </div>
            <div style={{ color: textMuted, fontSize: '0.9rem' }}>
              © {new Date().getFullYear()} Dinely. All rights reserved.
            </div>
         </footer>
      </div>
    </div>
  )
}
