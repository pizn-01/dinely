import { useState, useEffect } from 'react'
import { Calendar, AlertCircle } from 'lucide-react'
import { api } from '../../services/api'
import TimeSlotPicker from '../../components/TimeSlotPicker'
import GuestCounter from '../../components/GuestCounter'
import WaitingListModal from '../../components/WaitingListModal'
import type { ReservationData } from './ReservationWizard'

interface StepDateTimeProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
}

export default function StepDateTime({ data, updateData }: StepDateTimeProps) {
  const [showWaitingList, setShowWaitingList] = useState(false)
  const [timeSlots, setTimeSlots] = useState<string[]>([])
  const [conflictSlots, setConflictSlots] = useState<string[]>([])
  const [fullyBooked, setFullyBooked] = useState(false)
  const [isClosed, setIsClosed] = useState(false)

  useEffect(() => {
    const fetchSlots = async () => {
      if (!data.date || !data.guests) return
      try {
        const formattedDate = data.date.includes('/')
          ? data.date.split('/').reverse().join('-')
          : data.date;

        const res = await api.get(`/public/default-restaurant/slots`, {
          params: { date: formattedDate, partySize: data.guests }
        })
        if (res.data?.success) {
          const { allSlots, availableSlots, isClosed: resIsClosed } = res.data.data
          setIsClosed(resIsClosed || false)
          setTimeSlots(allSlots || [])
          const conflicts = (allSlots || []).filter((slot: string) => !(availableSlots || []).includes(slot))
          setConflictSlots(conflicts)
          setFullyBooked((availableSlots || []).length === 0 && (allSlots || []).length > 0)
          
          if (data.time && conflicts.includes(data.time)) {
             updateData({ time: '' })
          }
        }
      } catch (error) {
        console.error('Failed to fetch slots:', error)
      }
    }
    fetchSlots()
  }, [data.date, data.guests])

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', marginBottom: '24px', fontFamily: 'var(--font-sans)', marginTop: 0 }}>
        When would you like to dine?
      </h2>

      {fullyBooked && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>All time slots are fully booked.</span>
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
      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
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
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              color: '#111827',
              fontSize: '1rem',
              fontFamily: 'var(--font-sans)'
            }}
          />
          <Calendar size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
        </div>
      </div>

      {/* Time Slots */}
      <div style={{ marginBottom: '32px' }}>
        {isClosed ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            color: '#dc2626'
          }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
              The restaurant is closed on this date.
            </span>
          </div>
        ) : timeSlots.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Loading time slots...</p>
        ) : (
          <TimeSlotPicker
            slots={timeSlots}
            selectedSlot={data.time}
            onSelect={(slot) => updateData({ time: slot })}
            disabledSlots={conflictSlots}
            fullyBooked={fullyBooked}
          />
        )}
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
