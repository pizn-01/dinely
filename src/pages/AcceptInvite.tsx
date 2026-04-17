import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function AcceptInvite() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [form, setForm] = useState({
    name: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token. Please check your email link.')
    }
  }, [token])

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!token) {
      setError('Invalid invitation link.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/accept-invite', {
        token,
        name: form.name,
        password: form.password,
      });

      // The backend returns user, token, refreshToken, restaurant info
      setSuccess(true)
      
      const { token: jwtToken, user, restaurant } = response.data.data;
      
      // Auto-login the user
      login(jwtToken, {
        ...user,
        restaurantId: restaurant?.id,
      });

      // Redirect them to the dashboard
      setTimeout(() => {
        navigate('/staff/tables') // or staff-dashboard
      }, 1500)
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.details?.[0]?.message 
        || err.response?.data?.error 
        || 'Failed to accept invitation. The link may have expired or already been used.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="res-auth-container" style={{
      minHeight: '100vh',
      backgroundColor: '#EFF3F8',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      {/* Top Left Logo */}
      <div className="res-auth-logo" style={{
        position: 'absolute',
        top: '32px',
        left: '48px'
      }}>
        <Link to="/" style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#111827',
          textDecoration: 'none',
          letterSpacing: '-0.02em',
        }}>
          Logo
        </Link>
      </div>

      {/* Main Card */}
      <div className="res-auth-box" style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#111827',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          Create Staff Account
        </h1>
        <p style={{
          color: '#111827',
          textAlign: 'center',
          fontSize: '0.875rem',
          marginBottom: '32px'
        }}>
          Accept your invitation to join the team
        </p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
            Account created successfully! Redirecting you into the dashboard...
          </div>
        )}

        {token && !success && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter your name"
                required
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#111827',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Create a password"
                  required
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    paddingRight: '40px',
                    color: '#111827',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    boxSizing: 'border-box'
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
                    color: '#9ca3af',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ marginTop: '6px', fontSize: '0.75rem', color: '#6b7280' }}>
                Password must be at least 8 characters.
              </p>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%',
              padding: '14px',
              backgroundColor: loading ? '#9ca3af' : '#C99C63',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '8px',
            }}
            >
              {loading ? 'Creating Account...' : 'Join Team'}
            </button>
          </form>
        )}

        <p style={{
          textAlign: 'center',
          color: '#111827',
          fontSize: '0.875rem',
          marginTop: '20px',
          marginBottom: 0
        }}>
          Already accepted?{' '}
          <Link to="/staff-login" style={{
            color: '#5E8B6A',
            textDecoration: 'none',
            fontWeight: 600,
          }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
