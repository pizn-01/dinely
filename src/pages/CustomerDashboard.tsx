import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, MapPin, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'

export default function CustomerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')
  const [upcomingList, setUpcomingList] = useState<any[]>([])
  const [historyList, setHistoryList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchCustomerReservations = async () => {
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
        console.error('Failed to load customer reservations:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomerReservations()
  }, [user?.id])

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-card border-b border-dark-border px-8 py-8 res-cust-header">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, John!</h1>
          <p className="text-dark-text-secondary text-sm">Manage your dining reservations</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6 max-w-md res-cust-stats-grid">
            <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-4">
              <p className="text-dark-text-secondary text-xs">Upcoming</p>
              <p className="text-2xl font-bold text-white mt-1">{upcomingList.length}</p>
            </div>
            <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-4">
              <p className="text-dark-text-secondary text-xs">Past Visits</p>
              <p className="text-2xl font-bold text-white mt-1">{historyList.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 res-cust-content">
        {/* CTA Card */}
        <div className="bg-green-subtle border border-green-primary/30 rounded-2xl p-6 mb-8 flex items-center justify-between res-cust-cta">
          <div>
            <h2 className="text-lg font-semibold text-white">Ready For Your Next Visit?</h2>
            <p className="text-sm text-dark-text-secondary mt-1">Reserve your favorite table in just a few clicks</p>
          </div>
          <button
            onClick={() => navigate('/reserve')}
            className="btn-gold shrink-0"
          >
            Book A Table
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-dark-border mb-6 res-cust-tabs">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'upcoming'
                ? 'text-green-light border-b-2 border-green-light'
                : 'text-dark-text-secondary hover:text-white'
            }`}
          >
            Upcoming Reservation
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'history'
                ? 'text-green-light border-b-2 border-green-light'
                : 'text-dark-text-secondary hover:text-white'
            }`}
          >
            Visit History
          </button>
        </div>

        {/* Reservation Cards */}
        <div className="space-y-4 animate-fade-in">
          {loading && <p className="text-dark-text-secondary">Loading reservations...</p>}
          {!loading && (activeTab === 'upcoming' ? upcomingList : historyList).map((res) => (
            <div
              key={res.id}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-start justify-between res-cust-res-card-inner">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Calendar size={14} className="text-gold" />
                    {new Date(res.startTime).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-dark-text-secondary res-cust-res-meta">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      {new Date(res.startTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={13} />
                      {res.partySize} Guests
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} />
                      {res.table?.name || 'Table pending'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 res-cust-res-actions">
                  <span className={`badge ${
                    res.status === 'confirmed' ? 'badge-confirmed' : 'badge-available'
                  }`}>
                    {res.status || 'pending'}
                  </span>
                  {activeTab === 'upcoming' && (
                    <button className="text-dark-text-secondary hover:text-red-400 transition-colors cursor-pointer">
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!loading && (activeTab === 'upcoming' ? upcomingList : historyList).length === 0 && (
            <p className="text-dark-text-secondary p-4 bg-dark-bg-secondary rounded-xl border border-dark-border text-sm">
              No {activeTab} reservations found.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
