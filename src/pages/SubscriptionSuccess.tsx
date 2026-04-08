import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react'
import dinelyLogo from '../assets/dinely-logo.png'

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    // Brief delay to let webhook process, then confirm
    const timer = setTimeout(() => {
      if (sessionId) {
        setStatus('success')
      } else {
        setStatus('error')
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [sessionId])

  const primaryNavy = '#2b4461'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: 'var(--font-sans)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo */}
      <div style={{ position: 'absolute', top: '32px', left: '48px' }}>
        <img src={dinelyLogo} alt="Dinely" style={{ height: '28px' }} />
      </div>

      {status === 'loading' && (
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={48} color={primaryNavy} style={{ animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#162b47', marginBottom: '8px' }}>
            Confirming your subscription...
          </h2>
          <p style={{ color: '#64748b', fontSize: '1rem' }}>
            Please wait while we set up your account.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div style={{
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '64px 48px',
          maxWidth: '520px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
          border: '1px solid #e2e8f0',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 24px auto',
          }}>
            <CheckCircle2 size={32} color="#16a34a" />
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#162b47', marginBottom: '12px' }}>
            Welcome to Dinely!
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '8px' }}>
            Your subscription is now active with a <strong>14-day free trial</strong>.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '40px' }}>
            You won't be charged until your trial ends. Let's get your restaurant set up!
          </p>

          <Link to="/setup" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: primaryNavy, color: '#ffffff', padding: '16px 32px',
            borderRadius: '8px', textDecoration: 'none', fontSize: '1.05rem', fontWeight: 600,
            transition: 'opacity 0.2s',
          }}>
            Set Up Your Restaurant <ArrowRight size={18} />
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div style={{
          textAlign: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '64px 48px',
          maxWidth: '520px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
          border: '1px solid #e2e8f0',
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c', marginBottom: '16px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>
            We couldn't verify your subscription. Please contact support or try again.
          </p>
          <Link to="/signup" style={{
            backgroundColor: primaryNavy, color: '#ffffff', padding: '14px 28px',
            borderRadius: '8px', textDecoration: 'none', fontWeight: 600,
          }}>
            Try Again
          </Link>
        </div>
      )}

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
