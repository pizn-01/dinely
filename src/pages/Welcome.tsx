import { useState, useEffect } from 'react'
import { Calendar, Table, Settings, LogOut, CheckCircle2, Users, MapPin, Clock, Star } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'
import PoweredByFooter from '../components/PoweredByFooter'
import dinelyLogo from '../assets/dinely-logo.png'

export default function Welcome() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
  const [upcomingList, setUpcomingList] = useState<any[]>([])
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [orgData, setOrgData] = useState<any>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [customerProfile, setCustomerProfile] = useState<any>(null)

  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const slug = searchParams.get('restaurant') || 'demo-restaurant'

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true)
        const [upcomingRes, historyRes, orgRes, profileRes] = await Promise.all([
          api.get('/customers/me/reservations/upcoming'),
          api.get('/customers/me/reservations/history'),
          api.get(`/public/${slug}/info`),
          api.get('/customers/me').catch(() => null)
        ])

        let upcoming = upcomingRes.data.data || []
        let history = historyRes.data.reservations || historyRes.data.data || []

        setUpcomingList(upcoming)
        setHistoryList(history)
        setOrgData(orgRes.data.data)
        if (profileRes?.data?.data) {
          setCustomerProfile(profileRes.data.data)
        }
      } catch (err) {
        console.error('Failed to load reservations:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReservations()
  }, [slug])

  const handleUpgradeVip = async () => {
    if (!orgData?.id) return
    try {
      setCheckoutLoading(true)
      const returnUrl = `${window.location.origin}/welcome?restaurant=${slug}`
      const { data } = await api.post('/customers/me/upgrade-vip', {
        organizationId: orgData.id,
        returnUrl
      })
      if (data.data?.url) {
        window.location.href = data.data.url
      }
    } catch (err: any) {
      console.error('Failed to create VIP checkout session', err)
      toast.error(err.response?.data?.error || 'Failed to initiate payment')
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="res-welcome-container" style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      padding: '40px'
    }}>
      {/* Header */}
      <div className="res-welcome-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {orgData?.logoUrl ? (
            <img src={orgData.logoUrl} alt="Logo" style={{ height: '40px', objectFit: 'contain' }} />
          ) : (
            <img src={dinelyLogo} alt="Dinely" style={{ height: '32px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Settings size={20} style={{ cursor: 'pointer', color: '#8b949e' }} />
          <LogOut size={20} style={{ cursor: 'pointer', color: '#8b949e' }} onClick={() => {
            logout()
            navigate(`/${slug}`)
          }} />
        </div>
      </div>

      {/* Greeting */}
      <div className="res-welcome-greeting" style={{ marginBottom: '40px' }}>
        <h2 className="res-welcome-title" style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>Welcome back, {customerProfile?.firstName || user?.name?.split(' ')[0] || 'Guest'}!</h2>
        <p style={{ fontSize: '1.125rem', color: '#8b949e', margin: 0 }}>Manage your reservations and book your next visit</p>
      </div>

      {/* Stats Cards */}
      <div className="res-welcome-stats-wrap" style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        <div className="res-welcome-stat-card" style={{
          width: '300px',
          backgroundColor: '#101A1C',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '8px' }}>Upcoming</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{upcomingList.length}</div>
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#8b949e'
          }}>
            <Calendar size={24} />
          </div>
        </div>
        <div className="res-welcome-stat-card" style={{
          width: '300px',
          backgroundColor: '#101A1C',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '8px' }}>Past Visits</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{historyList.length}</div>
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <img src="/Group 1597888803.svg" alt="Past Visits" width={24} height={16} style={{ opacity: 0.7 }} />
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="res-welcome-cta" style={{
        backgroundColor: '#162325',
        borderRadius: '16px',
        padding: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px',
        border: '1px solid #30363d'
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0' }}>Ready For Your Next Visit?</h3>
          <p style={{ color: '#8b949e', margin: 0 }}>Your preferences are saved - booking takes seconds.</p>
        </div>
        <button
          className="res-welcome-cta-btn"
          onClick={() => navigate((customerProfile?.isVip || user?.isVip) ? `/premium-reserve/${slug}` : `/user-reserve?restaurant=${slug}`)}
          style={{
            backgroundColor: '#C99C63',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
          Book A Table
        </button>
      </div>

      {/* Premium Promotional Banner */}
      {!(customerProfile?.isVip || user?.isVip) && (
        <div style={{
          backgroundColor: 'rgba(201, 156, 99, 0.05)',
          border: '1px solid rgba(201, 156, 99, 0.3)',
          borderRadius: '16px',
          padding: '24px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle glow / gradient */}
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '300px', background: 'linear-gradient(90deg, transparent, rgba(201, 156, 99, 0.15))', zIndex: 0 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Star size={20} color="#C99C63" fill="#C99C63" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#C99C63' }}>Unlock the Premium Experience at {orgData?.name || 'our restaurant'}</h3>
            </div>
            <p style={{ color: '#d1d5db', margin: 0, maxWidth: '600px', lineHeight: 1.5, fontSize: '0.95rem' }}>
              Elevate your dining with priority bookings, complimentary welcome drinks, customized chef menus, and exclusive access to the best premium tables in the house.
            </p>
          </div>
          <button style={{
            backgroundColor: 'transparent',
            color: '#C99C63',
            border: '1px solid #C99C63',
            borderRadius: '8px',
            padding: '12px 28px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: checkoutLoading ? 'wait' : 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            opacity: checkoutLoading ? 0.7 : 1
          }}
            onClick={handleUpgradeVip}
            disabled={checkoutLoading}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#C99C63'; e.currentTarget.style.color = '#101A1C' }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#C99C63' }}
          >
            {checkoutLoading ? 'Redirecting...' : 'Upgrade to Premium'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="res-welcome-tabs" style={{ display: 'flex', gap: '32px', borderBottom: '1px solid #30363d', marginBottom: '24px' }}>
        <div
          onClick={() => setActiveTab('upcoming')}
          style={{
            padding: '0 0 16px 0',
            borderBottom: activeTab === 'upcoming' ? '2px solid #C99C63' : 'none',
            color: activeTab === 'upcoming' ? '#ffffff' : '#8b949e',
            fontWeight: activeTab === 'upcoming' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          Upcoming Reservation
        </div>
        <div
          onClick={() => setActiveTab('history')}
          style={{
            padding: '0 0 16px 0',
            borderBottom: activeTab === 'history' ? '2px solid #C99C63' : 'none',
            color: activeTab === 'history' ? '#ffffff' : '#8b949e',
            fontWeight: activeTab === 'history' ? 600 : 400,
            cursor: 'pointer'
          }}
        >
          Visit History
        </div>
      </div>

      {/* Reservation Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading && <p style={{ color: '#8b949e' }}>Loading reservations...</p>}
        {!loading && activeTab === 'upcoming' && upcomingList.map(res => (
          <div key={res.id} className="res-welcome-res-card" style={{
            backgroundColor: '#101A1C',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #30363d'
          }}>
            <div className="res-welcome-res-details" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <img src="/Group 1597888803.svg" alt="Table" width={24} height={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{res.table?.name || 'Table Pending'}</h4>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: '#4a9e6b',
                    backgroundColor: 'rgba(74, 158, 107, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'capitalize'
                  }}>
                    <CheckCircle2 size={12} />
                    {res.status || 'pending'}
                  </div>
                </div>
                <div className="res-welcome-res-meta" style={{ fontSize: '0.875rem', color: '#8b949e', display: 'flex', gap: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Capacity: {res.partySize} seats</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {res.restaurant?.name || 'Restaurant'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {res.reservationDate ? new Date(res.reservationDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {res.startTime || ''}</span>
                </div>
              </div>
            </div>
            <button style={{
              backgroundColor: 'transparent',
              color: '#ffffff',
              border: '1px solid #30363d',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}>
              Cancel
            </button>
          </div>
        ))}
        {!loading && activeTab === 'upcoming' && upcomingList.length === 0 && (
          <p style={{ color: '#8b949e', padding: '16px', backgroundColor: '#101A1C', borderRadius: '12px', border: '1px solid #30363d' }}>
            No upcoming reservations.
          </p>
        )}

        {!loading && activeTab === 'history' && historyList.map(res => (
          <div key={res.id} className="res-welcome-res-card" style={{
            backgroundColor: '#101A1C',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            border: '1px solid #30363d'
          }}>
            <div className="res-welcome-res-details" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <img src="/Group 1597888803.svg" alt="Table" width={24} height={16} style={{ opacity: 0.6 }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{res.table?.name || 'Table Pending'}</h4>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: '#4a9e6b',
                    backgroundColor: 'rgba(74, 158, 107, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'capitalize'
                  }}>
                    {res.status}
                  </div>
                </div>
                <div className="res-welcome-res-meta" style={{ fontSize: '0.875rem', color: '#8b949e', display: 'flex', gap: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Capacity: {res.partySize} seats</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {res.restaurant?.name || 'Restaurant'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {res.reservationDate ? new Date(res.reservationDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {res.startTime || ''}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
        {!loading && activeTab === 'history' && historyList.length === 0 && (
          <p style={{ color: '#8b949e', padding: '16px', backgroundColor: '#101A1C', borderRadius: '12px', border: '1px solid #30363d' }}>
            No past visits found.
          </p>
        )}
      </div>
      <PoweredByFooter theme="dark" />
    </div>
  )
}
