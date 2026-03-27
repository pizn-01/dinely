import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const handleSuccess = (response: any) => {
      const { token, refreshToken: rToken, user, restaurant } = response.data.data
      
      // Store refresh token for auto-renewal
      if (rToken) localStorage.setItem('refreshToken', rToken)
      
      // Store in auth context. Add restaurantId for staff/admins
      login(token, {
        ...user,
        restaurantId: restaurant?.id
      })
      
      if (user.role === 'admin' || user.role === 'super_admin') {
        if (restaurant && restaurant.setupCompleted === false) {
          navigate('/setup')
        } else {
          navigate('/admin')
        }
      } else if (user.role === 'manager' || user.role === 'host') {
        navigate('/staff/tables')
      } else {
        // Customer role: check VIP status
        if (user.isVip) {
          navigate('/dashboard') // Or /premium-reserve depending on desired flow
        } else {
          navigate('/dashboard')
        }
      }
    }

    try {
      // 1. Try Staff Login First
      const response = await api.post('/auth/login', { email, password })
      handleSuccess(response)
    } catch (err: any) {
      if (
        err.response?.status === 401 && 
        err.response?.data?.error === 'No active staff account found for this email'
      ) {
        // 2. Fallback to Customer Login if it's not a staff email
        try {
          const customerResponse = await api.post('/auth/customer-login', { email, password })
          handleSuccess(customerResponse)
        } catch (customerErr: any) {
          setError(customerErr.response?.data?.error || 'Invalid email or password')
        }
      } else {
        setError(err.response?.data?.error || 'Invalid email or password')
      }
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
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Top Left Logo */}
      <div className="res-auth-logo" style={{ position: 'absolute', top: '40px', left: '40px' }}>
        <h1 style={{ color: '#ffffff', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Logo</h1>
      </div>

      {/* Login Box */}
      <div className="res-auth-box" style={{
        width: '100%',
        maxWidth: '520px', // slightly wider
        backgroundColor: '#101A1C',
        borderRadius: '16px',
        padding: '32px 48px', // even tighter top/bottom padding
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center', // keep the vertical centering
        animation: 'slideUp 0.5s ease-out'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#ffffff', textAlign: 'center', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
          Welcome Back!
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#8b949e', textAlign: 'center', margin: '0 0 20px 0', lineHeight: 1.4 }}>
          Log in to access your account and manage everything in one place.
        </p>

        {error && (
          <div style={{ backgroundColor: '#2d1416', color: '#ff7b72', border: '1px solid #ff7b72', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Email Field */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Email"
              style={{
                width: '100%',
                height: '46px', // scaled down properly
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
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', margin: '0 0 4px 0' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
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

          {/* Forgot Password */}
          <div style={{ textAlign: 'right', marginBottom: '16px' }}>
            <Link to="/forgot-password" style={{ color: '#6B9E78', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 500 }}>
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
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.875rem', margin: '24px 0 0 0' }}>
          Don't have an account?{' '}
          <Link to="/customer-signup" style={{ color: '#6B9E78', textDecoration: 'none', fontWeight: 500 }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
