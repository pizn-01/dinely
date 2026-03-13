import { AlertCircle, Clock } from 'lucide-react'
import { useState } from 'react'

interface TimeSlotPickerProps {
  slots: string[]
  selectedSlot: string | null
  onSelect: (slot: string) => void
  disabledSlots?: string[]
  fullyBooked?: boolean
}

export default function TimeSlotPicker({
  slots,
  selectedSlot,
  onSelect,
  disabledSlots = [],
  fullyBooked = false,
}: TimeSlotPickerProps) {
  const [hoveredDisabled, setHoveredDisabled] = useState<string | null>(null)

  return (
    <div style={{ marginTop: '16px', marginBottom: '16px' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#eab308', marginBottom: '12px', fontFamily: 'var(--font-sans)' }}>
        Preferred Time
      </h3>
      <div style={{
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
            backgroundColor = '#0B1517';
            borderColor = '#4ade80';
            fontColor = '#4ade80';
          } else if (isConflict) {
            backgroundColor = 'transparent';
            borderColor = 'rgba(239, 68, 68, 0.5)';
            fontColor = '#f87171';
          } else if (isDisabled) {
            backgroundColor = 'transparent';
            borderColor = 'rgba(48, 54, 61, 0.3)';
            fontColor = 'rgba(139, 148, 158, 0.4)';
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
                  cursor: isDisabled ? (isConflict ? 'not-allowed' : 'not-allowed') : 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)',
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
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
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
  )
}
