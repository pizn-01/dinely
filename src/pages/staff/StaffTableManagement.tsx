import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, MapPin, Coffee, Settings, LogOut, ChevronLeft, ChevronRight, Upload, Plus, Calendar, Clock, Layout, Moon, Sun } from 'lucide-react'
import { api } from '../../services/api'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useRealtimeReservations } from '../../hooks/useRealtimeReservations'
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
  const { isDark, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('Table View') // Default to Table View
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [monthlyResCounts, setMonthlyResCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  
  // Dynamic State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dbTables, setDbTables] = useState<any[]>([])
  const [dbReservations, setDbReservations] = useState<any[]>([])
  const [restaurantName, setRestaurantName] = useState('Staff Dashboard')
  const [orgData, setOrgData] = useState<any>(null)

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

  const fetchData = useCallback(async (date?: string, currentRestaurantId?: string) => {
    const rid = currentRestaurantId || restaurantId
    const d = date || selectedDate
    if (!rid) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [tablesRes, resvRes, orgRes] = await Promise.all([
        api.get(`/organizations/${rid}/tables`),
        api.get(`/organizations/${rid}/reservations?date=${d}`),
        api.get(`/organizations/${rid}`)
      ])

      setDbTables(tablesRes.data.data || [])
      setDbReservations(resvRes.data.reservations || []) 
      setRestaurantName(orgRes.data.data?.name || 'Staff Dashboard')
      setOrgData(orgRes.data.data)
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, selectedDate])

  useEffect(() => {
    if (restaurantId) {
      fetchData(selectedDate, restaurantId)
    } else if (user === null) {
      setLoading(false)
    }
  }, [user, selectedDate, restaurantId])

  // Auto-poll every 5 seconds to keep the system updated
  useEffect(() => {
    if (!restaurantId) return
    const interval = setInterval(() => {
      fetchData(selectedDate, restaurantId)
    }, 15_000)
    return () => clearInterval(interval)
  }, [selectedDate, restaurantId, fetchData])

  // Real-time sync: instant refresh on any reservation event
  useRealtimeReservations(restaurantId, useCallback(() => {
    if (restaurantId) fetchData(selectedDate, restaurantId)
  }, [restaurantId, selectedDate, fetchData]))

  // Fetch monthly reservation counts for the calendar view
  useEffect(() => {
    if (!restaurantId) return
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth() + 1
    api.get(`/organizations/${restaurantId}/reservations/monthly-counts?year=${year}&month=${month}`)
      .then(res => {
        if (res.data?.data) setMonthlyResCounts(res.data.data)
      })
      .catch(err => console.error('Failed to fetch monthly counts:', err))
  }, [restaurantId, calendarMonth])

  // Redirect if not logged in
  const navigate = useNavigate()
  useEffect(() => {
    if (!loading && !user) {
      navigate('/')
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

      toast.success('Floor plan CSV uploaded successfully!')
      if (restaurantId) fetchData(selectedDate, restaurantId)
    } catch (error) {
      console.error('Failed to upload CSV:', error)
      toast.error('Failed to upload floor plan CSV.')
    } finally {
      setUploading(false)
    }
  }

  const handleStatusUpdate = async (resId: string, status: string) => {
    try {
      await api.patch(`/organizations/${restaurantId}/reservations/${resId}/status`, { status })
      setSelectedBooking(null); setSelectedTable(null);
      if (restaurantId) fetchData(selectedDate, restaurantId)
    } catch (error: any) {
      console.error('Failed to update status:', error)
      toast.error(error.response?.data?.error || 'Failed to update reservation status.')
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
    if (isDark) {
      switch (status) {
        case 'arriving': return { bg: 'rgba(194, 65, 12, 0.15)', color: '#F59E0B' }
        case 'seated': return { bg: 'rgba(185, 28, 28, 0.15)', color: '#F87171' }
        case 'confirmed': return { bg: 'rgba(29, 78, 216, 0.15)', color: '#60A5FA' }
        case 'completed': return { bg: 'rgba(94, 234, 122, 0.1)', color: '#5EEA7A' }
        case 'noshow': return { bg: 'rgba(75, 85, 99, 0.15)', color: '#9CA3AF' }
        default: return { bg: 'rgba(21, 128, 61, 0.15)', color: '#4ADE80' }
      }
    }
    switch (status) {
      case 'arriving': return { bg: '#FFF7ED', color: '#C2410C' }
      case 'seated': return { bg: '#FEF2F2', color: '#B91C1C' }
      case 'confirmed': return { bg: '#EFF6FF', color: '#1D4ED8' }
      case 'completed': return { bg: '#F0FDF4', color: '#15803D' }
      case 'noshow': return { bg: '#F9FAFB', color: '#4B5563' }
      default: return { bg: '#F0FDF4', color: '#15803D' }
    }
  }

  if (loading && dbTables.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>Loading Dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', system-ui, sans-serif", transition: 'background-color 0.3s' }}>
      {/* Header Section */}
      <header style={{ backgroundColor: 'var(--header-bg)', padding: '24px 40px', borderBottom: `1px solid var(--header-border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, transition: 'background-color 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {orgData?.logoUrl ? (
            <img src={orgData.logoUrl} alt="Logo" style={{ height: '48px', maxWidth: '160px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; const span = document.createElement('span'); span.innerText = 'Logo'; span.style.fontWeight = '700'; span.style.fontSize = '1.35rem'; span.style.color = 'var(--text-primary)'; e.currentTarget.parentNode?.appendChild(span); }} />
          ) : (
            <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layout size={24} color="var(--text-primary)" />
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{restaurantName}</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Staff Console
              {lastRefreshed && (
                <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
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
            border: `1px solid var(--border-primary)`, 
            borderRadius: '12px', 
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-card)'
          }}>
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Import Map'}
            <input type="file" accept=".csv" onChange={handleFileUpload} hidden />
          </label>
          <button 
            onClick={() => setShowCreateModal(true)}
            style={{ 
              backgroundColor: isDark ? '#C99C63' : '#111827', 
              color: isDark ? '#0B1517' : '#ffffff', 
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
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--header-border)', margin: '0 8px' }} />
          <button onClick={toggleTheme} title="Toggle Theme" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}><Settings size={20} /></button>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}><LogOut size={20} /></button>
        </div>
      </header>

      <main style={{ padding: '32px 40px' }}>
        {/* Statistics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)', transition: 'background-color 0.3s, border-color 0.3s' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '8px', margin: 0 }}>{stat.label}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{stat.value}</h2>
              </div>
              <IconContainer color={stat.color}>{stat.icon}</IconContainer>
            </div>
          ))}
        </div>

        {/* View Controls & Date Navigation */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-primary)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', transition: 'background-color 0.3s, border-color 0.3s' }}>
          <div style={{ padding: '24px 32px', borderBottom: `1px solid var(--border-primary)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', transition: 'background-color 0.3s' }}>
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-hover)', padding: '4px', borderRadius: '12px', gap: '4px' }}>
              {['Day View', 'Table View', 'Timeline View', 'Calendar View'].map(tab => (
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
                    backgroundColor: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
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
                    borderColor: selectedDate === tab.iso
                      ? (isDark ? '#C99C63' : '#111827')
                      : 'var(--border-primary)',
                    backgroundColor: selectedDate === tab.iso
                      ? (isDark ? '#C99C63' : '#111827')
                      : 'var(--bg-card)',
                    color: selectedDate === tab.iso
                      ? (isDark ? '#0B1517' : '#ffffff')
                      : 'var(--text-primary)',
                    cursor: 'pointer',
                    minWidth: '70px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: selectedDate === tab.iso ? (isDark ? 'rgba(11,21,23,0.7)' : 'rgba(255,255,255,0.7)') : 'var(--text-secondary)' }}>{tab.label}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{tab.day}</span>
                </button>
              ))}
            </div>
          </div>

          {/* View Content */}
          <div style={{ minHeight: '500px' }}>
            {activeTab === 'Table View' && (
              <div style={{ backgroundColor: 'var(--bg-card)', paddingBottom: '60px', transition: 'background-color 0.3s' }}>
                {Object.entries(
                  dbTables.reduce((acc, table) => {
                    const areaName = table.area?.name || table.floor_areas?.name || table.location || 'Main Area'
                    if (!acc[areaName]) acc[areaName] = []
                    acc[areaName].push(table)
                    return acc
                  }, {} as Record<string, any[]>)
                ).map(([areaName, areaTables]) => (
                  <div key={areaName} style={{ marginBottom: '40px' }}>
                    <div style={{ padding: '24px 60px', backgroundColor: 'var(--bg-tertiary)', borderTop: `1px solid var(--border-primary)`, borderBottom: `1px solid var(--border-primary)`, marginBottom: '40px', transition: 'background-color 0.3s' }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{areaName}</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{(areaTables as any[]).length} Tables</p>
                    </div>
                    <div style={{ padding: '0 60px', display: 'flex', flexWrap: 'wrap', gap: '100px', justifyContent: 'center' }}>
                      {(areaTables as any[]).map(table => {
                        // Get all valid reservations for this table today
                        const tableReservations = dbReservations.filter(r => r.table?.id === table.id && !['cancelled', 'no_show'].includes(r.status))
                        
                        let status = 'available'
                        let nextReservationTime: string | null = null
                        
                        const now = new Date()
                        const currentTotalMins = now.getHours() * 60 + now.getMinutes()
                        const isToday = selectedDate === now.toISOString().split('T')[0]
                        
                        if (isToday) {
                          // 1. Is someone seated?
                          const seatedRes = tableReservations.find(r => r.status === 'seated')
                          if (seatedRes) {
                            status = 'seated'
                          } else {
                            // 2. Is someone arriving within next 45 mins or up to 30 mins late?
                            const arrivingSoon = tableReservations.filter(r => {
                              if (r.status === 'completed') return false
                              const [h, m] = (r.startTime || '00:00').split(':').map(Number)
                              const diff = (h * 60 + m) - currentTotalMins
                              return diff <= 45 && diff >= -30
                            }).sort((a,b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                            
                            if (arrivingSoon.length > 0) {
                              status = arrivingSoon[0].status === 'arriving' ? 'arriving' : 'pending_arrival'
                            } else {
                              // 3. Find next future reservation today
                              const futureRes = tableReservations.filter(r => {
                                if (r.status === 'completed') return false
                                const [h, m] = (r.startTime || '00:00').split(':').map(Number)
                                return (h * 60 + m) > currentTotalMins + 45
                              }).sort((a,b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                              if (futureRes.length > 0) {
                                nextReservationTime = futureRes[0].startTime?.slice(0, 5)
                              }
                            }
                          }
                        } else {
                           // If viewing future date, just show first active reservation status
                           const activeRes = tableReservations.find(r => !['completed'].includes(r.status))
                           if (activeRes) {
                             status = activeRes.status
                           }
                        }
                        
                        const visualStatus = status === 'pending_arrival' ? 'arriving' : status
                        const style = getStatusStyle(visualStatus)
                        const capacity = table.capacity || 4
                        
                        return (
                          <div 
                            key={table.id}
                            onClick={() => setSelectedTable(table)}
                            style={{ position: 'relative', width: '120px', height: '120px', cursor: 'pointer' }}>
                            
                            {/* Plus Chair Layout - Rendered based on capacity */}
                            {capacity >= 1 && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: `1px solid var(--chair-border)` }} />} {/* Top */}
                            {capacity >= 2 && <div style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: `1px solid var(--chair-border)` }} />} {/* Bottom */}
                            {capacity >= 3 && <div style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: `1px solid var(--chair-border)` }} />} {/* Left */}
                            {capacity >= 4 && <div style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: `1px solid var(--chair-border)` }} />} {/* Right */}

                            {/* The Table */}
                            <div style={{ 
                              width: '100%', 
                              height: '100%', 
                              backgroundColor: 'var(--table-circle-bg)', 
                              borderRadius: '16px', 
                              border: `2.5px solid ${status === 'available' ? 'var(--table-circle-border)' : style.color}`,
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              position: 'relative',
                              zIndex: 10,
                              boxShadow: 'var(--shadow-md)',
                              transition: 'all 0.3s'
                            }}>
                              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{table.name || `T-${table.tableNumber}`}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                <Users size={12} color="var(--text-tertiary)" />
                                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{capacity}</span>
                              </div>
                              
                              {visualStatus !== 'available' ? (
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
                                  {visualStatus === 'arriving' ? 'ARRIVING' : visualStatus}
                                </div>
                              ) : nextReservationTime ? (
                                <div style={{ 
                                  position: 'absolute', 
                                  bottom: '-6px', 
                                  backgroundColor: 'var(--bg-tertiary)', 
                                  color: 'var(--text-secondary)', 
                                  border: `1px solid var(--border-primary)`,
                                  fontSize: '0.55rem', 
                                  padding: '2px 8px', 
                                  borderRadius: '100px', 
                                  fontWeight: 700, 
                                  textTransform: 'uppercase'
                                }}>
                                  NEXT: {nextReservationTime}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {/* Unassigned Reservations in Table View */}
                {dbReservations.filter(r => !r.table?.id && !['completed', 'cancelled', 'no_show'].includes(r.status)).length > 0 && (
                  <div style={{ width: '100%', marginTop: '40px', paddingTop: '40px', borderTop: `2px dashed var(--border-primary)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 24px 0' }}>Unassigned Reservations</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
                      {dbReservations.filter(r => !r.table?.id && !['completed', 'cancelled', 'no_show'].includes(r.status)).map(res => (
                         <div 
                           key={res.id} 
                           onClick={() => setSelectedBooking(res)} 
                           style={{ backgroundColor: 'var(--bg-tertiary)', border: `1px dashed var(--border-secondary)`, padding: '16px 32px', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
                           onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-tertiary)'}
                           onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
                         >
                           <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{res.guestFirstName} {res.guestLastName}</span>
                           <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{res.partySize} Guests • {res.startTime?.slice(0, 5)}</span>
                           <span style={{ marginTop: '12px', fontSize: '0.625rem', fontWeight: 800, color: '#C2410C', backgroundColor: isDark ? 'rgba(194,65,12,0.15)' : '#FFF7ED', padding: '4px 10px', borderRadius: '100px', letterSpacing: '0.05em' }}>NEEDS TABLE</span>
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
                  <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)' }}>
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
                          backgroundColor: 'var(--bg-card)', 
                          padding: '20px 24px', 
                          borderRadius: '16px', 
                          border: `1px solid var(--border-primary)`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', width: '70px' }}>{res.startTime?.slice(0, 5)}</div>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: style.bg, color: style.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>
                            {res.guestFirstName?.[0]}{res.guestLastName?.[0]}
                          </div>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{res.guestFirstName} {res.guestLastName}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Table {res.table?.tableNumber || 'N/A'} • {res.partySize} Guests</div>
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
                      {activeTab === 'Timeline View' && (
              <div style={{ padding: '32px' }}>
                <div style={{ border: `1px solid var(--border-secondary)`, borderRadius: '16px', overflow: 'hidden', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-md)', transition: 'background-color 0.3s' }}>
                  
                  {/* Timeline Header */}
                  <div style={{ display: 'flex', backgroundColor: 'var(--calendar-header-bg)', borderBottom: `1px solid var(--border-secondary)` }}>
                    <div style={{ width: '160px', flexShrink: 0, borderRight: `1px solid var(--border-secondary)` }}></div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} style={{ flex: 1, position: 'relative', borderRight: `1px solid var(--border-secondary)` }}>
                          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {12 + i}
                          </div>
                          {/* Half-hour marker at the bottom center of the hour block */}
                          <div style={{ position: 'absolute', bottom: 0, left: '50%', width: '1px', height: '8px', backgroundColor: 'var(--border-secondary)' }} />
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
                    <div key={area} style={{ display: 'flex', borderBottom: areaIdx === arr.length - 1 ? 'none' : `1px solid var(--border-secondary)` }}>
                      
                      {/* Area Name Column (Vertical) */}
                      <div style={{ width: '60px', borderRight: `1px solid var(--border-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--calendar-header-bg)' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                          {area}
                        </span>
                      </div>

                      {/* Tables inside this Area */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {(tables as any[]).map((table, tIdx) => (
                          <div key={table.id} style={{ display: 'flex', minHeight: '60px', borderBottom: tIdx === (tables as any[]).length - 1 ? 'none' : `1px solid var(--border-secondary)` }}>
                            
                            {/* Table Number & Capacity */}
                            <div style={{ width: '100px', borderRight: `1px solid var(--border-secondary)`, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{table.name || table.tableNumber || '—'}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{table.capacity}</span>
                            </div>

                            {/* Timeline Grid (20 half-hour columns) */}
                            <div style={{ flex: 1, display: 'flex', position: 'relative', backgroundColor: 'var(--calendar-row-bg)' }}>
                              {Array.from({ length: 20 }).map((_, colIdx) => (
                                <div key={colIdx} style={{ flex: 1, borderRight: `1px solid var(--border-primary)` }} />
                              ))}

                              {/* Overlay Reservations — only active ones */}
                              {dbReservations.filter(r => r.table?.id === table.id && !['completed', 'cancelled', 'no_show'].includes(r.status)).map((r, rIdx) => {
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
                                const bgColor = isSeated ? '#2F5233' : (isConfirmed ? '#8C6B45' : (isDark ? '#1A2A2E' : '#111827'))

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
                  {dbReservations.filter(r => (!r.table?.id || !dbTables.some(t => t.id === r.table?.id)) && !['completed', 'cancelled', 'no_show'].includes(r.status)).length > 0 && (
                    <div style={{ display: 'flex', borderTop: `2px dashed var(--border-secondary)`, backgroundColor: 'var(--bg-tertiary)' }}>
                       <div style={{ width: '160px', borderRight: `1px solid var(--border-secondary)`, display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Unassigned</span>
                       </div>
                       <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: '60px' }}>
                          {Array.from({ length: 20 }).map((_, colIdx) => (
                            <div key={colIdx} style={{ flex: 1, borderRight: `1px solid var(--border-primary)` }} />
                          ))}
                          {dbReservations.filter(r => (!r.table?.id || !dbTables.some(t => t.id === r.table?.id)) && !['completed', 'cancelled', 'no_show'].includes(r.status)).map((r, rIdx) => {
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
                                    backgroundColor: 'var(--bg-card)', border: `1px dashed var(--border-secondary)`, color: 'var(--text-primary)',
                                    borderRadius: '8px', display: 'flex', alignItems: 'center',
                                    cursor: 'pointer', overflow: 'hidden', zIndex: 10
                                  }}>
                                  <div style={{ padding: '0 12px', height: '100%', borderRight: `1px dashed var(--border-secondary)`, display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', fontSize: '0.75rem', fontWeight: 700 }}>
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
            
            {activeTab === 'Calendar View' && (
              <div style={{ padding: '32px' }}>
                <div style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderRadius: '24px', 
                  padding: '32px',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-primary)'
                }}>
                  {/* Calendar Header Nav */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      ><ChevronLeft size={20} /></button>
                      <button 
                        onClick={() => { setCalendarMonth(new Date()); setSelectedDate(new Date().toISOString().split('T')[0]); }}
                        style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                      >Today</button>
                      <button 
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      ><ChevronRight size={20} /></button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', paddingBottom: '12px' }}>
                        {day}
                      </div>
                    ))}
                    
                    {(() => {
                      const year = calendarMonth.getFullYear();
                      const month = calendarMonth.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      
                      const cells = [];
                      for (let i = 0; i < firstDay; i++) {
                        cells.push(<div key={`empty-${i}`} style={{ opacity: 0.3 }} />);
                      }
                      
                      for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = new Date(year, month, d).toLocaleDateString('en-CA'); // YYYY-MM-DD local format
                        const isSelected = selectedDate === dateStr;
                        const isToday = new Date().toLocaleDateString('en-CA') === dateStr;
                        
                        cells.push(
                          <div 
                            key={d} 
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setActiveTab('Day View');
                            }}
                            style={{ 
                              aspectRatio: '1', 
                              backgroundColor: isSelected ? (isDark ? '#C99C63' : '#C99C63') : 'var(--bg-tertiary)',
                              border: `1px solid ${isSelected ? 'transparent' : 'var(--border-secondary)'}`,
                              borderRadius: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.2s',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.borderColor = isDark ? '#C99C63' : '#C99C63';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-secondary)';
                            }}
                          >
                            <span style={{ 
                              position: 'absolute', 
                              top: '8px', 
                              left: '12px', 
                              fontSize: '1.1rem', 
                              fontWeight: 700,
                              color: isSelected ? '#ffffff' : (isToday ? (isDark ? '#C99C63' : '#C99C63') : 'var(--text-primary)')
                            }}>
                              {d}
                            </span>
                            {/* Reservation count badge */}
                            {monthlyResCounts[dateStr] && (
                              <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '12px',
                                right: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <div style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: isSelected ? '#ffffff' : '#C99C63',
                                  flexShrink: 0,
                                }} />
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}>
                                  {monthlyResCounts[dateStr]} res
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reservation Detail Modal */}
      {(selectedBooking || selectedTable) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'var(--modal-backdrop)' }}>
          <div style={{ backgroundColor: 'var(--bg-modal)', borderRadius: '32px', width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', boxShadow: 'var(--shadow-lg)', border: `1px solid var(--border-primary)` }}>
            <button 
              onClick={() => { setSelectedBooking(null); setSelectedTable(null); }} 
              style={{ position: 'absolute', top: '32px', right: '32px', background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{selectedTable ? `Table ${selectedTable.name || selectedTable.tableNumber}` : `Reservation`}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
              {selectedTable ? `${selectedTable.capacity} Seats • Schedule for ${selectedDate}` : `${selectedBooking.partySize} Guests • ${selectedBooking.status.toUpperCase()}`}
            </p>

            {selectedTable && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', maxHeight: '400px', overflowY: 'auto' }}>
                {(() => {
                  const tableReservations = dbReservations.filter(r => r.table?.id === selectedTable.id && !['cancelled', 'no_show'].includes(r.status)).sort((a,b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                  
                  if (tableReservations.length === 0) {
                    return (
                      <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                        No reservations for this table today.
                      </div>
                    )
                  }

                  return tableReservations.map(res => (
                    <div key={res.id} style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '16px', padding: '20px', border: `1px solid var(--border-primary)` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{res.guestFirstName} {res.guestLastName}</span>
                        <span style={{ color: '#C99C63', fontWeight: 800 }}>{res.startTime?.slice(0, 5)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{res.partySize} Guests</p>
                        <span style={{ fontSize: '0.625rem', fontWeight: 800, color: getStatusStyle(res.status).color, backgroundColor: getStatusStyle(res.status).bg, padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>{res.status}</span>
                      </div>
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         {['pending', 'confirmed'].includes(res.status) && (
                           <div style={{ display: 'flex', gap: '8px' }}>
                             <button onClick={() => handleStatusUpdate(res.id, 'arriving')} style={{ flex: 1, padding: '10px', borderRadius: '12px', backgroundColor: isDark ? '#5EEA7A' : '#111827', color: isDark ? '#0B1517' : '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Mark Arriving</button>
                             <button onClick={() => handleStatusUpdate(res.id, 'no_show')} style={{ flex: 1, padding: '10px', borderRadius: '12px', backgroundColor: 'transparent', color: '#E05D5D', border: '1px solid #E05D5D', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>No-Show</button>
                           </div>
                         )}
                         {res.status === 'arriving' && (
                           <div style={{ display: 'flex', gap: '8px' }}>
                             <button onClick={() => handleStatusUpdate(res.id, 'seated')} style={{ flex: 1, padding: '10px', borderRadius: '12px', backgroundColor: '#6B9E78', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Seat Guests</button>
                             <button onClick={() => handleStatusUpdate(res.id, 'no_show')} style={{ flex: 1, padding: '10px', borderRadius: '12px', backgroundColor: 'transparent', color: '#E05D5D', border: '1px solid #E05D5D', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>No-Show</button>
                           </div>
                         )}
                         {res.status === 'seated' && (
                           <button onClick={() => handleStatusUpdate(res.id, 'completed')} style={{ width: '100%', padding: '10px', borderRadius: '12px', backgroundColor: isDark ? '#5EEA7A' : '#111827', color: isDark ? '#0B1517' : '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                             Clear Table — Mark Complete
                           </button>
                         )}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}

            {selectedBooking && !selectedTable && ( // Fallback for Unassigned reservations panel
              <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '24px', padding: '24px', marginBottom: '32px', border: `1px solid var(--border-primary)` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedBooking.guestFirstName} {selectedBooking.guestLastName}</span>
                  <span style={{ color: '#C99C63', fontWeight: 800 }}>{selectedBooking.startTime?.slice(0, 5)}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{selectedBooking.partySize} Person • Unassigned</p>
                
                {/* Table Re-assignment */}
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-secondary)' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                    Assign to Table
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      id="reassign-table-select"
                      defaultValue=""
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                      }}
                    >
                      <option value="" disabled>Select a table...</option>
                      {dbTables
                        .filter((t: any) => t.capacity >= (selectedBooking.partySize || 1))
                        .map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name || `Table #${t.tableNumber}`} (capacity: {t.capacity})
                          </option>
                        ))
                      }
                    </select>
                    <button
                      onClick={async () => {
                        const selectEl = document.getElementById('reassign-table-select') as HTMLSelectElement
                        const tableId = selectEl?.value
                        if (!tableId || !restaurantId) return
                        try {
                          await api.put(`/organizations/${restaurantId}/reservations/${selectedBooking.id}`, { tableId })
                          toast.success('Reservation assigned to table')
                          fetchData(selectedDate, restaurantId)
                          setSelectedBooking(null)
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || 'Failed to assign table')
                        }
                      }}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#C99C63',
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Assign
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {['pending', 'confirmed'].includes(selectedBooking.status) && (
                     <div style={{ display: 'flex', gap: '8px' }}>
                       <button onClick={() => handleStatusUpdate(selectedBooking.id, 'arriving')} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: isDark ? '#5EEA7A' : '#111827', color: isDark ? '#0B1517' : '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Mark Arriving</button>
                       <button onClick={() => handleStatusUpdate(selectedBooking.id, 'no_show')} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: 'transparent', color: '#E05D5D', border: '1px solid #E05D5D', fontWeight: 600, cursor: 'pointer' }}>No-Show</button>
                     </div>
                   )}
                </div>
              </div>
            )}

            {selectedTable && (
              <button 
                onClick={() => { setShowCreateModal(true); }}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: isDark ? '#5EEA7A' : '#111827', color: isDark ? '#0B1517' : '#ffffff', border: 'none', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                New Reservation for Table
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
      <PoweredByFooter theme={isDark ? 'dark' : 'light'} />
    </div>
  )
}
