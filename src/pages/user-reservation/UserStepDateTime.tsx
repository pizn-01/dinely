import { useState, useEffect } from 'react'
import { Calendar, AlertCircle } from 'lucide-react'
import { api } from '../../services/api'
import type { ReservationData } from './UserReservationWizard'

interface UserStepDateTimeProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
  restaurantSlug: string
}

// Placeholder for UserTimeSlotPicker - assuming it will be defined or imported elsewhere
// For the purpose of this edit, we'll include a basic version to make the code syntactically correct.
// In a real scenario, this would be a separate component.
interface UserTimeSlotPickerProps {
  slots: string[]
  selectedSlot: string | undefined
  onSelect: (slot: string) => void
  disabledSlots: string[]
  fullyBooked: boolean
}

const UserTimeSlotPicker = ({ slots, selectedSlot, onSelect, disabledSlots, fullyBooked }: UserTimeSlotPickerProps) => {
  const [hoveredDisabled, setHoveredDisabled] = useState<string | null>(null)

  return (
    <>
      <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
        Preferred Time
      </h3>
      <div className="res-time-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '12px'
      }}>
        {slots.map((slot) => {
          const isDisabled = disabledSlots.includes(slot) || fullyBooked
          const isSelected = selectedSlot === slot && !isDisabled
          const isConflict = disabledSlots.includes(slot) && !fullyBooked

          let backgroundColor = 'transparent';
          let borderColor = '#30363d';
          let fontColor = '#ffffff';

          if (isSelected) {
            backgroundColor = '#5E8B6A';
            borderColor = '#5E8B6A';
            fontColor = '#ffffff';
          } else if (isConflict) {
            backgroundColor = 'transparent';
            borderColor = 'rgba(239, 68, 68, 0.5)';
            fontColor = '#f87171';
          } else if (isDisabled) {
            backgroundColor = 'transparent';
            borderColor = '#1e2d30';
            fontColor = '#4a5568';
          }

          return (
            <div key={slot} style={{ position: 'relative' }}>
              <button
                onClick={() => !isDisabled && onSelect(slot)}
                onMouseEnter={() => isConflict && setHoveredDisabled(slot)}
                onMouseLeave={() => setHoveredDisabled(null)}
                disabled={isDisabled}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: `1px solid ${borderColor}`,
                  backgroundColor: backgroundColor,
                  color: fontColor,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {/* Icons removed as per original instruction's implied removal */}
                {slot}
                {isConflict && <AlertCircle size={12} />}
              </button>
              {hoveredDisabled === slot && isConflict && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  marginTop: '4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 10,
                  backgroundColor: '#eab308',
                  color: '#0d1117',
                  fontSize: '0.75rem',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  whiteSpace: 'nowrap',
                  animation: 'fadeIn 0.2s ease-in-out'
                }}>
                  This time slot has just been booked by another guest.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}


export default function UserStepDateTime({ data, updateData, restaurantSlug }: UserStepDateTimeProps) {
  const [showWaitingList, setShowWaitingList] = useState(false)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [conflictSlots, setConflictSlots] = useState<string[]>([])
  const [fullyBooked, setFullyBooked] = useState(false)
  const [isClosed, setIsClosed] = useState(false)
  const [hoveredDisabled, setHoveredDisabled] = useState<string | null>(null) // This was misplaced in the instruction, moved here.

  useEffect(() => {
    const fetchSlots = async () => {
      if (!data.date || !data.guests) return
      try {
        const formattedDate = data.date.includes('/')
          ? data.date.split('/').reverse().join('-')
          : data.date;

        const res = await api.get(`/public/${restaurantSlug}/slots`, {
          params: { date: formattedDate, partySize: data.guests }
        })
        if (res.data?.success) {
          const { allSlots, availableSlots, isClosed: resIsClosed } = res.data.data
          setIsClosed(resIsClosed || false)
          setTimeSlots(allSlots || [])
          const conflicts = (allSlots || []).filter((slot: string) => !(availableSlots || []).includes(slot))
          setConflictSlots(conflicts)
          setFullyBooked((availableSlots || []).length === 0 && (allSlots || []).length > 0)
          
          // Clear selected time if the day is closed or the previously selected slot is now conflicted
          if (resIsClosed && data.time) {
            updateData({ time: '' })
          } else if (data.time && conflicts.includes(data.time)) {
             updateData({ time: '' })
          }
        }
      } catch (error) {
        console.error('Failed to fetch slots:', error)
      }
    }
    fetchSlots()
  }, [data.date, data.guests, restaurantSlug]) // Time slots only depend on date, guests, and restaurant.

  const presets = [2, 4, 6, 8]

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '24px', fontFamily: 'Inter, system-ui, sans-serif', marginTop: 0 }}>
        When would you like to dine?
      </h2>

      {fullyBooked && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>All time slots are fully booked.</span>
          </div>
          <button
            onClick={() => setShowWaitingList(true)}
            style={{
              padding: '8px 16px',
              fontSize: '0.875rem',
              backgroundColor: '#C99C63',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Join Waiting List
          </button>
        </div>
      )}

      {/* Date */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
          Date (DD/MM/YYYY)
        </label>
        <div style={{ position: 'relative' }}>
          {/* We capture the date directly from a true type="date" native picker */}
          <input
            type="date"
            value={(() => {
              // Convert DD/MM/YYYY fallback into YYYY-MM-DD for native input
              if (data.date.includes('/')) {
                const [d, m, y] = data.date.split('/')
                return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
              }
              return data.date
            })()}
            onChange={(e) => {
              const val = e.target.value
              if (val) {
                // Keep the state in standard YYYY-MM-DD so that input[type="date"] functions natively.
                // The submit flow will handle YYYY-MM-DD properly. 
                updateData({ date: val })
              }
            }}
            style={{ 
              padding: '12px 16px', 
              width: '100%', 
              boxSizing: 'border-box',
              backgroundColor: 'transparent',
              border: '1px solid #30363d',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '1rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              outline: 'none',
              cursor: 'pointer' // Helps on desktop to trigger native picker
            }}
          />
        </div>
      </div>

      {/* Time Slots */}
      <div style={{ marginBottom: '32px' }}>
        {isClosed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            color: '#f87171'
          }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              The restaurant is closed on this date.
            </span>
          </div>
        ) : timeSlots.length === 0 ? (
          <p style={{ color: '#dbab70', fontSize: '0.875rem' }}>Loading time slots...</p>
        ) : (
          <UserTimeSlotPicker
            slots={timeSlots}
            selectedSlot={data.time}
            onSelect={(slot) => updateData({ time: slot })}
            disabledSlots={conflictSlots}
            fullyBooked={fullyBooked}
          />
        )}
      </div>

      {/* Guest Counter */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '16px' }}>
          How many people will be dining?
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginTop: '32px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#8b949e', opacity: 0.7 }}>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', margin: '16px 0' }}>
            <button
              onClick={() => updateData({ guests: Math.max(1, data.guests - 1) })}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '9999px',
                backgroundColor: '#5E8B6A',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontSize: '1.5rem',
                fontWeight: 700
              }}
            >
              −
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '80px' }}>
              <span style={{
                color: '#ffffff',
                fontSize: '3rem',
                fontWeight: 500,
                lineHeight: 1
              }}>
                {data.guests}
              </span>
              <span style={{ color: '#8b949e', fontSize: '1.125rem' }}>Guests</span>
            </div>

            <button
              onClick={() => updateData({ guests: Math.min(20, data.guests + 1) })}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '9999px',
                backgroundColor: '#5E8B6A',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                fontSize: '1.5rem',
                fontWeight: 700
              }}
            >
              +
            </button>
          </div>

          <div className="res-guest-presets" style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {presets.map((preset) => {
              const isSelected = data.guests === preset;
              return (
                <button
                  key={preset}
                  onClick={() => updateData({ guests: preset })}
                  style={{
                    width: '80px',
                    padding: '10px 0',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    fontWeight: 500,
                    border: isSelected ? '1px solid #5E8B6A' : '1px solid #30363d',
                    backgroundColor: isSelected ? '#5E8B6A' : 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'Inter, system-ui, sans-serif'
                  }}
                >
                  {preset}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
