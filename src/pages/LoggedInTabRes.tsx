import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import dinelyLogo from '../assets/dinely-logo.png'

export default function LoggedInTabRes() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Mock successful login redirection
    navigate('/welcome')
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
      position: 'relative',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Top Left Logo */}
      <div style={{ position: 'absolute', top: '40px', left: '40px' }}>
        <img src={dinelyLogo} alt="Dinely" style={{ height: '32px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
      </div>

      {/* Login Container */}
      <div style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: '#101A1C',
        borderRadius: '16px',
        padding: '48px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '32px', textAlign: 'left' }}>
          <h2 style={{ 
            fontSize: '1.875rem', 
            fontWeight: 700, 
            color: '#ffffff', 
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em'
          }}>
            Restaurant Login
          </h2>
          <p style={{ 
            fontSize: '1rem', 
            color: '#8b949e', 
            margin: 0,
            lineHeight: 1.5 
          }}>
            Welcome back! Please enter your details.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Email Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#ffffff', 
              margin: '0 0 8px 0' 
            }}>
              Restaurant Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter Restaurant Email"
              required
              style={{
                width: '100%',
                height: '48px',
                backgroundColor: 'transparent',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '0 16px',
                color: '#ffffff',
                fontSize: '1rem',
                boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#C99C63'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#30363d'}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 500, 
              color: '#ffffff', 
              margin: '0 0 8px 0' 
            }}>
              Restaurant Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Restaurant Password"
                required
                style={{
                  width: '100%',
                  height: '48px',
                  backgroundColor: 'transparent',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '0 48px 0 16px',
                  color: '#ffffff',
                  fontSize: '1rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#C99C63'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#30363d'}
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
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Options: Remember & Forgot */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '32px' 
          }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '0.875rem', 
              color: '#ffffff', 
              cursor: 'pointer' 
            }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  accentColor: '#C99C63',
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              Remember for 30 days
            </label>
            <a href="#" style={{ 
              fontSize: '0.875rem', 
              color: '#C99C63', 
              textDecoration: 'none',
              fontWeight: 600
            }}>
              Forgot password
            </a>
          </div>

          {/* Sign In Button */}
          <button type="submit" style={{
            width: '100%',
            height: '48px',
            backgroundColor: '#C99C63',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease-in-out',
            boxShadow: '0 4px 12px rgba(201, 156, 99, 0.2)'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#b58b57'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#C99C63'}
          >
            Sign In
          </button>
        </form>

        {/* Footer */}
        <p style={{ 
          textAlign: 'center', 
          color: '#8b949e', 
          fontSize: '0.875rem', 
          margin: '32px 0 0 0' 
        }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#C99C63', textDecoration: 'none', fontWeight: 600 }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
