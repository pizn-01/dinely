import { useState } from 'react'
import { Calendar, AlertCircle } from 'lucide-react'
import TimeSlotPicker from '../../components/TimeSlotPicker'
import GuestCounter from '../../components/GuestCounter'
import WaitingListModal from '../../components/WaitingListModal'
import type { ReservationData } from './ReservationWizard'

interface StepDateTimeProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
}

const TIME_SLOTS = [
  '17:00', '17:30', '18:00', '18:30', '19:00',
  '19:30', '20:00', '20:30', '21:00', '21:30',
]

export default function StepDateTime({ data, updateData }: StepDateTimeProps) {
  const [showWaitingList, setShowWaitingList] = useState(false)
  const fullyBooked = false // Toggle to show fully booked state
  const conflictSlots = ['20:30'] // Simulating a booked slot

  return (
    <div>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#4ade80', marginBottom: '16px', fontFamily: 'var(--font-sans)', marginTop: 0 }}>
        When would you like to dine?
      </h2>

      {fullyBooked && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-sans)' }}>All time slots are fully booked.</span>
          </div>
          <button
            onClick={() => setShowWaitingList(true)}
            className="btn-gold"
            style={{ padding: '8px 16px', fontSize: '0.875rem' }}
          >
            Join Waiting List
          </button>
        </div>
      )}

      {/* Date */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
          Date
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={data.date}
            onChange={(e) => updateData({ date: e.target.value })}
            className="input-dark"
            style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
          />
          <Calendar size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8b949e' }} />
        </div>
      </div>

      {/* Time Slots */}
      <div style={{ marginBottom: '32px' }}>
        <TimeSlotPicker
          slots={TIME_SLOTS}
          selectedSlot={data.time}
          onSelect={(slot) => updateData({ time: slot })}
          disabledSlots={conflictSlots}
          fullyBooked={fullyBooked}
        />
      </div>

      {/* Guest Counter */}
      <GuestCounter
        count={data.guests}
        onChange={(count) => updateData({ guests: count })}
      />

      <WaitingListModal
        isOpen={showWaitingList}
        onClose={() => setShowWaitingList(false)}
      />
    </div>
  )
}
