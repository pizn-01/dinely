import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/welcome')
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
            <a href="#" style={{ fontSize: '0.8125rem', color: '#6B9E78', textDecoration: 'none' }}>
              Forgot Password?
            </a>
          </div>

          {/* Sign In Button */}
          <button type="submit" style={{
            width: '100%',
            height: '46px',
            backgroundColor: '#C99C63',
            color: '#ffffff', // changed to white as requested
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b58b57'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#C99C63'}
          >
            Sign In
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.875rem', margin: '16px 0 0 0' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#6B9E78', textDecoration: 'none', fontWeight: 500 }}>
            Sign Up
          </Link>
        </p>
      </div>

      {/* Bottom Left Copyright */}
      <div className="res-auth-copy" style={{ position: 'absolute', bottom: '24px', left: '40px' }}>
        <p style={{ color: '#2d333b', fontSize: '0.875rem', margin: 0 }}>
          Copyright @lemonvolt 2025 | Privacy Policy
        </p>
      </div>
    </div>
  )
}
