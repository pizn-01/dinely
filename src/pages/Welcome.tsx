import { useState, useEffect } from 'react'
import { Calendar, Table, Settings, LogOut, CheckCircle2, Users, MapPin, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

export default function Welcome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
  const [upcomingList, setUpcomingList] = useState<any[]>([])
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchReservations = async () => {
      if (!user?.id) return
      try {
        setLoading(true)
        const { data } = await api.get(`/reservations?customerId=${user.id}`)
        if (data.data) {
          const now = new Date()
          const upcoming = data.data.filter((r: any) => new Date(r.startTime) >= now && r.status !== 'cancelled')
          const history = data.data.filter((r: any) => new Date(r.startTime) < now || r.status === 'completed' || r.status === 'cancelled')
          setUpcomingList(upcoming)
          setHistoryList(history)
        }
      } catch (err) {
        console.error('Failed to load reservations:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReservations()
  }, [user?.id])

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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Logo</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Settings size={20} style={{ cursor: 'pointer', color: '#8b949e' }} />
          <LogOut size={20} style={{ cursor: 'pointer', color: '#8b949e' }} onClick={() => navigate('/logged-in-tab-res')} />
        </div>
      </div>

      {/* Greeting */}
      <div className="res-welcome-greeting" style={{ marginBottom: '40px' }}>
        <h2 className="res-welcome-title" style={{ fontSize: '2.5rem', fontWeight: 700, margin: '0 0 8px 0' }}>Welcome back, John</h2>
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
          onClick={() => navigate('/user-reserve')}
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

      {/* Tabs */}
      <div className="res-welcome-tabs" style={{ display: 'flex', gap: '32px', borderBottom: '1px solid #30363d', marginBottom: '24px' }}>
        <div 
          onClick={() => setActiveTab('upcoming')}
          style={{ 
            padding: '0 0 16px 0', 
            borderBottom: activeTab === 'upcoming' ? '2px solid #4a9e6b' : 'none', 
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
            borderBottom: activeTab === 'history' ? '2px solid #4a9e6b' : 'none', 
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {res.table?.table_type || 'Main Dining'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {new Date(res.startTime).toLocaleDateString('en-GB')}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {new Date(res.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
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
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {res.table?.table_type || 'Main Dining'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {new Date(res.startTime).toLocaleDateString('en-GB')}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {new Date(res.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
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
    </div>
  )
}
