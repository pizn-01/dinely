import { useState, useEffect } from 'react'
import { Users, MapPin, Loader2 } from 'lucide-react'
import { api } from '../../services/api'
import type { ReservationData } from './UserReservationWizard'

interface Table {
  id: string
  name: string
  capacity: number
  area: { id: string; name: string } | null
  reservationFee?: number
}

interface UserStepTableSelectProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
  restaurantSlug: string
}

export default function UserStepTableSelect({ data, updateData, restaurantSlug }: UserStepTableSelectProps) {
  const [loading, setLoading] = useState(true)
  const [groupedTables, setGroupedTables] = useState<Record<string, Table[]>>({})

  useEffect(() => {
    const fetchTables = async () => {
      // Need date + time to check availability
      if (!data.date || !data.time) return
      
      try {
        setLoading(true)
        // Format date to YYYY-MM-DD if needed
        const formattedDate = data.date.includes('/')
          ? data.date.split('/').reverse().join('-')
          : data.date
        
        const res = await api.get(`/public/${restaurantSlug}/availability`, {
          params: {
            date: formattedDate,
            time: data.time,
            partySize: data.guests
          }
        })
        if (res.data?.success) {
          const rawTables: Table[] = res.data.data
          const groups: Record<string, Table[]> = {}
          
          rawTables.forEach(table => {
            const areaName = table.area?.name || 'Common Area'
            if (!groups[areaName]) groups[areaName] = []
            groups[areaName].push(table)
          })
          
          setGroupedTables(groups)
        }
      } catch (error) {
        console.error('Failed to fetch available tables:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTables()
  }, [restaurantSlug, data.date, data.time, data.guests])

  const handleSelect = (table: Table) => {
    updateData({
      tableId: table.id,
      tableName: table.name,
      tableCapacity: table.capacity,
      tableLocation: table.area?.name || 'General',
      tableFee: table.reservationFee || 0,
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#C99C63' }} />
        <p style={{ color: '#8b949e' }}>Loading available tables...</p>
      </div>
    )
  }

  const hasTables = Object.keys(groupedTables).length > 0

  if (!hasTables) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#8b949e' }}>No tables currently available for selection.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px', marginTop: 0 }}>
        Choose Your Table
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '32px', marginTop: 0 }}>
        Select from our available tables
      </p>

      {Object.entries(groupedTables).map(([area, areaTables]) => (
        <div key={area} style={{ marginBottom: '24px' }}>
          {/* Area Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#30363d' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#C99C63' }}>{area}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#30363d' }} />
          </div>

          {/* Table Grid */}
          <div className="res-table-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '16px'
          }}>
            {areaTables.map((table) => {
              const isSelected = data.tableId === table.id
              return (
                <button
                  key={table.id}
                  onClick={() => handleSelect(table)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '20px',
                    borderRadius: '12px',
                    border: isSelected ? '1px solid #5E8B6A' : '1px solid #30363d',
                    backgroundColor: isSelected ? 'rgba(94, 139, 106, 0.15)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'block',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <img src="/Group 1597888803.svg" alt="Table" width={20} height={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0 }}>
                        {table.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '0.75rem', color: '#8b949e' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} />
                          Capacity: {table.capacity} seats
                        </span>
                        {table.area && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} />
                            {table.area.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
