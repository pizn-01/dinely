import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import dinelyLogo from '../../assets/dinely-logo.png'
import { useTheme } from '../../context/ThemeContext'

export default function SuperAdminLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { isDark } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Component mounted
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await api.post('/auth/super-admin-login', { email, password })
      const { token, refreshToken: rToken, user } = data.data
      
      if (rToken) localStorage.setItem('refreshToken', rToken)
      
      login(token, user)
      
      navigate('/admin/super')
    } catch (err: any) {
      console.error('Super Admin login failed:', err)
      setError(err.response?.data?.error || 'Failed to login. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  const cardBg = isDark ? '#101A1C' : '#ffffff'
  const textPrimary = isDark ? '#ffffff' : '#111827'
  const textSecondary = isDark ? '#94a3b8' : '#6b7280'
  const borderColor = isDark ? '#1e293b' : '#e5e7eb'

  return (
    <div className="res-auth-container" style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1517' : '#F6F7F9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
      position: 'relative',
      fontFamily: 'Inter, system-ui, sans-serif',
      transition: 'background-color 0.3s ease'
    }}>
      {/* Top Left Logo */}
      <div className="res-auth-logo" style={{ position: 'absolute', top: '40px', left: '40px' }}>
        <img src={dinelyLogo} alt="Dinely" style={{ height: '32px', objectFit: 'contain', filter: isDark ? 'brightness(0) invert(1)' : 'none' }} />
      </div>

      {/* Login Box */}
      <div className="res-auth-box" style={{
        width: '100%',
        maxWidth: '480px',
        backgroundColor: cardBg,
        borderRadius: '16px',
        padding: '32px 40px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        border: `1px solid ${isDark ? '#1e293b' : 'transparent'}`,
        boxShadow: isDark ? '0 4px 40px rgba(0,0,0,0.4)' : '0 4px 40px -10px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
           <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: isDark ? 'rgba(201, 156, 99, 0.15)' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={24} style={{ color: '#C99C63' }} />
           </div>
        </div>
        
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: textPrimary, textAlign: 'center', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Super Admin
        </h1>
        <p style={{ fontSize: '0.875rem', color: textSecondary, textAlign: 'center', margin: '0 0 24px 0', lineHeight: 1.4 }}>
          Restricted access. Authorized personnel only.
        </p>

        {error && (
          <div style={{
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fee2e2',
            color: isDark ? '#f87171' : '#b91c1c',
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.2)' : 'transparent'}`,
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
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: textPrimary, margin: '0 0 6px 0' }}>
              Admin Email
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
                backgroundColor: isDark ? '#0B1517' : '#ffffff',
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '0 16px',
                color: textPrimary,
                fontSize: '0.875rem',
                boxSizing: 'border-box',
                outline: 'none',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => e.target.style.borderColor = '#C99C63'}
              onBlur={(e) => e.target.style.borderColor = borderColor}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: textPrimary, margin: '0 0 6px 0' }}>
              Master Password
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
                  backgroundColor: isDark ? '#0B1517' : '#ffffff',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  padding: '0 48px 0 16px',
                  color: textPrimary,
                  fontSize: '0.875rem',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => e.target.style.borderColor = '#C99C63'}
                onBlur={(e) => e.target.style.borderColor = borderColor}
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
                  color: textSecondary,
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
            {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
