import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import DarkProgressBar from '../../components/DarkProgressBar'
import UserStepDateTime from './UserStepDateTime'
import UserStepTableSelect from './UserStepTableSelect'
import UserStepContactInfo from './UserStepContactInfo'
import UserStepConfirmReview from './UserStepConfirmReview'

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
  paymentMethod: string | null
}

const initialData: ReservationData = {
  date: new Date().toLocaleDateString('en-CA'),
  time: '',
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
  paymentMethod: null,
}

const TOTAL_STEPS = 4

export default function UserReservationWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<ReservationData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateData = useCallback((updates: Partial<ReservationData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const nextStep = async () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
    } else {
      try {
        setLoading(true)
        setError(null)
        
        // Ensure date is in YYYY-MM-DD format
        const formattedDate = data.date.includes('/') 
          ? data.date.split('/').reverse().join('-') // Handle DD/MM/YYYY if it exists
          : data.date; // already YYYY-MM-DD
        
        const payload = {
          reservationDate: formattedDate,
          startTime: data.time || '17:30',
          partySize: data.guests,
          tableId: data.tableId || null,
          guestFirstName: data.firstName || 'Member',
          guestLastName: data.lastName || '',
          guestEmail: data.email || 'member@example.com',
          guestPhone: data.phone || '',
          specialRequests: data.specialRequest || '',
          source: 'website'
        }

        // Public reservation endpoint
        await api.post(`/public/${restaurantSlug}/reserve`, payload)
        
        navigate('/user-booking-confirmed', { state: data })
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to confirm reservation. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    } else {
      navigate('/welcome')
    }
  }

  const percentage = Math.round((currentStep / TOTAL_STEPS) * 100)
  const searchParams = new URLSearchParams(window.location.search)
  const restaurantSlug = searchParams.get('restaurant') || 'default-restaurant'

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <UserStepDateTime data={data} updateData={updateData} restaurantSlug={restaurantSlug} />
      case 2:
        return <UserStepTableSelect data={data} updateData={updateData} restaurantSlug={restaurantSlug} />
      case 3:
        return <UserStepContactInfo data={data} updateData={updateData} />
      case 4:
        return <UserStepConfirmReview data={data} onEdit={(step: number) => setCurrentStep(step)} />
      default:
        return null
    }
  }

  const getNextLabel = () => {
    switch (currentStep) {
      case 3: return 'Review Booking'
      case 4: return 'Confirm Reservation'
      default: return 'Next'
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B1517', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '24px', paddingLeft: '16px', paddingRight: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '9999px', backgroundColor: 'rgba(94, 139, 106, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#6B9E78' }}>
              <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
              <line x1="6" y1="17" x2="18" y2="17" />
            </svg>
          </div>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Table Reservation</h1>
        <p style={{ color: '#8b949e', fontSize: '0.875rem', marginTop: '4px' }}>
          Book your perfect dining experience in just a few steps.
        </p>
      </div>

      {/* Main Container */}
      <div className="res-wizard-container" style={{ width: '100%', maxWidth: '896px', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1, padding: '0 32px' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '0' }}>
          <DarkProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} percentage={percentage} />
        </div>

        {error && (
          <div style={{ backgroundColor: '#2d1416', color: '#ff7b72', border: '1px solid #ff7b72', padding: '12px', borderRadius: '8px', marginTop: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Step Content */}
        <div style={{ flex: 1, paddingBottom: '16px', paddingTop: '8px' }}>
          <div className="animate-fade-in res-wizard-step-content" style={{ 
            backgroundColor: '#101A1C', 
            border: '1px solid #30363d', 
            borderRadius: '16px', 
            padding: '40px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
          }}>
            {renderStep()}
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: '24px 0', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={prevStep}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '1px solid #30363d',
                backgroundColor: 'transparent',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)'
              }}
            >
              Back
            </button>

            {/* Step dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: '9999px',
                    transition: 'all 0.3s ease',
                    width: i + 1 === currentStep ? '24px' : '8px',
                    height: '8px',
                    backgroundColor: i + 1 === currentStep ? '#6B9E78' : i + 1 < currentStep ? '#6B9E78' : '#30363d'
                  }}
                />
              ))}
            </div>

            <button
              onClick={nextStep}
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                backgroundColor: loading ? '#b58b57' : '#C99C63',
                color: '#ffffff',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)'
              }}
            >
              {loading ? 'Confirming...' : getNextLabel()}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
