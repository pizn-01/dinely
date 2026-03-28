import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../services/api'
import { useRealtimeReservations } from '../../../hooks/useRealtimeReservations'
import { Users, MapPin, AlertCircle, CalendarRange } from 'lucide-react'

interface ReservationTabProps {
  theme: 'dark' | 'light'
  orgId: string
  serverToday?: string
  openingTime?: string
  closingTime?: string
}

export default function ReservationTab({ theme, orgId, serverToday }: ReservationTabProps) {
  const isDark = theme === 'dark'
  const [tablesList, setTablesList] = useState<any[]>([])
  const [resList, setResList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const dateTarget = serverToday || new Date().toISOString().split('T')[0]
      // Fetch Tables
      const tablesRes = await api.get(`/organizations/${orgId}/tables`)
      setTablesList(tablesRes.data.data || [])

      // Fetch Today's Reservations
      const resRes = await api.get(`/organizations/${orgId}/reservations?limit=100&sortOrder=desc&date=${dateTarget}`)
      const fetchedRes = resRes.data.data || []
      setResList(fetchedRes)
    } catch (err) {
      console.error('Failed to load reservation data:', err)
      setError('Failed to load reservation data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [orgId, serverToday])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-time sync: instant refresh on any reservation event
  useRealtimeReservations(orgId, fetchData)

  const getTableStatus = (tableId: string | number) => {
    // Only consider active reservations — completed/cancelled/no_show free the table
    const terminalStatuses = ['completed', 'cancelled', 'no_show']
    const tableRes = resList.filter(r => (r.tableId === tableId || String(r.tableId) === String(tableId)) && !terminalStatuses.includes(r.status))
    if (tableRes.length === 0) return 'available'

    const now = new Date()
    const currentH = now.getHours()
    const currentM = now.getMinutes()
    const currentTotalM = currentH * 60 + currentM

    for (const res of tableRes) {
      if (res.status === 'seated') return 'seated'
      if (res.status === 'arriving') return 'arriving'
      if (!res.startTime) continue

      const [startH, startM] = res.startTime.split(':').map(Number)
      const startTotalM = startH * 60 + startM
      // default duration 120 mins
      const duration = res.duration || 120
      const endTotalM = startTotalM + duration

      if (currentTotalM >= startTotalM && currentTotalM <= endTotalM) {
        return 'seated' // They should be seated by now
      } else if (startTotalM > currentTotalM && startTotalM - currentTotalM <= 60) {
        return 'arriving'
      }
    }
    return 'available'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arriving': return '#C99C63'
      case 'seated': return '#E05D5D'
      case 'available': return '#59A673'
      default: return '#8b949e'
    }
  }

  if (loading) {
    return (
      <div style={{
        backgroundColor: isDark ? '#161B22' : '#ffffff',
        padding: '32px',
        color: isDark ? '#ffffff' : '#1f2937',
        textAlign: 'center',
        borderRadius: '8px'
      }}>
        Loading reservation data...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: isDark ? '#161B22' : '#ffffff',
        padding: '32px',
        color: '#ff6b6b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        borderRadius: '8px'
      }}>
        <AlertCircle size={20} />
        {error}
      </div>
    )
  }

  const todayDateObj = new Date(serverToday || new Date().toISOString())
  const dateStr = todayDateObj.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })

  // Calculations for cards
  const tableStatuses = tablesList.map(t => getTableStatus(t.id))
  const availableCount = tableStatuses.filter(s => s === 'available').length
  const bgColor = isDark ? '#0B1517' : '#f4f6f8'
  const cardBgColor = isDark ? '#161B22' : '#ffffff'
  const textColor = isDark ? '#ffffff' : '#111827'
  const mutedTextColor = isDark ? '#8b949e' : '#6b7280'
  const borderColor = isDark ? '#30363d' : '#e5e7eb'

  return (
    <div style={{ backgroundColor: bgColor, borderRadius: '8px', padding: '24px' }}>

      {/* Main Container */}
      <div style={{
        backgroundColor: cardBgColor,
        borderRadius: '12px',
        border: `1px solid ${borderColor}`,
        overflow: 'hidden'
      }}>

        {/* Content Region */}
        <div style={{ padding: '24px' }}>
          
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '24px'
          }}>
            <div>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: 600, 
                margin: '0 0 4px 0', 
                color: textColor 
              }}>
                {dateStr}
              </h3>
              <p style={{ 
                color: mutedTextColor, 
                fontSize: '0.875rem', 
                margin: 0 
              }}>
                at {timeStr}
              </p>
            </div>
            <p style={{ 
              fontSize: '0.875rem', 
              color: textColor 
            }}>
              <span style={{ fontWeight: 600 }}>{availableCount}</span> tables available
            </p>
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}>
              {tablesList.map(table => {
                const status = getTableStatus(table.id)
                const areaName = table.floor_area?.name || 'Unassigned'
                return (
                  <div key={table.id} style={{
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <div style={{
                      width: '10px',
                      height: '10px',
                      backgroundColor: getStatusColor(status),
                      borderRadius: '50%',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '24px' }}>
                      
                      <h4 style={{ 
                        fontSize: '0.875rem', 
                        fontWeight: 600, 
                        margin: 0, 
                        color: textColor,
                        width: '60px' // fixed width to align
                      }}>
                        {table.name}
                      </h4>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: mutedTextColor }}>
                        <Users size={14} />
                        <span style={{ fontSize: '0.8125rem' }}>Capacity: {table.capacity} seats</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: mutedTextColor }}>
                        <MapPin size={14} />
                        <span style={{ fontSize: '0.8125rem' }}>{areaName}</span>
                      </div>

                    </div>
                  </div>
                )
              })}
            </div>

        </div>
      </div>
    </div>
  )
}
