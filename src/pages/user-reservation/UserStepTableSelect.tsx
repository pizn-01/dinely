import { useState, useEffect } from 'react'
import { Users, Loader2, Crown, Star } from 'lucide-react'
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
  const [allTables, setAllTables] = useState<Table[]>([])

  useEffect(() => {
    const fetchTables = async () => {
      if (!data.date || !data.time) return

      try {
        setLoading(true)
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
          setAllTables(res.data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch available tables:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchTables()
  }, [restaurantSlug, data.date, data.time, data.guests])

  const standardTables = allTables.filter(t => !t.isPremium)
  const premiumTables = allTables.filter(t => t.isPremium)

  const selectedType = data.tableId
    ? allTables.find(t => t.id === data.tableId)?.isPremium ? 'premium' : 'standard'
    : null

  const handleSelectStandard = () => {
    if (standardTables.length === 0) return
    const t = standardTables[0]
    updateData({
      tableId: t.id,
      tableName: t.name,
      tableCapacity: t.capacity,
      tableLocation: t.area?.name || 'General',
      tableFee: 0,
    })
  }

  const handleSelectPremium = () => {
    if (premiumTables.length === 0) return
    const t = premiumTables[0]
    updateData({
      tableId: t.id,
      tableName: t.name,
      tableCapacity: t.capacity,
      tableLocation: t.area?.name || 'General',
      tableFee: t.premiumPrice || t.reservationFee || 0,
    })
  }

  const getCapacityRange = (tables: Table[]) => {
    if (tables.length === 0) return ''
    const caps = tables.map(t => t.capacity)
    const min = Math.min(...caps)
    const max = Math.max(...caps)
    return min === max ? `${min} seats` : `${min}–${max} seats`
  }

  const getMinPremiumPrice = () => {
    if (premiumTables.length === 0) return 0
    return Math.min(...premiumTables.map(t => t.premiumPrice || t.reservationFee || 0))
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#C99C63' }} />
        <p style={{ color: '#8b949e' }}>Checking availability...</p>
      </div>
    )
  }

  if (allTables.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#8b949e' }}>No tables available for this time slot. Please try a different time.</p>
      </div>
    )
  }

  const cardBase: React.CSSProperties = {
    width: '100%',
    textAlign: 'left',
    padding: '28px 24px',
    borderRadius: '16px',
    border: '1px solid #30363d',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'block',
    position: 'relative',
    overflow: 'hidden',
  }

  const cardSelected: React.CSSProperties = {
    border: '1.5px solid #C99C63',
    backgroundColor: 'rgba(201,156,99,0.08)',
    boxShadow: '0 0 0 3px rgba(201,156,99,0.12)',
  }

  const cardDisabled: React.CSSProperties = {
    opacity: 0.45,
    cursor: 'not-allowed',
    border: '1px solid #21262d',
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px', marginTop: 0 }}>
        Choose Table Type
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '32px', marginTop: 0 }}>
        Select the seating experience you prefer
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px' }} className="res-table-type-grid">

        {/* Standard Table Card */}
        <button
          onClick={handleSelectStandard}
          disabled={standardTables.length === 0}
          style={{
            ...cardBase,
            ...(selectedType === 'standard' ? cardSelected : {}),
            ...(standardTables.length === 0 ? cardDisabled : {}),
          }}
        >
          {selectedType === 'standard' && (
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: '#C99C63', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <path d="M1 4L4 7L10 1" stroke="#0B1517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px'
          }}>
            <img src="/Group 1597888803.svg" alt="Table" width={24} height={16} />
          </div>

          <h3 style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem', margin: '0 0 8px' }}>
            Standard Table
          </h3>

          <p style={{ fontSize: '0.8rem', color: '#8b949e', margin: '0 0 12px', lineHeight: 1.5 }}>
            Comfortable seating in our main dining area
          </p>

          {standardTables.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 500,
                backgroundColor: 'rgba(107,158,120,0.15)', color: '#6B9E78',
                padding: '3px 10px', borderRadius: '999px'
              }}>
                {standardTables.length} available
              </span>
              <span style={{ fontSize: '0.75rem', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} />
                {getCapacityRange(standardTables)}
              </span>
            </div>
          ) : (
            <span style={{
              fontSize: '0.75rem', fontWeight: 500,
              backgroundColor: 'rgba(139,148,158,0.1)', color: '#8b949e',
              padding: '3px 10px', borderRadius: '999px'
            }}>
              Not available for this time slot
            </span>
          )}
        </button>

        {/* Premium Table Card */}
        <button
          onClick={handleSelectPremium}
          disabled={premiumTables.length === 0}
          style={{
            ...cardBase,
            ...(selectedType === 'premium' ? cardSelected : {}),
            ...(premiumTables.length === 0 ? cardDisabled : {}),
          }}
        >
          {selectedType === 'premium' && (
            <div style={{
              position: 'absolute', top: '12px', right: '12px',
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: '#C99C63', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <path d="M1 4L4 7L10 1" stroke="#0B1517" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}

          {/* Subtle premium shimmer accent */}
          {premiumTables.length > 0 && (
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '80px', height: '80px',
              background: 'radial-gradient(circle at top right, rgba(201,156,99,0.12) 0%, transparent 70%)',
              borderRadius: '0 16px 0 0',
              pointerEvents: 'none',
            }} />
          )}

          <div style={{
            width: '48px', height: '48px', borderRadius: '12px',
            backgroundColor: premiumTables.length > 0 ? 'rgba(201,156,99,0.12)' : 'rgba(255,255,255,0.04)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '16px'
          }}>
            {premiumTables.length > 0
              ? <Crown size={22} style={{ color: '#C99C63' }} />
              : <Star size={22} style={{ color: '#555' }} />
            }
          </div>

          <h3 style={{ fontWeight: 700, color: '#ffffff', fontSize: '1rem', margin: '0 0 8px' }}>
            Premium Table
          </h3>

          <p style={{ fontSize: '0.8rem', color: '#8b949e', margin: '0 0 12px', lineHeight: 1.5 }}>
            Enhanced seating with exclusive positioning &amp; service
          </p>

          {premiumTables.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem', fontWeight: 500,
                backgroundColor: 'rgba(201,156,99,0.15)', color: '#C99C63',
                padding: '3px 10px', borderRadius: '999px'
              }}>
                From £{getMinPremiumPrice()}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#8b949e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} />
                {getCapacityRange(premiumTables)}
              </span>
            </div>
          ) : (
            <span style={{
              fontSize: '0.75rem', fontWeight: 500,
              backgroundColor: 'rgba(201,156,99,0.08)', color: '#9e7a44',
              padding: '3px 10px', borderRadius: '999px'
            }}>
              Not available for this time slot
            </span>
          )}
        </button>

      </div>

      {/* Mobile responsive override */}
      <style>{`
        @media (max-width: 540px) {
          .res-table-type-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
