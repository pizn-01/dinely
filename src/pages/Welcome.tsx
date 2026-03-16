import { useState } from 'react'
import { Calendar, Table, Settings, LogOut, CheckCircle2, Users, MapPin, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()

  const reservations = [
    {
      id: 1,
      table: 'Table 7',
      capacity: '2 Seats',
      location: 'By the window',
      date: '2026-02-20',
      time: '19:00',
      status: 'Confirmed'
    },
    {
      id: 2,
      table: 'Table 8',
      capacity: '2 Seats',
      location: 'By the window',
      date: '2026-02-20',
      time: '19:00',
      status: 'Confirmed'
    }
  ]

  const visitHistory = [
    {
      id: 1,
      table: 'Table 7',
      capacity: '2 seats',
      location: 'By the window',
      date: '2026-02-20',
      time: '19:00',
      status: 'Completed'
    },
    {
      id: 2,
      table: 'Table 8',
      capacity: '2 seats',
      location: 'By the window',
      date: '2026-02-20',
      time: '19:00',
      status: 'Completed'
    },
    {
      id: 3,
      table: 'Table 9',
      capacity: '2 seats',
      location: 'By the window',
      date: '2026-02-20',
      time: '19:00',
      status: 'Completed'
    },
    {
      id: 4,
      table: 'Table 10',
      capacity: '2 seats',
      location: 'By the window',
      date: '2026-02-20',
      time: '19:00',
      status: 'Completed'
    }
  ]

  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')

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
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>2</div>
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
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>4</div>
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
        {activeTab === 'upcoming' && reservations.map(res => (
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
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{res.table}</h4>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.75rem', 
                    color: '#4a9e6b', 
                    backgroundColor: 'rgba(74, 158, 107, 0.1)', 
                    padding: '2px 8px', 
                    borderRadius: '12px' 
                  }}>
                    <CheckCircle2 size={12} />
                    {res.status}
                  </div>
                </div>
                <div className="res-welcome-res-meta" style={{ fontSize: '0.875rem', color: '#8b949e', display: 'flex', gap: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Capacity: {res.capacity}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {res.location}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {res.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {res.time}</span>
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

        {activeTab === 'history' && visitHistory.map(res => (
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
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>{res.table}</h4>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.75rem', 
                    color: '#4a9e6b', 
                    backgroundColor: 'rgba(74, 158, 107, 0.1)', 
                    padding: '2px 8px', 
                    borderRadius: '12px' 
                  }}>
                    {res.status}
                  </div>
                </div>
                <div className="res-welcome-res-meta" style={{ fontSize: '0.875rem', color: '#8b949e', display: 'flex', gap: '16px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={14} /> Capacity: {res.capacity}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {res.location}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> {res.date}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {res.time}</span>
                </div>
              </div>
            </div>
            {/* No cancel button for history */}
          </div>
        ))}
      </div>
    </div>
  )
}
