import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'

export default function SignUp() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    password: '',
    country: 'United Kingdom',
    timezone: 'GMT+0 London',
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    navigate('/setup')
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      fontFamily: 'var(--font-sans)',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      {/* Top Left Logo */}
      <div style={{
        position: 'absolute',
        top: '32px',
        left: '48px'
      }}>
        <Link to="/" style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#ffffff',
          textDecoration: 'none',
          letterSpacing: '-0.02em',
        }}>
          Logo
        </Link>
      </div>

      {/* Main Card */}
      <div style={{
        backgroundColor: '#101A1C',
        borderRadius: '16px',
        padding: '24px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      }}>
        <h1 style={{
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: '4px'
        }}>
          Setup Your Restaurant
        </h1>
        <p style={{
          color: '#8b949e',
          textAlign: 'center',
          fontSize: '0.75rem',
          marginBottom: '24px'
        }}>
          Set up table flow for your business
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>
              Business Name
            </label>
            <input
              type="text"
              value={form.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              placeholder="Enter"
              style={{
                width: '100%',
                backgroundColor: '#161B22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>
              Owner Name
            </label>
            <input
              type="text"
              value={form.ownerName}
              onChange={(e) => handleChange('ownerName', e.target.value)}
              placeholder="Enter"
              style={{
                width: '100%',
                backgroundColor: '#161B22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="Enter"
              style={{
                width: '100%',
                backgroundColor: '#161B22',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>
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
                  backgroundColor: '#161B22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  paddingRight: '40px',
                  color: '#ffffff',
                  fontSize: '0.8125rem',
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
                  color: '#8b949e',
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>
                Country
              </label>
              <select
                value={form.country}
                onChange={(e) => handleChange('country', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#161B22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#8b949e',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
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
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#ffffff', marginBottom: '4px' }}>
                Timezone
              </label>
              <select
                value={form.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#161B22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#8b949e',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 8px center',
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

          <button type="submit" style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#C99C63',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            marginTop: '4px',
          }}
          >
            Sign In
          </button>
        </form>

        <p style={{
          textAlign: 'center',
          color: '#e5e7eb',
          fontSize: '0.75rem',
          marginTop: '16px',
          marginBottom: 0
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{
            color: '#5EEA7A',
            textDecoration: 'none',
            fontWeight: 500,
          }}
          >
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
