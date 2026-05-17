import { useState, useEffect } from 'react'
import { Users, Loader2 } from 'lucide-react'
import { api } from '../../services/api'
import type { ReservationData } from './UserReservationWizard'

interface Table {
  id: string
  name: string
  capacity: number
  area: { id: string; name: string } | null
  reservationFee?: number
  isPremium: boolean
  premiumPrice: number
}

interface UserStepTableSelectProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
  restaurantSlug: string
}

export default function UserStepTableSelect({ data, updateData, restaurantSlug }: UserStepTableSelectProps) {
  const [loading, setLoading] = useState(true)
  const [standardTables, setStandardTables] = useState<Table[]>([])

  useEffect(() => {
    const fetchTables = async () => {
      if (!data.date || !data.time) return

      try {
        setLoading(true)
        const formattedDate = data.date.includes('/')
          ? data.date.split('/').reverse().join('-')
          : data.date

        const res = await api.get(`/public/${restaurantSlug}/availability`, {
          params: { date: formattedDate, time: data.time, partySize: data.guests }
        })

        if (res.data?.success) {
          const allTables: Table[] = res.data.data || []
          const standard = allTables.filter(t => !t.isPremium)
          setStandardTables(standard)

          // Auto-select the smallest available table that fits the party
          const bestFit = standard.find(t => t.capacity >= data.guests) || standard[0]
          if (bestFit) {
            updateData({
              tableId: bestFit.id,
              tableName: bestFit.name,
              tableCapacity: bestFit.capacity,
              tableLocation: bestFit.area?.name || 'General',
              tableFee: 0,
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch available tables:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTables()
  }, [restaurantSlug, data.date, data.time, data.guests])

  const getCapacityRange = (tables: Table[]) => {
    if (tables.length === 0) return ''
    const caps = tables.map(t => t.capacity)
    const min = Math.min(...caps)
    const max = Math.max(...caps)
    return min === max ? `${min} seats` : `${min}–${max} seats`
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#C99C63' }} />
        <p style={{ color: '#8b949e' }}>Checking availability...</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px', marginTop: 0 }}>
        Table Availability
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '32px', marginTop: 0 }}>
        Your table will be assigned from available seating for your party
      </p>

      <div style={{ maxWidth: '420px', margin: '0 auto' }}>
        {standardTables.length > 0 ? (
          <div style={{
            padding: '28px 24px',
            borderRadius: '16px',
            border: '1.5px solid #C99C63',
            backgroundColor: 'rgba(201,156,99,0.06)',
            boxShadow: '0 0 0 3px rgba(201,156,99,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src="/Group 1597888803.svg" alt="Table" width={24} height={16} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem', margin: '0 0 6px' }}>
                  Standard Table
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#8b949e', margin: '0 0 14px', lineHeight: 1.5 }}>
                  Comfortable seating in our main dining area. No deposit required.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 500,
                    backgroundColor: 'rgba(107,158,120,0.15)', color: '#6B9E78',
                    padding: '3px 10px', borderRadius: '999px'
                  }}>
                    {standardTables.length} {standardTables.length === 1 ? 'table' : 'tables'} available
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} />
                    {getCapacityRange(standardTables)}
                  </span>
                </div>
              </div>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                backgroundColor: '#C99C63', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                  <path d="M1 4L4 7L10 1" stroke="#0B1517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            padding: '40px 24px', borderRadius: '16px',
            border: '1px solid #21262d', backgroundColor: 'rgba(255,255,255,0.02)',
            textAlign: 'center',
          }}>
            <p style={{ color: '#8b949e', margin: 0 }}>
              No tables available for this time slot. Please go back and try a different time.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
