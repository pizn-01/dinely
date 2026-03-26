import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, Coffee, Settings, LogOut, ChevronLeft, ChevronRight, Upload, Plus, Calendar, Clock, Layout } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

interface TableData {
  id: string
  name: string
  capacity: number
  location: string
  status: 'available' | 'seated' | 'confirmed' | 'arriving' | 'noshow'
}

// Fixed Logo/Icon Container style from references
const IconContainer = ({ children, color = '#6B9E78' }: { children: React.ReactNode, color?: string }) => (
  <div style={{ 
    width: '40px', 
    height: '40px', 
    borderRadius: '12px', 
    backgroundColor: `${color}15`, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    color: color
  }}>
    {children}
  </div>
)

export default function StaffTableManagement() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('Table View') // Default to Table View as per floor map focus
  const [loading, setLoading] = useState(true)
  
  // Dynamic State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dbTables, setDbTables] = useState<any[]>([])
  const [dbReservations, setDbReservations] = useState<any[]>([])
  const [restaurantName, setRestaurantName] = useState('Staff Dashboard')

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRes, setNewRes] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '18:30',
    partySize: 2,
    guestEmail: '',
    guestFirstName: '',
    guestLastName: '',
    guestPhone: '',
    specialRequests: '',
    tableId: ''
  })

  const restaurantId = user?.restaurantId

  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const fetchData = async (date: string) => {
    if (!restaurantId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [tablesRes, resvRes, orgRes] = await Promise.all([
        api.get(`/organizations/${restaurantId}/tables`),
        api.get(`/organizations/${restaurantId}/reservations?date=${date}`),
        api.get(`/organizations/${restaurantId}`)
      ])

      setDbTables(tablesRes.data.data || [])
      setDbReservations(resvRes.data.data || [])
      setRestaurantName(orgRes.data.data?.name || 'Staff Dashboard')
      setLastRefreshed(new Date())
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedDate)
  }, [restaurantId, selectedDate])

  // Auto-poll every 30 seconds for real-time sync
  useEffect(() => {
    if (!restaurantId) return
    const interval = setInterval(() => {
      fetchData(selectedDate)
    }, 30_000)
    return () => clearInterval(interval)
  }, [restaurantId, selectedDate])

  // Redirect if not logged in
  const navigate = useNavigate()
  useEffect(() => {
    if (!loading && !user) {
      navigate('/staff-login')
    }
  }, [user, loading, navigate])

  const dayTabs = useMemo(() => {
    const tabs = []
    const now = new Date()
    for (let i = 0; i < 5; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const iso = d.toISOString().split('T')[0]
      let label = d.toLocaleDateString('en-GB', { weekday: 'short' })
      if (i === 0) label = 'Today'
      if (i === 1) label = 'Tomorrow'
      tabs.push({ label, iso, day: d.getDate(), month: d.toLocaleDateString('en-GB', { month: 'short' }) })
    }
    return tabs
  }, [])

  const stats = useMemo(() => {
    const arriving = dbReservations.filter(r => r.status === 'confirmed' || r.status === 'arriving').length
    const seated = dbReservations.filter(r => r.status === 'seated').length
    const confirmed = dbReservations.filter(r => r.status === 'confirmed').length
    const available = dbTables.length - dbReservations.filter(r => r.status === 'seated').length

    return [
      { label: 'Arriving', value: arriving, color: '#C99C63', icon: <Clock size={20} /> },
      { label: 'Seated', value: seated, color: '#E05D5D', icon: <Users size={20} /> },
      { label: 'Confirmed', value: confirmed, color: '#5D8FE0', icon: <Calendar size={20} /> },
      { label: 'Available', value: available, color: '#6B9E78', icon: <Layout size={20} /> }
    ]
  }, [dbTables, dbReservations])

  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)

      if (!restaurantId) throw new Error('No restaurant context found')

      await api.post(`/organizations/${restaurantId}/tables/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      alert('Floor plan CSV uploaded successfully!')
      fetchData(selectedDate)
    } catch (error) {
      console.error('Failed to upload CSV:', error)
      alert('Failed to upload floor plan CSV.')
    } finally {
      setUploading(false)
    }
  }

  const handleStatusUpdate = async (resId: string, status: string) => {
    try {
      await api.patch(`/organizations/${restaurantId}/reservations/${resId}/status`, { status })
      setSelectedBooking(null); setSelectedTable(null);
      fetchData(selectedDate)
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleCreateReservation = async () => {
    try {
      await api.post(`/organizations/${restaurantId}/reservations`, {
        reservationDate: newRes.date,
        startTime: newRes.time,
        partySize: newRes.partySize,
        guestEmail: newRes.guestEmail,
        guestFirstName: newRes.guestFirstName,
        guestLastName: newRes.guestLastName,
        guestPhone: newRes.guestPhone,
        specialRequests: newRes.specialRequests,
        tableId: newRes.tableId || null,
        source: 'pos'
      })
      setShowCreateModal(false)
      fetchData(selectedDate)
    } catch (error) {
      console.error('Failed to create reservation:', error)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'arriving': return { bg: '#FFF7ED', color: '#C2410C' }
      case 'seated': return { bg: '#FEF2F2', color: '#B91C1C' }
      case 'confirmed': return { bg: '#EFF6FF', color: '#1D4ED8' }
      case 'noshow': return { bg: '#F9FAFB', color: '#4B5563' }
      default: return { bg: '#F0FDF4', color: '#15803D' }
    }
  }

  if (loading && dbTables.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
        <p style={{ color: '#6B7280', fontSize: '1rem', fontWeight: 500 }}>Loading Dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F9FAFB', color: '#111827', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header Section */}
      <header style={{ backgroundColor: '#ffffff', padding: '24px 40px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', backgroundColor: '#F3F4F6', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layout size={24} color="#111827" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{restaurantName}</h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
              Staff Console
              {lastRefreshed && (
                <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: '#9CA3AF' }}>
                  • Last synced: {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '10px 16px', 
            border: '1px solid #F3F4F6', 
            borderRadius: '12px', 
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#6B7280',
            backgroundColor: '#ffffff'
          }}>
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Import Map'}
            <input type="file" accept=".csv" onChange={handleFileUpload} hidden />
          </label>
          <button 
            onClick={() => setShowCreateModal(true)}
            style={{ 
              backgroundColor: '#111827', 
              color: '#ffffff', 
              padding: '10px 24px', 
              borderRadius: '12px', 
              border: 'none', 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
            <Plus size={18} />
            Create Reservation
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#F3F4F6', margin: '0 8px' }} />
          <button style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '8px' }}><Settings size={20} /></button>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '8px' }}><LogOut size={20} /></button>
        </div>
      </header>

      <main style={{ padding: '32px 40px' }}>
        {/* Statistics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #F3F4F6', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: '#6B7280', fontWeight: 500, marginBottom: '8px', margin: 0 }}>{stat.label}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{stat.value}</h2>
              </div>
              <IconContainer color={stat.color}>{stat.icon}</IconContainer>
            </div>
          ))}
        </div>

        {/* View Controls & Date Navigation */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', border: '1px solid #F3F4F6', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ padding: '24px 32px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
            <div style={{ display: 'flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '12px', gap: '4px' }}>
              {['Day View', 'Table View', 'Calendar View'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                    color: activeTab === tab ? '#111827' : '#6B7280',
                    boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {dayTabs.map(tab => (
                <button
                  key={tab.iso}
                  onClick={() => setSelectedDate(tab.iso)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: selectedDate === tab.iso ? '#111827' : '#F3F4F6',
                    backgroundColor: selectedDate === tab.iso ? '#111827' : '#ffffff',
                    color: selectedDate === tab.iso ? '#ffffff' : '#111827',
                    cursor: 'pointer',
                    minWidth: '70px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: selectedDate === tab.iso ? 'rgba(255,255,255,0.7)' : '#6B7280' }}>{tab.label}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{tab.day}</span>
                </button>
              ))}
            </div>
          </div>

          {/* View Content */}
          <div style={{ minHeight: '500px' }}>
            {activeTab === 'Table View' && (
              <div style={{ padding: '60px', display: 'flex', flexWrap: 'wrap', gap: '100px', justifyContent: 'center', backgroundColor: '#ffffff' }}>
                {dbTables.map(table => {
                  const reservation = dbReservations.find(r => r.tableId === table.id)
                  const status = reservation?.status || 'available'
                  const style = getStatusStyle(status)
                  const capacity = table.capacity || 4
                  
                  return (
                    <div 
                      key={table.id}
                      onClick={() => reservation ? setSelectedBooking(reservation) : setSelectedTable(table)}
                      style={{ position: 'relative', width: '120px', height: '120px', cursor: 'pointer' }}>
                      
                      {/* Plus Chair Layout - Rendered based on capacity */}
                      {capacity >= 1 && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', width: '28px', height: '28px', backgroundColor: '#F3F4F6', borderRadius: '6px', border: '1px solid #E5E7EB' }} />} {/* Top */}
                      {capacity >= 2 && <div style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', width: '28px', height: '28px', backgroundColor: '#F3F4F6', borderRadius: '6px', border: '1px solid #E5E7EB' }} />} {/* Bottom */}
                      {capacity >= 3 && <div style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', backgroundColor: '#F3F4F6', borderRadius: '6px', border: '1px solid #E5E7EB' }} />} {/* Left */}
                      {capacity >= 4 && <div style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', backgroundColor: '#F3F4F6', borderRadius: '6px', border: '1px solid #E5E7EB' }} />} {/* Right */}

                      {/* The Table */}
                      <div style={{ 
                        width: '100%', 
                        height: '100%', 
                        backgroundColor: '#ffffff', 
                        borderRadius: '50%', 
                        border: `2.5px solid ${status === 'available' ? '#F3F4F6' : style.color}`,
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 10,
                        boxShadow: '0 8px 16px rgba(0,0,0,0.04)',
                        transition: 'all 0.3s'
                      }}>
                        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>T-{table.tableNumber}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <Users size={12} color="#9CA3AF" />
                          <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>{capacity}</span>
                        </div>
                        
                        {status !== 'available' && (
                          <div style={{ 
                            position: 'absolute', 
                            bottom: '-6px', 
                            backgroundColor: style.color, 
                            color: '#ffffff', 
                            fontSize: '0.625rem', 
                            padding: '2px 10px', 
                            borderRadius: '100px', 
                            fontWeight: 800, 
                            textTransform: 'uppercase',
                            boxShadow: `0 4px 8px ${style.color}40`
                          }}>
                            {status}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                {/* Unassigned Reservations in Table View */}
                {dbReservations.filter(r => !r.tableId).length > 0 && (
                  <div style={{ width: '100%', marginTop: '40px', paddingTop: '40px', borderTop: '2px dashed #F3F4F6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6B7280', margin: '0 0 24px 0' }}>Unassigned Reservations</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
                      {dbReservations.filter(r => !r.tableId).map(res => (
                         <div 
                           key={res.id} 
                           onClick={() => setSelectedBooking(res)} 
                           style={{ backgroundColor: '#F9FAFB', border: '1px dashed #E5E7EB', padding: '16px 32px', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}
                           onMouseEnter={e => e.currentTarget.style.borderColor = '#9CA3AF'}
                           onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                         >
                           <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{res.guestFirstName} {res.guestLastName}</span>
                           <span style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '4px' }}>{res.partySize} Guests • {res.startTime?.slice(0, 5)}</span>
                           <span style={{ marginTop: '12px', fontSize: '0.625rem', fontWeight: 800, color: '#C2410C', backgroundColor: '#FFF7ED', padding: '4px 10px', borderRadius: '100px', letterSpacing: '0.05em' }}>NEEDS TABLE</span>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Day View' && (
              <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }}>
                {dbReservations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px', color: '#6B7280' }}>
                    <Calendar size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                    <p>No reservations found for {selectedDate}</p>
                  </div>
                ) : (
                  dbReservations.sort((a,b) => (a.startTime || '').localeCompare(b.startTime || '')).map(res => {
                    const style = getStatusStyle(res.status)
                    return (
                      <div 
                        key={res.id} 
                        onClick={() => setSelectedBooking(res)}
                        style={{ 
                          backgroundColor: '#ffffff', 
                          padding: '20px 24px', 
                          borderRadius: '16px', 
                          border: '1px solid #F3F4F6', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: '#111827', width: '70px' }}>{res.startTime?.slice(0, 5)}</div>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: style.bg, color: style.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>
                            {res.guestFirstName?.[0]}{res.guestLastName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{res.guestFirstName} {res.guestLastName}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '2px' }}>Table {res.table?.tableNumber || 'N/A'} • {res.partySize} Guests</div>
                          </div>
                        </div>
                        <div style={{ 
                          backgroundColor: style.bg, 
                          color: style.color, 
                          padding: '8px 20px', 
                          borderRadius: '100px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          border: `1px solid ${style.color}15`
                        }}>
                          {res.status}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}

            {activeTab === 'Calendar View' && (
              <div style={{ padding: '32px' }}>
                <div style={{ border: '1px solid #F3F4F6', borderRadius: '24px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  {/* Timeline Header */}
                  <div style={{ display: 'flex', backgroundColor: '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                    <div style={{ width: '120px', borderRight: '1px solid #F3F4F6', padding: '16px', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' }}>Table</div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      {['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(t => (
                        <div key={t} style={{ flex: 1, textAlign: 'center', padding: '16px 0', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', borderRight: '1px solid #F3F4F6' }}>{t}</div>
                      ))}
                    </div>
                  </div>
                  {/* Grid Rows */}
                  {dbTables.map(table => (
                    <div key={table.id} style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', minHeight: '64px', backgroundColor: '#ffffff' }}>
                      <div style={{ width: '120px', borderRight: '1px solid #F3F4F6', padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>T-{table.tableNumber}</div>
                      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                        {dbReservations.filter(r => r.tableId === table.id).map(r => {
                          const startTime = r.startTime || '12:00'
                          const [h, m] = startTime.split(':').map(Number)
                          const startPos = (((h - 12) * 60 + m) / (10 * 60)) * 100
                          const style = getStatusStyle(r.status)
                          
                          return (
                            <div 
                              key={r.id}
                              onClick={() => setSelectedBooking(r)}
                              style={{ 
                                position: 'absolute', 
                                left: `${startPos}%`,
                                width: '18%', // Standard duration estimate
                                top: '10px',
                                bottom: '10px',
                                backgroundColor: style.bg,
                                color: style.color,
                                padding: '0 12px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                border: `1px solid ${style.color}20`,
                                zIndex: 10,
                                transition: 'transform 0.2s',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                              {r.guestFirstName} {r.guestLastName}
                            </div>
                          )
                        })}
                        {Array(11).fill(0).map((_, i) => (
                           <div key={i} style={{ flex: 1, borderRight: '1px solid #F3F4F6', opacity: 0.3 }} />
                        ))}
                      </div>
                    </div>
                  ))}
                  {/* Unassigned Row in Calendar View */}
                  {dbReservations.filter(r => !r.tableId).length > 0 && (
                    <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6', minHeight: '64px', backgroundColor: '#F9FAFB' }}>
                      <div style={{ width: '120px', borderRight: '1px solid #F3F4F6', padding: '0 16px', display: 'flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 700, color: '#6B7280' }}>Unassigned</div>
                      <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                        {dbReservations.filter(r => !r.tableId).map(r => {
                          const startTime = r.startTime || '12:00'
                          const [h, m] = startTime.split(':').map(Number)
                          const startPos = Math.max(0, (((h - 12) * 60 + m) / (10 * 60)) * 100)
                          
                          return (
                            <div 
                              key={r.id}
                              onClick={() => setSelectedBooking(r)}
                              style={{ 
                                position: 'absolute', 
                                left: `${startPos}%`,
                                width: '18%', 
                                top: '10px',
                                bottom: '10px',
                                backgroundColor: '#ffffff',
                                color: '#111827',
                                padding: '0 12px',
                                borderRadius: '10px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                border: `1px dashed #E5E7EB`,
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                zIndex: 10,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                              {r.guestFirstName} {r.guestLastName}
                            </div>
                          )
                        })}
                        {Array(11).fill(0).map((_, i) => (
                           <div key={`unassigned-${i}`} style={{ flex: 1, borderRight: '1px solid #F3F4F6', opacity: 0.3 }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reservation Detail Modal */}
      {(selectedBooking || selectedTable) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <button 
              onClick={() => { setSelectedBooking(null); setSelectedTable(null); }} 
              style={{ position: 'absolute', top: '32px', right: '32px', background: '#F3F4F6', border: 'none', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0' }}>{selectedTable ? `Table ${selectedTable.tableNumber}` : `Reservation`}</h2>
            <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '32px' }}>
              {selectedTable ? `${selectedTable.capacity} Seats • Available` : `${selectedBooking.partySize} Guests • ${selectedBooking.status.toUpperCase()}`}
            </p>

            {selectedBooking && (
              <div style={{ backgroundColor: '#F9FAFB', borderRadius: '24px', padding: '24px', marginBottom: '32px', border: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>{selectedBooking.guestFirstName} {selectedBooking.guestLastName}</span>
                  <span style={{ color: '#C99C63', fontWeight: 800 }}>{selectedBooking.startTime?.slice(0, 5)}</span>
                </div>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '0.875rem' }}>{selectedBooking.partySize}nd Person • Table {selectedBooking.table?.tableNumber}</p>
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                   {selectedBooking.status === 'confirmed' && <button onClick={() => handleStatusUpdate(selectedBooking.id, 'arriving')} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#111827', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Mark Arriving</button>}
                   {selectedBooking.status === 'arriving' && <button onClick={() => handleStatusUpdate(selectedBooking.id, 'seated')} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: '#6B9E78', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Mark Seated</button>}
                   <button onClick={() => handleStatusUpdate(selectedBooking.id, 'noshow')} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: 'transparent', color: '#E05D5D', border: '1px solid #E05D5D', fontWeight: 600, cursor: 'pointer' }}>No-Show</button>
                </div>
              </div>
            )}

            {!selectedBooking && (
              <button 
                onClick={() => { setShowCreateModal(true); setSelectedTable(null); }}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: '#111827', color: '#ffffff', border: 'none', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                Make Reservation
              </button>
            )}
          </div>
        </div>
      )}

      {/* POS Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '32px', width: '100%', maxWidth: '540px', padding: '48px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>New Reservation</h2>
            <p style={{ color: '#6B7280', marginBottom: '40px' }}>Create a manual reservation for a walk-in or phone call.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Date</label>
                <input type="date" value={newRes.date} onChange={e => setNewRes({...newRes, date: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Time</label>
                <input type="time" value={newRes.time} onChange={e => setNewRes({...newRes, time: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>First Name</label>
                <input type="text" placeholder="John" value={newRes.guestFirstName} onChange={e => setNewRes({...newRes, guestFirstName: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Last Name</label>
                <input type="text" placeholder="Doe" value={newRes.guestLastName} onChange={e => setNewRes({...newRes, guestLastName: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Email Address</label>
                <input type="email" placeholder="john.doe@example.com" value={newRes.guestEmail} onChange={e => setNewRes({...newRes, guestEmail: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Phone Number</label>
                <input type="tel" placeholder="+44 20 7123 4567" value={newRes.guestPhone} onChange={e => setNewRes({...newRes, guestPhone: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Party Size</label>
                <input type="number" min="1" value={newRes.partySize} onChange={e => setNewRes({...newRes, partySize: parseInt(e.target.value) || 1})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Assign Table</label>
                <select value={newRes.tableId} onChange={e => setNewRes({...newRes, tableId: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500, WebkitAppearance: 'none', backgroundColor: '#fff', cursor: 'pointer' }}>
                  <option value="">No table assigned</option>
                  {dbTables.map(t => (
                    <option key={t.id} value={t.id}>Table {t.tableNumber} (Seats: {t.capacity})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9CA3AF' }}>Special Requests</label>
                <input type="text" placeholder="Birthday, allergies, high chair, etc." value={newRes.specialRequests} onChange={e => setNewRes({...newRes, specialRequests: e.target.value})} style={{ padding: '14px', borderRadius: '12px', border: '1px solid #F3F4F6', fontSize: '1rem', fontWeight: 500 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#F3F4F6', color: '#4B5563', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateReservation} style={{ flex: 1, padding: '16px', borderRadius: '16px', border: 'none', backgroundColor: '#111827', color: '#ffffff', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
