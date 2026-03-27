import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, Coffee, Settings, LogOut, ChevronLeft, ChevronRight, Upload, Plus, Calendar, Clock, Layout } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import PoweredByFooter from '../../components/PoweredByFooter'
import StaffReservationWizard from './StaffReservationWizard'

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

  const fetchData = async (date: string, currentRestaurantId: string) => {
    if (!currentRestaurantId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [tablesRes, resvRes, orgRes] = await Promise.all([
        api.get(`/organizations/${currentRestaurantId}/tables`),
        api.get(`/organizations/${currentRestaurantId}/reservations?date=${date}`),
        api.get(`/organizations/${currentRestaurantId}`)
      ])

      setDbTables(tablesRes.data.data || [])
      setDbReservations(resvRes.data.reservations || []) 
      setRestaurantName(orgRes.data.data?.name || 'Staff Dashboard')
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (restaurantId) {
      fetchData(selectedDate, restaurantId)
    } else if (user === null) {
      setLoading(false)
    }
  }, [user, selectedDate, restaurantId])

  // Auto-poll every 30 seconds for real-time sync
  useEffect(() => {
    if (!restaurantId) return
    const interval = setInterval(() => {
      fetchData(selectedDate, restaurantId)
    }, 30_000)
    return () => clearInterval(interval)
  }, [selectedDate, restaurantId])

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
      if (restaurantId) fetchData(selectedDate, restaurantId)
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
      if (restaurantId) fetchData(selectedDate, restaurantId)
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
      if (restaurantId) fetchData(selectedDate, restaurantId)
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
              <div style={{ backgroundColor: '#ffffff', paddingBottom: '60px' }}>
                {Object.entries(
                  dbTables.reduce((acc, table) => {
                    const areaName = table.area?.name || table.floor_areas?.name || table.location || 'Main Area'
                    if (!acc[areaName]) acc[areaName] = []
                    acc[areaName].push(table)
                    return acc
                  }, {} as Record<string, any[]>)
                ).map(([areaName, areaTables]) => (
                  <div key={areaName} style={{ marginBottom: '40px' }}>
                    <div style={{ padding: '24px 60px', backgroundColor: '#F9FAFB', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6', marginBottom: '40px' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>{areaName}</h3>
                      <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '4px 0 0 0' }}>{(areaTables as any[]).length} Tables</p>
                    </div>
                    <div style={{ padding: '0 60px', display: 'flex', flexWrap: 'wrap', gap: '100px', justifyContent: 'center' }}>
                      {(areaTables as any[]).map(table => {
                        const reservation = dbReservations.find(r => r.table?.id === table.id)
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
                              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>T-{table.tableNumber || table.name?.split(' ')[1] || table.name || '0'}</span>
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
                    </div>
                  </div>
                ))}
                {/* Unassigned Reservations in Table View */}
                {dbReservations.filter(r => !r.table?.id).length > 0 && (
                  <div style={{ width: '100%', marginTop: '40px', paddingTop: '40px', borderTop: '2px dashed #F3F4F6', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6B7280', margin: '0 0 24px 0' }}>Unassigned Reservations</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
                      {dbReservations.filter(r => !r.table?.id).map(res => (
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
                <div style={{ border: '1px solid #E5E7EB', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  
                  {/* Timeline Header */}
                  <div style={{ display: 'flex', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <div style={{ width: '160px', flexShrink: 0, borderRight: '1px solid #E5E7EB' }}></div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ flex: 1, position: 'relative', borderRight: '1px solid #E5E7EB' }}>
                          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>
                            {12 + i}
                          </div>
                          {/* Half-hour marker at the bottom center of the hour block */}
                          <div style={{ position: 'absolute', bottom: 0, left: '50%', width: '1px', height: '8px', backgroundColor: '#E5E7EB' }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grid Rows by Area */}
                  {Object.entries(
                    dbTables.reduce((acc, table) => {
                      const areaName = table.floor_areas?.name || 'Main Area'
                      if (!acc[areaName]) acc[areaName] = []
                      acc[areaName].push(table)
                      return acc
                    }, {} as Record<string, any[]>)
                  ).map(([area, tables], areaIdx, arr) => (
                    <div key={area} style={{ display: 'flex', borderBottom: areaIdx === arr.length - 1 ? 'none' : '1px solid #E5E7EB' }}>
                      
                      {/* Area Name Column (Vertical) */}
                      <div style={{ width: '60px', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                          {area}
                        </span>
                      </div>

                      {/* Tables inside this Area */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {(tables as any[]).map((table, tIdx) => (
                          <div key={table.id} style={{ display: 'flex', minHeight: '60px', borderBottom: tIdx === (tables as any[]).length - 1 ? 'none' : '1px solid #E5E7EB' }}>
                            
                            {/* Table Number & Capacity */}
                            <div style={{ width: '100px', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827' }}>{table.tableNumber || table.name?.split(' ')?.[1] || 1}</span>
                              <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{table.capacity}</span>
                            </div>

                            {/* Timeline Grid (20 half-hour columns) */}
                            <div style={{ flex: 1, display: 'flex', position: 'relative', backgroundColor: '#ffffff' }}>
                              {Array.from({ length: 20 }).map((_, colIdx) => (
                                <div key={colIdx} style={{ flex: 1, borderRight: '1px solid #F3F4F6' }} />
                              ))}

                              {/* Overlay Reservations */}
                              {dbReservations.filter(r => r.table?.id === table.id).map((r, rIdx) => {
                                const startTime = r.startTime || '12:00'
                                const [h, m] = startTime.split(':').map(Number)
                                // Clamp to 12:00 - 22:00 (600 minutes span)
                                const totalMins = (h - 12) * 60 + m
                                const startPos = Math.max(0, Math.min(90, (totalMins / 600) * 100))
                                
                                // Default width based on typical 90 min reservation (90/600 * 100 = 15%)
                                const width = 15
                                
                                // Colors strictly from the UI design reference
                                const isSeated = r.status === 'seated'
                                const isConfirmed = r.status === 'confirmed'
                                const bgColor = isSeated ? '#2F5233' : (isConfirmed ? '#8C6B45' : '#111827')

                                return (
                                  <div 
                                    key={r.id}
                                    onClick={() => setSelectedBooking(r)}
                                    style={{ 
                                      position: 'absolute', 
                                      left: `${startPos}%`,
                                      width: `${width}%`, 
                                      top: `${8 + (rIdx * 4)}px`, 
                                      bottom: '8px',
                                      backgroundColor: bgColor,
                                      borderRadius: '8px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      color: '#ffffff',
                                      overflow: 'hidden',
                                      zIndex: 10,
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                    <div style={{ padding: '0 12px', height: '100%', backgroundColor: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                                      {r.partySize}
                                    </div>
                                    <div style={{ padding: '0 12px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {r.guestFirstName} {r.guestLastName}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Unassigned / Drag Drop Catcher */}
                  {dbReservations.filter(r => !r.table?.id || !dbTables.some(t => t.id === r.table?.id)).length > 0 && (
                    <div style={{ display: 'flex', borderTop: '2px dashed #E5E7EB', backgroundColor: '#F9FAFB' }}>
                       <div style={{ width: '160px', borderRight: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#6B7280' }}>Unassigned</span>
                       </div>
                       <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: '60px' }}>
                          {Array.from({ length: 20 }).map((_, colIdx) => (
                            <div key={colIdx} style={{ flex: 1, borderRight: '1px solid #F3F4F6' }} />
                          ))}
                          {dbReservations.filter(r => !r.table?.id || !dbTables.some(t => t.id === r.table?.id)).map((r, rIdx) => {
                             const startTime = r.startTime || '12:00'
                             const [h, m] = startTime.split(':').map(Number)
                             const totalMins = (h - 12) * 60 + m
                             const startPos = Math.max(0, Math.min(90, (totalMins / 600) * 100))
                             return (
                                <div 
                                  key={r.id}
                                  onClick={() => setSelectedBooking(r)}
                                  style={{ 
                                    position: 'absolute', left: `${startPos}%`, width: `15%`, 
                                    top: `${8 + (rIdx * 4)}px`, bottom: '8px',
                                    backgroundColor: '#ffffff', border: '1px dashed #E5E7EB', color: '#111827',
                                    borderRadius: '8px', display: 'flex', alignItems: 'center',
                                    cursor: 'pointer', overflow: 'hidden', zIndex: 10
                                  }}>
                                  <div style={{ padding: '0 12px', height: '100%', borderRight: '1px dashed #E5E7EB', display: 'flex', alignItems: 'center', backgroundColor: '#F9FAFB', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {r.partySize}
                                  </div>
                                  <div style={{ padding: '0 12px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {r.guestFirstName} {r.guestLastName}
                                  </div>
                                </div>
                             )
                          })}
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
      {showCreateModal && restaurantId && (
        <StaffReservationWizard
          restaurantId={restaurantId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchData(selectedDate, restaurantId)
          }}
        />
      )}
      <PoweredByFooter theme="light" />
    </div>
  )
}
