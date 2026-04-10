import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { api } from '../services/api'
import dinelyLogo from '../assets/dinely-logo.png'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const defaultSlug = searchParams.get('restaurant') || ''
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    if (!defaultSlug || defaultSlug === 'demo-restaurant') return
    const fetchRestaurant = async () => {
      try {
        const { data } = await api.get(`/public/${defaultSlug}/info`)
        if (data.data?.logoUrl) {
          setLogoUrl(data.data.logoUrl)
        }
      } catch (err) {
        console.error('Failed to fetch restaurant info:', err)
      }
    }
    fetchRestaurant()
  }, [defaultSlug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSuccess(false)

    try {
      await api.post('/auth/forgot-password', { 
        email,
        slug: defaultSlug || undefined,
        origin: window.location.origin
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="res-auth-container" style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
      position: 'relative',
      fontFamily: 'var(--font-sans)',
      overflowY: 'auto'
    }}>
      {/* Top Left Logo */}
      <div className="res-auth-logo" style={{ position: 'absolute', top: '40px', left: '40px' }}>
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
        ) : (
          <img src={dinelyLogo} alt="Dinely" style={{ height: '32px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        )}
      </div>

      {/* Forgot Password Box */}
      <div className="res-auth-box" style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: '#101A1C',
        borderRadius: '16px',
        padding: '32px 48px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        animation: 'slideUp 0.5s ease-out'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#ffffff', textAlign: 'center', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Reset Password
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#8b949e', textAlign: 'center', margin: '0 0 20px 0', lineHeight: 1.4 }}>
          Enter the email address associated with your account and we'll send you a link to reset your password.
        </p>

        {error && (
          <div style={{ backgroundColor: '#2d1416', color: '#ff7b72', border: '1px solid #ff7b72', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ backgroundColor: 'rgba(74, 158, 107, 0.1)', color: '#6B9E78', border: '1px solid rgba(74, 158, 107, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            If an account with that email exists, we've sent instructions to reset your password.
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Email"
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: 'transparent',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '0 16px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%',
              height: '46px',
              backgroundColor: loading ? '#b58b57' : '#C99C63',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#b58b57')}
            onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#C99C63')}
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.875rem', margin: '24px 0 0 0' }}>
          Remember your password?{' '}
          <Link to={defaultSlug && defaultSlug !== 'demo-restaurant' ? `/login?restaurant=${defaultSlug}` : '/login'} style={{ color: '#6B9E78', textDecoration: 'none', fontWeight: 500 }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
