import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Building2, User, ArrowLeft } from 'lucide-react'
import { api } from '../services/api'
import { useAuth } from '../context/AuthContext'
import dinelyLogo from '../assets/dinely-logo.png'

type TabType = 'restaurant' | 'user'

export default function GetStarted() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedPlan = searchParams.get('plan') || 'professional'
  const { login } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'restaurant')

  // ── Restaurant Registration State ──
  const [restaurantForm, setRestaurantForm] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    country: 'United Kingdom',
    timezone: 'GMT+0 London',
  })
  const [showRestaurantPassword, setShowRestaurantPassword] = useState(false)
  const [restaurantError, setRestaurantError] = useState('')
  const [restaurantLoading, setRestaurantLoading] = useState(false)

  // ── User Signup State ──
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  })
  const [showUserPassword, setShowUserPassword] = useState(false)
  const [userError, setUserError] = useState('')
  const [userLoading, setUserLoading] = useState(false)

  // ── Restaurant Registration Submit ──
  const handleRestaurantSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRestaurantError('')
    setRestaurantLoading(true)

    try {
      const response = await api.post('/auth/signup', {
        businessName: restaurantForm.businessName,
        ownerName: restaurantForm.ownerName,
        email: restaurantForm.email,
        password: restaurantForm.password,
        phone: restaurantForm.phone || undefined,
        country: restaurantForm.country,
        timezone: restaurantForm.timezone,
      })

      const { token, user, restaurant } = response.data.data
      login(token, { ...user, restaurantId: restaurant?.id })

      // Start Stripe checkout for the selected plan
      if (selectedPlan && restaurant?.id) {
        try {
          const checkoutRes = await api.post('/subscriptions/checkout', {
            organizationId: restaurant.id,
            plan: selectedPlan,
            email: restaurantForm.email,
          })
          if (checkoutRes.data.data?.url) {
            window.location.href = checkoutRes.data.data.url
            return
          }
        } catch (stripeErr: any) {
          console.error('Stripe checkout failed:', stripeErr)
        }
      }
      // Fallback: go to setup
      navigate('/setup')
    } catch (err: any) {
      setRestaurantError(err.response?.data?.error || err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setRestaurantLoading(false)
    }
  }

  // ── User Signup Submit ──
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserError('')
    setUserLoading(true)

    try {
      await api.post('/auth/customer-signup', {
        email: userForm.email,
        password: userForm.password,
        firstName: userForm.firstName,
        lastName: userForm.lastName,
      })
      // Navigate to login
      navigate('/login')
    } catch (err: any) {
      setUserError(err.response?.data?.error || err.response?.data?.message || 'Signup failed. Please try again.')
    } finally {
      setUserLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '46px',
    backgroundColor: 'transparent',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '0 16px',
    color: '#ffffff',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#ffffff',
    margin: '0 0 4px 0',
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 16px',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Top Left Logo + Back */}
      <div style={{ position: 'fixed', top: '28px', left: '28px', display: 'flex', alignItems: 'center', gap: '16px', zIndex: 50 }}>
        <Link to="/saas" style={{ color: '#8b949e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
          <ArrowLeft size={16} />
          Back
        </Link>
        <img src={dinelyLogo} alt="Dinely" style={{ height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
      </div>

      {/* Main Card */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        backgroundColor: '#101A1C',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        animation: 'slideUp 0.5s ease-out',
      }}>
        {/* Tab Bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #1e2a2d',
        }}>
          <button
            onClick={() => setActiveTab('restaurant')}
            style={{
              flex: 1,
              padding: '18px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'restaurant' ? '3px solid #C99C63' : '3px solid transparent',
              color: activeTab === 'restaurant' ? '#ffffff' : '#8b949e',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            <Building2 size={18} />
            Restaurant Registration
          </button>
          <button
            onClick={() => setActiveTab('user')}
            style={{
              flex: 1,
              padding: '18px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'user' ? '3px solid #C99C63' : '3px solid transparent',
              color: activeTab === 'user' ? '#ffffff' : '#8b949e',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            <User size={18} />
            User Signup
          </button>
        </div>

        {/* Form Body */}
        <div style={{ padding: '32px 40px 36px' }}>
          {activeTab === 'restaurant' ? (
            <>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', textAlign: 'center', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                Register Your Restaurant
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#8b949e', textAlign: 'center', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                Start managing reservations with Dinely's powerful platform.
              </p>

              {restaurantError && (
                <div style={{ backgroundColor: '#2d1416', color: '#ff7b72', border: '1px solid #ff7b72', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
                  {restaurantError}
                </div>
              )}

              <form onSubmit={handleRestaurantSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Restaurant Name *</label>
                    <input
                      type="text"
                      required
                      value={restaurantForm.businessName}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, businessName: e.target.value })}
                      placeholder="e.g. The Golden Fork"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Owner Name *</label>
                    <input
                      type="text"
                      required
                      value={restaurantForm.ownerName}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, ownerName: e.target.value })}
                      placeholder="John Smith"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Email *</label>
                    <input
                      type="email"
                      required
                      value={restaurantForm.email}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, email: e.target.value })}
                      placeholder="your@email.com"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Phone</label>
                    <input
                      type="tel"
                      value={restaurantForm.phone}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                      placeholder="+44 7712 345678"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Country</label>
                    <select
                      value={restaurantForm.country}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, country: e.target.value })}
                      style={{ ...inputStyle, backgroundColor: '#101A1C', cursor: 'pointer' }}
                    >
                      <option>United Kingdom</option>
                      <option>United States</option>
                      <option>Canada</option>
                      <option>Australia</option>
                      <option>United Arab Emirates</option>
                      <option>India</option>
                      <option>Pakistan</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Timezone</label>
                    <select
                      value={restaurantForm.timezone}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, timezone: e.target.value })}
                      style={{ ...inputStyle, backgroundColor: '#101A1C', cursor: 'pointer' }}
                    >
                      <option>GMT+0 London</option>
                      <option>GMT-5 New York</option>
                      <option>GMT-8 Los Angeles</option>
                      <option>GMT+4 Dubai</option>
                      <option>GMT+5 Karachi</option>
                      <option>GMT+5:30 Mumbai</option>
                      <option>GMT+10 Sydney</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRestaurantPassword ? 'text' : 'password'}
                      required
                      value={restaurantForm.password}
                      onChange={(e) => setRestaurantForm({ ...restaurantForm, password: e.target.value })}
                      placeholder="Create a strong password"
                      style={{ ...inputStyle, paddingRight: '48px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRestaurantPassword(!showRestaurantPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                      {showRestaurantPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={restaurantLoading} style={{
                  width: '100%',
                  height: '48px',
                  backgroundColor: restaurantLoading ? '#b58b57' : '#C99C63',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: restaurantLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.2s',
                  marginTop: '4px',
                }}>
                  {restaurantLoading ? 'Creating Account...' : 'Register & Choose Plan'}
                </button>
              </form>

              <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.8125rem', margin: '16px 0 0 0' }}>
                Already have a restaurant account?{' '}
                <Link to="/login" style={{ color: '#C99C63', textDecoration: 'none', fontWeight: 600 }}>
                  Log in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', textAlign: 'center', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                Create Your Account
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#8b949e', textAlign: 'center', margin: '0 0 24px 0', lineHeight: 1.5 }}>
                Sign up to book tables and manage your dining reservations.
              </p>

              {userError && (
                <div style={{ backgroundColor: '#2d1416', color: '#ff7b72', border: '1px solid #ff7b72', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
                  {userError}
                </div>
              )}

              <form onSubmit={handleUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', gap: '14px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>First Name *</label>
                    <input
                      type="text"
                      required
                      value={userForm.firstName}
                      onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                      placeholder="John"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Last Name *</label>
                    <input
                      type="text"
                      required
                      value={userForm.lastName}
                      onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                      placeholder="Doe"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Email *</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="your@email.com"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      required
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Create a strong password"
                      style={{ ...inputStyle, paddingRight: '48px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                      {showUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={userLoading} style={{
                  width: '100%',
                  height: '48px',
                  backgroundColor: userLoading ? '#b58b57' : '#C99C63',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  cursor: userLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background-color 0.2s',
                  marginTop: '4px',
                }}>
                  {userLoading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </form>

              <p style={{ textAlign: 'center', color: '#8b949e', fontSize: '0.8125rem', margin: '16px 0 0 0' }}>
                Already have an account?{' '}
                <Link to="/login" style={{ color: '#C99C63', textDecoration: 'none', fontWeight: 600 }}>
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
