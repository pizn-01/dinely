import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../services/api'
import dinelyLogo from '../assets/dinely-logo.png'

export default function CustomerSignUp() {
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  
  const searchParams = new URLSearchParams(location.search)
  const defaultSlug = searchParams.get('restaurant') || 'demo-restaurant'
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

    try {
      // Typically /auth/customer-signup or similar depending on the exact backend route
      await api.post('/auth/customer-signup', {
        email,
        password,
        firstName,
        lastName,
        role: 'customer' // ensure role matches your DB schema constraints
      })
      
      // Successfully registered, send them to login with the preserved slug
      navigate(`/login?restaurant=${defaultSlug}`)
    } catch (err: any) {
      const errorMessage = err.response?.data?.details?.[0]?.message 
        || err.response?.data?.error 
        || err.response?.data?.message 
        || 'Failed to create account'
      setError(errorMessage)
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

      {/* SignUp Box */}
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
        animation: 'slideUp 0.5s ease-out',
        margin: '60px 0' // extra margin for small screens
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#ffffff', textAlign: 'center', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Create an Account
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#8b949e', textAlign: 'center', margin: '0 0 20px 0', lineHeight: 1.4 }}>
          Join us for a seamless booking and dining experience.
        </p>

        {error && (
          <div style={{ backgroundColor: '#2d1416', color: '#ff7b72', border: '1px solid #ff7b72', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
            {/* First Name */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
                First Name
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
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

            {/* Last Name */}
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
                Last Name
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
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
          </div>

          {/* Email Field */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
              Email
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

          {/* Password Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create Password"
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: 'transparent',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '0 48px 0 16px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#8b949e',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Sign Up Button */}
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.875rem', margin: '16px 0 0 0' }}>
          Already have an account?{' '}
          <Link to={`/login?restaurant=${defaultSlug}`} style={{ color: '#6B9E78', textDecoration: 'none', fontWeight: 500 }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
