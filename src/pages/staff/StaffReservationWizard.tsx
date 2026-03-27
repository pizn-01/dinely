import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import { X, Calendar, Clock, Users, ChevronRight, ChevronLeft, Check } from 'lucide-react'

interface StaffReservationWizardProps {
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
}

export interface ReservationData {
  date: string
  time: string
  guests: number
  tableId: string | null
  tableName: string
  tableCapacity: number
  tableLocation: string
  firstName: string
  lastName: string
  email: string
  phone: string
  specialRequest: string
}

const initialData: ReservationData = {
  date: new Date().toISOString().split('T')[0],
  time: '18:30',
  guests: 2,
  tableId: null,
  tableName: '',
  tableCapacity: 0,
  tableLocation: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  specialRequest: '',
}

const TOTAL_STEPS = 4

export default function StaffReservationWizard({ restaurantId, onClose, onSuccess }: StaffReservationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<ReservationData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Table Selection State
  const [availableTables, setAvailableTables] = useState<any[]>([])
  const [loadingTables, setLoadingTables] = useState(false)

  const updateData = useCallback((updates: Partial<ReservationData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const fetchAvailableTables = async () => {
    setLoadingTables(true)
    setError(null)
    try {
      const { data: res } = await api.get(`/organizations/${restaurantId}/tables/availability`, {
        params: {
          date: data.date,
          time: data.time,
          partySize: data.guests
        }
      })
      setAvailableTables(res.data || [])
    } catch (err) {
      console.error('Failed to fetch tables:', err)
      setError('Failed to fetch available tables.')
    } finally {
      setLoadingTables(false)
    }
  }

  const handleNext = async () => {
    if (currentStep === 1) {
      // Before moving to step 2, fetch tables
      await fetchAvailableTables()
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!data.tableId) {
        setError('Please select a table to continue.')
        return
      }
      setError(null)
      setCurrentStep(3)
    } else if (currentStep === 3) {
      if (!data.firstName || !data.lastName) {
        setError('First and Last name are required.')
        return
      }
      setError(null)
      setCurrentStep(4)
    } else if (currentStep === 4) {
      // Submit reservation
      submitReservation()
    }
  }

  const submitReservation = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const payload = {
        reservationDate: data.date,
        startTime: data.time,
        partySize: data.guests,
        tableId: data.tableId || null,
        guestFirstName: data.firstName,
        guestLastName: data.lastName,
        guestEmail: data.email,
        guestPhone: data.phone,
        specialRequests: data.specialRequest,
        source: 'pos'
      }

      await api.post(`/organizations/${restaurantId}/reservations`, payload)
      onSuccess()
    } catch (err: any) {
      console.error('Failed to create reservation:', err)
      setError(err.response?.data?.error || 'Failed to create reservation.')
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Date</label>
        <div style={{ position: 'relative' }}>
          <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input
            type="date"
            value={data.date}
            onChange={(e) => updateData({ date: e.target.value })}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Time</label>
        <div style={{ position: 'relative' }}>
          <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input
            type="time"
            value={data.time}
            onChange={(e) => updateData({ time: e.target.value })}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Party Size</label>
        <div style={{ position: 'relative' }}>
          <Users size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input
            type="number"
            min={1}
            max={20}
            value={data.guests}
            onChange={(e) => updateData({ guests: parseInt(e.target.value) || 1 })}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem' }}
          />
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => {
    if (loadingTables) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading available tables...</div>
    if (availableTables.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: '#DC2626' }}>No tables available for {data.guests} guests at {data.time}.</div>

    const tablesByArea = availableTables.reduce((acc, table) => {
      const areaName = table.floor_areas?.name || 'Main Area'
      if (!acc[areaName]) acc[areaName] = []
      acc[areaName].push(table)
      return acc
    }, {} as Record<string, any[]>)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
        {Object.entries(tablesByArea).map(([area, tables]) => (
          <div key={area}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6B7280', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{area}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {(tables as any[]).map(table => (
                <div
                  key={table.id}
                  onClick={() => updateData({ tableId: table.id, tableName: table.table_number || table.name || '', tableCapacity: table.capacity, tableLocation: area })}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${data.tableId === table.id ? '#111827' : '#E5E7EB'}`,
                    backgroundColor: data.tableId === table.id ? '#F9FAFB' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>T-{table.table_number || table.name?.split(' ')[1] || '0'}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '4px' }}>Up to {table.capacity} Guests</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderStep3 = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px' }}>Guest Information</h4>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>First Name *</label>
        <input type="text" value={data.firstName} onChange={e => updateData({ firstName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem' }} placeholder="John" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Last Name *</label>
        <input type="text" value={data.lastName} onChange={e => updateData({ lastName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem' }} placeholder="Doe" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Email</label>
        <input type="email" value={data.email} onChange={e => updateData({ email: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem' }} placeholder="john@example.com" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Phone</label>
        <input type="tel" value={data.phone} onChange={e => updateData({ phone: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem' }} placeholder="+44 7700 900000" />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>Special Requests</label>
        <textarea value={data.specialRequest} onChange={e => updateData({ specialRequest: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem', minHeight: '80px', resize: 'vertical' }} placeholder="Allergies, high chair required, etc." />
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ backgroundColor: '#F9FAFB', borderRadius: '12px', padding: '24px', border: '1px solid #E5E7EB' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 16px 0' }}>Booking Summary</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: '#6B7280', display: 'block' }}>Date & Time</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{new Date(data.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {data.time}</span>
          </div>
          <div>
            <span style={{ color: '#6B7280', display: 'block' }}>Guests</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{data.guests} People</span>
          </div>
          <div>
            <span style={{ color: '#6B7280', display: 'block' }}>Table</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>T-{data.tableName} ({data.tableLocation})</span>
          </div>
          <div>
            <span style={{ color: '#6B7280', display: 'block' }}>Guest</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{data.firstName} {data.lastName}</span>
          </div>
        </div>
      </div>
    </div>
  )

  const stepTitles = [
    'Date & Time',
    'Select Table',
    'Guest Details',
    'Review & Confirm'
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
      <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '600px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Create Reservation</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#6B7280' }}>Step {currentStep} of {TOTAL_STEPS}: {stepTitles[currentStep - 1]}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '8px', borderRadius: '50%' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#F3F4F6'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '4px', backgroundColor: '#F3F4F6' }}>
          <div style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%`, height: '100%', backgroundColor: '#111827', transition: 'width 0.3s ease' }} />
        </div>

        {/* Content */}
        <div style={{ padding: '32px', overflowY: 'auto' }}>
          {error && (
            <div style={{ backgroundColor: '#FEF2F2', color: '#DC2626', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.875rem', fontWeight: 500 }}>
              {error}
            </div>
          )}
          
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid #F3F4F6', backgroundColor: '#FAFAFA', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {currentStep > 1 ? (
            <button 
              onClick={() => setCurrentStep(prev => prev - 1)}
              style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid #D1D5DB', borderRadius: '10px', color: '#374151', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div></div>}
          
          <button 
            onClick={handleNext}
            disabled={loading || loadingTables}
            style={{ padding: '10px 24px', backgroundColor: '#111827', border: 'none', borderRadius: '10px', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: (loading || loadingTables) ? 'not-allowed' : 'pointer', opacity: (loading || loadingTables) ? 0.7 : 1 }}
          >
            {loading ? 'Processing...' : currentStep === TOTAL_STEPS ? 'Confirm Booking' : 'Next Step'}
            {currentStep < TOTAL_STEPS && <ChevronRight size={16} />}
          </button>
        </div>

      </div>
    </div>
  )
}
