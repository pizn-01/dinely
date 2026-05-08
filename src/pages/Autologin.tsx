import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../services/api'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Autologin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const slug = searchParams.get('slug')
    const email = searchParams.get('email')
    const hash = searchParams.get('hash')

    if (!slug || !email || !hash) {
      setError('Missing autologin parameters')
      return
    }

    const performAutologin = async () => {
      try {
        const { data } = await api.get('/auth/autologin', {
          params: { slug, email, hash }
        })

        if (data.success && data.data) {
          const { token, refreshToken, user, restaurant } = data.data
          
          // Use AuthContext to hydrate the session state
          login(token, user)
          
          // Store additional items
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
          localStorage.setItem('restaurant', JSON.stringify(restaurant))

          // Redirect to slug-based dashboard
          navigate(`/staff/${slug}/tables`)
        } else {
          setError('Autologin failed')
        }
      } catch (err: any) {
        console.error('Autologin error:', err)
        setError(err.response?.data?.error || 'Failed to authenticate autologin link')
      }
    }

    performAutologin()
  }, [location, navigate])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '24px' }}>
        {!error ? (
          <>
            <Loader2 size={48} className="animate-spin" style={{ color: '#C99C63', margin: '0 auto 24px auto' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '12px' }}>Authenticating POS Session</h1>
            <p style={{ color: '#8b949e' }}>Please wait while we verify your credentials and secure your session...</p>
          </>
        ) : (
          <>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto'
            }}>
              <AlertCircle size={32} color="#ef4444" />
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '12px' }}>Authentication Failed</h1>
            <p style={{ color: '#8b949e', marginBottom: '24px' }}>{error}</p>
            <button
              onClick={() => navigate('/staff-login')}
              style={{
                padding: '10px 24px',
                backgroundColor: '#C99C63',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Back to Manual Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
