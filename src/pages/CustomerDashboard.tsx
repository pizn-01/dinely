import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, MapPin, X } from 'lucide-react'

const upcomingReservations = [
  {
    id: 1,
    date: 'Thursday, March 5, 2026',
    time: '17:30',
    guests: 2,
    table: 'Table 6',
    area: 'Center area',
    status: 'Confirmed',
  },
]

const visitHistory = [
  {
    id: 1,
    date: 'February 14, 2026',
    time: '19:00',
    guests: 2,
    table: 'Table 3',
    area: 'Private corner',
    status: 'Completed',
  },
  {
    id: 2,
    date: 'January 28, 2026',
    time: '18:30',
    guests: 4,
    table: 'Table 7',
    area: 'Main Dining',
    status: 'Completed',
  },
]

export default function CustomerDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming')

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-card border-b border-dark-border px-8 py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back, John!</h1>
          <p className="text-dark-text-secondary text-sm">Manage your dining reservations</p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6 max-w-md">
            <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-4">
              <p className="text-dark-text-secondary text-xs">Upcoming</p>
              <p className="text-2xl font-bold text-white mt-1">1</p>
            </div>
            <div className="bg-dark-bg-secondary border border-dark-border rounded-xl p-4">
              <p className="text-dark-text-secondary text-xs">Past Visits</p>
              <p className="text-2xl font-bold text-white mt-1">12</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* CTA Card */}
        <div className="bg-green-subtle border border-green-primary/30 rounded-2xl p-6 mb-8 flex items-center justify-between">
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
        <div className="flex gap-6 border-b border-dark-border mb-6">
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
          {(activeTab === 'upcoming' ? upcomingReservations : visitHistory).map((res) => (
            <div
              key={res.id}
              className="bg-dark-card border border-dark-border rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-white">
                    <Calendar size={14} className="text-gold" />
                    {res.date}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-dark-text-secondary">
                    <span className="flex items-center gap-1.5">
                      <Clock size={13} />
                      {res.time}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users size={13} />
                      {res.guests} Guests
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin size={13} />
                      {res.table} - {res.area}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${
                    res.status === 'Confirmed' ? 'badge-confirmed' : 'badge-available'
                  }`}>
                    {res.status}
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
        </div>
      </div>
    </div>
  )
}
