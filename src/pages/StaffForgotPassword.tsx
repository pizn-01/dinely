import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'

export default function StaffForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    setSuccess(false)

    try {
      await api.post('/auth/forgot-password', { email })
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

      {/* Forgot Password Box */}
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
          Reset Staff Password
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', margin: '0 0 24px 0', lineHeight: 1.4 }}>
          Enter your staff email address and we'll send you a link to reset your password.
        </p>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            Instructions to reset your password have been sent to your email.
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Staff Email"
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

            <button type="submit" disabled={loading} style={{
              width: '100%',
              height: '46px',
              backgroundColor: '#C99C63',
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

        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.875rem', margin: '24px 0 0 0' }}>
          Remember your password?{' '}
          <Link to="/staff-login" style={{ color: '#4A9E6B', textDecoration: 'none', fontWeight: 500 }}>
            Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
