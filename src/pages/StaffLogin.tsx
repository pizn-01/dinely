import { useState, useEffect } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function StaffLogin() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug?: string }>()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [restaurantName, setRestaurantName] = useState('')

  // Fetch restaurant name from slug for display
  useEffect(() => {
    if (!slug) return
    const fetchRestaurant = async () => {
      try {
        const { data } = await api.get(`/public/restaurants/${slug}`)
        if (data.data?.name) {
          setRestaurantName(data.data.name)
        }
      } catch {
        // Slug might not resolve — that's okay, show generic login
      }
    }
    fetchRestaurant()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/auth/staff-login', { email, password })
      const { token, user, restaurant } = data.data
      
      login(token, {
        ...user,
        restaurantId: restaurant?.id
      })
      
      navigate('/staff/tables')
    } catch (err: any) {
      console.error('Staff login failed:', err)
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="res-auth-container" style={{
      minHeight: '100vh',
      backgroundColor: '#F6F7F9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
      position: 'relative',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Top Left Logo */}
      <div className="res-auth-logo" style={{ position: 'absolute', top: '40px', left: '40px' }}>
        <h1 style={{ color: '#111827', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Logo</h1>
      </div>

      {/* Login Box */}
      <div className="res-auth-box" style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '32px 40px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        border: 'none',
        boxShadow: '0 4px 40px -10px rgba(0, 0, 0, 0.05)'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', textAlign: 'center', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Welcome Back!
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', margin: '0 0 24px 0', lineHeight: 1.4 }}>
          {restaurantName 
            ? `Log in to manage ${restaurantName}.`
            : 'Log in to access your account and manage everything in one place.'
          }
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '0.875rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Email Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Email"
              required
              style={{
                width: '100%',
                height: '46px',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0 16px',
                color: '#111827',
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = '#C99C63'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                required
                style={{
                  width: '100%',
                  height: '46px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '0 48px 0 16px',
                  color: '#111827',
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#C99C63'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
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
                  color: '#9ca3af',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <Link to="/staff-forgot-password" style={{ fontSize: '0.875rem', color: '#4A9E6B', textDecoration: 'none', fontWeight: 500 }}>
              Forgot Password?
            </Link>
          </div>

          {/* Sign In Button */}
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
