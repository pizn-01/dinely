import { useState } from 'react'
import { Calendar, AlertCircle, Clock } from 'lucide-react'
import type { ReservationData } from './UserReservationWizard'

interface UserStepDateTimeProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
}

const TIME_SLOTS = [
  '17:00', '17:30', '18:00', '18:30', '19:00',
  '19:30', '20:00', '20:30', '21:00', '21:30',
]

export default function UserStepDateTime({ data, updateData }: UserStepDateTimeProps) {
  const [showWaitingList, setShowWaitingList] = useState(false)
  const fullyBooked = false
  const conflictSlots = ['20:30']
  const [hoveredDisabled, setHoveredDisabled] = useState<string | null>(null)

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
          Date
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={data.date}
            onChange={(e) => updateData({ date: e.target.value })}
            style={{ 
              padding: '12px 16px', 
              paddingRight: '40px', 
              width: '100%', 
              boxSizing: 'border-box',
              backgroundColor: 'transparent',
              border: '1px solid #30363d',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '1rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              outline: 'none'
            }}
          />
          <Calendar size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
        </div>
      </div>

      {/* Time Slots */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>
          Preferred Time
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px'
        }}>
          {TIME_SLOTS.map((slot) => {
            const isDisabled = conflictSlots.includes(slot) || fullyBooked
            const isSelected = data.time === slot && !isDisabled
            const isConflict = conflictSlots.includes(slot) && !fullyBooked

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
                  onClick={() => !isDisabled && updateData({ time: slot })}
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
                  {isConflict && <AlertCircle size={12} />}
                  {isConflict && <Clock size={12} />}
                  {!isConflict && isSelected && <Clock size={12} />}
                  {slot}
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

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
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
