import { Link, useParams } from 'react-router-dom'
import { LogIn, User, ArrowRight, Star } from 'lucide-react'
import mainBg from '../assets/main-bg.png'

export default function UnifiedLanding() {
  const { slug } = useParams()
  
  // Construct dynamic links based on whether a slug was provided
  const guestLink = slug ? `/book-a-table?restaurant=${slug}` : '/book-a-table'
  const loginLink = slug ? `/login?restaurant=${slug}` : '/login'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      color: '#ffffff',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      backgroundImage: `linear-gradient(rgba(11, 21, 23, 0.4), rgba(11, 21, 23, 0.6)), url(${mainBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Background aesthetics */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(201, 156, 99, 0.1) 0%, transparent 60%)',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        right: '-10%',
        width: '50vw',
        height: '50vw',
        background: 'radial-gradient(circle, rgba(94, 234, 122, 0.05) 0%, transparent 60%)',
        zIndex: 0
      }} />

      {/* Navbar */}
      <nav style={{ padding: '32px 48px', position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#C99C63', letterSpacing: '-0.02em' }}>
          Dinely.
        </h1>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link to={loginLink} style={{ color: '#8b949e', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, padding: '8px 16px', borderRadius: '8px', transition: 'all 0.2s' }}>
            Staff Login
          </Link>
          <Link to={loginLink} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#101A1C', backgroundColor: '#C99C63', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, padding: '8px 20px', borderRadius: '100px', transition: 'all 0.2s' }}>
            <LogIn size={16} /> Restaurant Login
          </Link>
        </div>
      </nav>

      {/* Hero Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', position: 'relative', zIndex: 10, textAlign: 'center' }}>
        <div style={{ animation: 'fadeInUp 0.6s ease-out' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', backgroundColor: 'rgba(201, 156, 99, 0.1)', color: '#C99C63', borderRadius: '100px', fontSize: '0.875rem', fontWeight: 600, marginBottom: '24px' }}>
            <Star size={16} /> Premium Dining Experience
          </div>
          <h2 style={{ fontSize: '4rem', fontWeight: 800, margin: '0 0 24px 0', lineHeight: 1.1, letterSpacing: '-0.03em', maxWidth: '800px' }}>
            Exceptional culinary <br/>moments await.
          </h2>
          <p style={{ fontSize: '1.25rem', color: '#8b949e', maxWidth: '600px', margin: '0 auto 48px auto', lineHeight: 1.6 }}>
            Reserve your table seamlessly. Discover exclusive menus, priority seating, and unmatched hospitality.
          </p>

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            {/* Guest Flow */}
            <Link to={guestLink} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '16px 32px', backgroundColor: '#0B1517', border: '1px solid #30363d',
              borderRadius: '100px', textDecoration: 'none', color: '#ffffff', transition: 'all 0.3s',
              minWidth: '260px', justifyContent: 'space-between'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#C99C63' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#30363d' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                <User size={20} color="#8b949e" />
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#ffffff' }}>Continue as Guest</div>
                  <div style={{ fontSize: '0.8rem', color: '#8b949e' }}>Standard Reservation</div>
                </div>
              </div>
              <ArrowRight size={18} color="#8b949e" />
            </Link>

            {/* Member Flow */}
            <Link to={loginLink} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '16px 32px', backgroundColor: '#C99C63', border: '1px solid #C99C63',
              borderRadius: '100px', textDecoration: 'none', color: '#101A1C', transition: 'all 0.3s',
              minWidth: '260px', justifyContent: 'space-between'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                <Star size={20} color="#101A1C" />
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#101A1C' }}>Member Login</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(16,26,28,0.7)' }}>VIP Benefits & Priority</div>
                </div>
              </div>
              <ArrowRight size={18} color="#101A1C" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div style={{ padding: '24px', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', position: 'relative', zIndex: 10 }}>
        © {new Date().getFullYear()} Dinely. All rights reserved.
      </div>
    </div>
  )
}
