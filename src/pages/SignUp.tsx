import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import dinelyLogo from '../assets/dinely-logo.png'

export default function SignUp() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan') // 'starter' | 'professional' | null
  const { login } = useAuth()
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    country: 'United Kingdom',
    timezone: 'GMT+0 London',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/signup', {
        businessName: form.businessName,
        ownerName: form.ownerName,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        country: form.country,
        timezone: form.timezone,
      });

      const { token, user, restaurant } = response.data.data;
      
      // Store in context, including the restaurant ID for the setup wizard
      login(token, {
        ...user,
        restaurantId: restaurant?.id,
      });

      // If a paid plan was selected from the landing page, redirect to Stripe Checkout
      if (selectedPlan && (selectedPlan === 'starter' || selectedPlan === 'professional') && restaurant?.id) {
        try {
          const checkoutRes = await api.post('/subscriptions/checkout', {
            organizationId: restaurant.id,
            plan: selectedPlan,
            email: form.email,
          });

          if (checkoutRes.data?.data?.url) {
            window.location.href = checkoutRes.data.data.url;
            return;
          }
        } catch (checkoutErr: any) {
          console.error('Checkout session error:', checkoutErr);
          // Fall through to setup if checkout fails — org is still created
        }
      }

      // Default: redirect to setup wizard for free tier / fallback
      navigate('/setup')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign up. Please try again.')
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
          <img src={dinelyLogo} alt="Dinely" style={{ height: '32px', objectFit: 'contain' }} />
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
          Setup Your Restaurant
        </h1>
        <p style={{
          color: '#111827',
          textAlign: 'center',
          fontSize: '0.875rem',
          marginBottom: '32px'
        }}>
          Set up table flow for your business
        </p>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Business Name
            </label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Enter"
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#111827',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Owner Name
            </label>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => handleChange('ownerName', e.target.value)}
              placeholder="Enter"
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#111827',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter"
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#111827',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Restaurant Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+44 20 1234 5678"
              style={{
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#111827',
                fontSize: '0.9375rem',
                outline: 'none',
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
                placeholder="Enter Password"
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
          </div>

          <div className="res-grid-1-to-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                Country
              </label>
              <select
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#6b7280',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="" disabled hidden>Select</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                Timezone
              </label>
              <select
                value={form.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  color: '#6b7280',
                  fontSize: '0.9375rem',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <option value="" disabled hidden>Select</option>
                <option value="GMT+0 London">GMT+0 London</option>
                <option value="GMT-5 New York">GMT-5 New York</option>
                <option value="GMT-8 Los Angeles">GMT-8 Los Angeles</option>
              </select>
            </div>
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
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          color: '#111827',
          fontSize: '0.875rem',
          marginTop: '20px',
          marginBottom: 0
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{
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
