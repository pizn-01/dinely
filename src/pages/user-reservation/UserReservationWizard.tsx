import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import DarkProgressBar from '../../components/DarkProgressBar'
import UserStepDateTime from './UserStepDateTime'
import UserStepTableSelect from './UserStepTableSelect'
import UserStepContactInfo from './UserStepContactInfo'
import UserStepConfirmReview from './UserStepConfirmReview'
import UserStepPayment from './UserStepPayment'

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
  restaurantSlug?: string
  tableFee?: number
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

export default function UserReservationWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<ReservationData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuth()
  const searchParams = new URLSearchParams(window.location.search)
  const restaurantSlug = searchParams.get('restaurant') || 'default-restaurant'

  // Promotional popup state
  const [showPromoModal, setShowPromoModal] = useState(false)
  const [orgData, setOrgData] = useState<any>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    if (user && !user.isVip) {
      const storageKey = `dinely_promo_count_${user.id}`
      const count = parseInt(localStorage.getItem(storageKey) || '0', 10)
      
      if (count % 2 === 0) {
        setShowPromoModal(true)
      }
      
      localStorage.setItem(storageKey, (count + 1).toString())
    }
    
    // Fetch real customer profile for accurate contact info
    if (user && !data.email) {
      api.get('/customers/me').then(res => {
        const profile = res.data.data
        if (profile) {
          setData(prev => ({
            ...prev,
            email: profile.email || user.email,
            firstName: profile.firstName || '',
            lastName: profile.lastName || ''
          }))
        }
      }).catch(() => {
        // Fallback to auth context if customer profile not found
        const names = user.name ? user.name.split(' ') : ['']
        const firstName = names[0] || ''
        const lastName = names.slice(1).join(' ') || ''
        setData(prev => ({
          ...prev,
          email: user.email,
          firstName,
          lastName
        }))
      })
    }
    
    api.get(`/public/${restaurantSlug}/info`).then(res => setOrgData(res.data.data)).catch(console.error)
  }, [user, restaurantSlug])

  const handleUpgradeVip = async () => {
    if (!orgData?.id) return
    try {
      setCheckoutLoading(true)
      const returnUrl = `${window.location.origin}/welcome?restaurant=${restaurantSlug}`
      const { data } = await api.post('/customers/me/upgrade-vip', {
        organizationId: orgData.id,
        returnUrl
      })
      if (data.data?.url) {
        window.location.href = data.data.url
      }
    } catch (err: any) {
      console.error('Failed to create VIP checkout session', err)
      toast.error(err.response?.data?.error || 'Failed to initiate payment')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const updateData = useCallback((updates: Partial<ReservationData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  const TOTAL_STEPS = data.tableFee ? 5 : 4
  const nextStep = async () => {
    if (currentStep < TOTAL_STEPS) {
      // If we go to payment step, ensure payment method is selected later
      if (data.tableFee && currentStep === 3 && !data.paymentMethod) {
         // Optionally you could set a default here, or just let them go to the payment step.
      }
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

        navigate('/user-booking-confirmed', { state: { ...data, restaurantSlug } })
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <UserStepDateTime data={data} updateData={updateData} restaurantSlug={restaurantSlug} />
      case 2:
        return <UserStepTableSelect data={data} updateData={updateData} restaurantSlug={restaurantSlug} />
      case 3:
        return <UserStepContactInfo data={data} updateData={updateData} />
      case 4:
        if (data.tableFee) return <UserStepPayment data={data} updateData={updateData} />
        return <UserStepConfirmReview data={data} onEdit={(step: number) => setCurrentStep(step)} />
      case 5:
        return <UserStepConfirmReview data={data} onEdit={(step: number) => setCurrentStep(step)} />
      default:
        return null
    }
  }

  const getNextLabel = () => {
    // Handling confirm logic
    if (currentStep === TOTAL_STEPS) return 'Confirm Reservation'
    if (currentStep === 3) return data.tableFee ? 'Proceed to Payment' : 'Review Booking'
    if (currentStep === 4 && data.tableFee) return 'Review Booking'
    return 'Next'
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0B1517', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      
      {/* Premium Upgrade Modal */}
      {showPromoModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '24px' }}>
          <div style={{ backgroundColor: '#101A1C', border: '1px solid #C99C63', borderRadius: '16px', padding: '32px', maxWidth: '440px', width: '100%', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '200px', background: 'linear-gradient(90deg, transparent, rgba(201, 156, 99, 0.1))', zIndex: 0 }} />
            
            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(201, 156, 99, 0.1)', marginBottom: '16px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#C99C63" stroke="#C99C63" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#C99C63', margin: '0 0 12px 0' }}>Unlock Premium Benefits at {orgData?.name || 'our restaurant'}!</h3>
              <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '24px' }}>
                Skip the wait and guarantee your preferred table by upgrading to Premium today. Enjoy complimentary welcome drinks, Priority booking, and customized chef menus.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  onClick={handleUpgradeVip}
                  disabled={checkoutLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#C99C63',
                    color: '#ffffff',
                    fontWeight: 600,
                    border: 'none',
                    cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                    opacity: checkoutLoading ? 0.8 : 1
                  }}>
                  {checkoutLoading ? 'Preparing Checkout...' : 'Upgrade to Premium'}
                </button>
                <button 
                  onClick={() => setShowPromoModal(false)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: '#8b949e',
                    fontWeight: 500,
                    border: '1px solid #30363d',
                    cursor: 'pointer'
                  }}>
                  Continue standard booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
