import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../services/api'
import dinelyLogo from '../assets/dinely-logo.png'

export default function ResetPassword() {
  const { slug } = useParams<{ slug?: string }>()
  const navigate = useNavigate()
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)
  
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    // Extract access_token from URL hash: #access_token=...&type=recovery
    const hash = window.location.hash
    const search = window.location.search
    
    // Check hash first (for traditional implicit flow #access_token=...)
    if (hash) {
      const params = new URLSearchParams(hash.replace('#', '?'))
      const token = params.get('access_token') || params.get('token')
      if (token) setAccessToken(token)
    } 
    // Fallback to query params (for server-side direct link generation ?token=...)
    else if (search) {
      const params = new URLSearchParams(search)
      const token = params.get('token') || params.get('access_token')
      if (token) setAccessToken(token)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.')
    }
    
    if (!accessToken) {
      return setError('Invalid or missing reset token. Please request a new link.')
    }

    setLoading(true)

    try {
      await api.post('/auth/reset-password', { accessToken, newPassword })
      setSuccess(true)
      
      // Redirect after a short delay
      setTimeout(() => {
        if (slug) {
          navigate(`/staff-login/${slug}`)
        } else {
          navigate('/login')
        }
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password.')
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
      <div className="res-auth-logo" style={{ position: 'absolute', top: '40px', left: '40px' }}>
        <img src={dinelyLogo} alt="Dinely" style={{ height: '32px', objectFit: 'contain' }} />
      </div>

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
        boxShadow: '0 4px 40px -10px rgba(0, 0, 0, 0.05)'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', textAlign: 'center', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>
          Create New Password
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', margin: '0 0 24px 0', lineHeight: 1.4 }}>
          Enter your new password below to reset your account access.
        </p>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        {success ? (
          <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '16px', borderRadius: '8px', fontSize: '0.875rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Password Reset Successfully!</p>
            <p style={{ margin: 0 }}>You will be redirected shortly...</p>
          </div>
        ) : !accessToken ? (
          <div style={{ backgroundColor: '#fefce8', color: '#854d0e', border: '1px solid #fef08a', padding: '16px', borderRadius: '8px', fontSize: '0.875rem', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>We couldn't find your reset token.</p>
            <p style={{ margin: 0 }}>Please make sure you clicked the exact link from your email.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
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
                  onClick={() => setShowNewPassword(!showNewPassword)}
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
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
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
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
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
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
