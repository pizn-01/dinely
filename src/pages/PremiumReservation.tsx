import { useState, useEffect, useCallback } from 'react'
import PoweredByFooter from '../components/PoweredByFooter'
import { Calendar, Info, Minus, Plus, ChefHat, Users, MapPin, Lock, Pencil, Clock, User, Mail, Phone, Loader2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'

// Types for API responses
interface TimeSlotData {
  allSlots: string[];
  availableSlots: string[];
}

interface TableData {
  id: string;
  tableNumber: string;
  name: string;
  capacity: number;
  area: { id: string; name: string } | null;
  type?: string;
  shape?: string;
  isPremium?: boolean;
  premiumPrice?: number;
}

interface RestaurantInfo {
  id: string;
  name: string;
  slug: string;
  openingTime: string;
  closingTime: string;
  maxPartySize: number;
  requirePayment?: boolean;
  currency?: string;
}

export default function PremiumReservation() {
  const navigate = useNavigate()
  const { slug } = useParams<{ slug: string }>()

  // Core state
  const [step, setStep] = useState(1)
  const [guests, setGuests] = useState(2)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null)
  const [contact, setContact] = useState({ firstName: '', lastName: '', email: '', phone: '', specialRequest: '' })

  // Dynamic data state
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null)
  const [slotData, setSlotData] = useState<TimeSlotData>({ allSlots: [], availableSlots: [] })
  const [tables, setTables] = useState<TableData[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [tablesLoading, setTablesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Date state — default to today
  const [date, setDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split('T')[0] // YYYY-MM-DD format
  })

  const predefinedGuests = [2, 4, 6, 8]

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr + 'T00:00:00')
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  // Fetch restaurant info on mount
  useEffect(() => {
    if (!slug) return
    const fetchInfo = async () => {
      try {
        const res = await api.get(`/public/${slug}/info`)
        setRestaurantInfo(res.data.data)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Restaurant not found')
      }
    }
    fetchInfo()

    // Auto-fill contact info from customer profile if logged in
    api.get('/customers/me').then(res => {
      const profile = res.data.data
      if (profile) {
        setContact(prev => ({
          ...prev,
          firstName: profile.firstName || prev.firstName,
          lastName: profile.lastName || prev.lastName,
          email: profile.email || prev.email,
          phone: profile.phone || prev.phone,
        }))
      }
    }).catch(() => {/* Not logged in or not a customer — leave contact empty */})
  }, [slug])

  // Fetch time slots when date or party size changes
  const fetchSlots = useCallback(async () => {
    if (!slug || !date) return
    setSlotsLoading(true)
    try {
      const res = await api.get(`/public/${slug}/slots`, { params: { date, partySize: guests } })
      setSlotData(res.data.data)
      // Reset selected time if no longer available
      if (selectedTime && !res.data.data.availableSlots.includes(selectedTime)) {
        setSelectedTime(null)
      }
    } catch (err: any) {
      console.error('Failed to fetch slots:', err.message)
    } finally {
      setSlotsLoading(false)
    }
  }, [slug, date, guests, selectedTime])

  useEffect(() => {
    fetchSlots()
  }, [slug, date, guests]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch available tables when time is selected
  const fetchTables = useCallback(async () => {
    if (!slug || !date || !selectedTime) return
    setTablesLoading(true)
    try {
      const res = await api.get(`/public/${slug}/availability`, {
        params: { date, time: selectedTime, partySize: guests }
      })
      setTables(res.data.data)
      // Reset selected table if no longer available
      if (selectedTable && !res.data.data.find((t: TableData) => t.id === selectedTable)) {
        setSelectedTable(null)
      }
    } catch (err: any) {
      console.error('Failed to fetch tables:', err.message)
    } finally {
      setTablesLoading(false)
    }
  }, [slug, date, selectedTime, guests, selectedTable])

  useEffect(() => {
    if (selectedTime) fetchTables()
  }, [selectedTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Get the selected table object
  const selectedTableObj = tables.find(t => t.id === selectedTable)

  const handleNext = async () => {
    // Determine if payment is required
    const requiresPayment = selectedTableObj?.isPremium && (restaurantInfo?.requirePayment !== false);

    if (step < 4) {
      setStep(step + 1)
    } else if (step === 4) {
      if (requiresPayment) {
        setStep(5)
      } else {
        submitReservation()
      }
    } else if (step === 5) {
      // Simulate payment processing then submit
      setLoading(true)
      setTimeout(() => {
        submitReservation()
      }, 1500)
    }
  }

  const submitReservation = async () => {
    try {
      setLoading(true)
      setError(null)

      await api.post(`/public/${slug}/reserve`, {
        reservationDate: date,
        startTime: selectedTime || '17:30',
        partySize: guests,
        tableId: selectedTable || null,
        guestFirstName: contact.firstName || 'Premium',
        guestLastName: contact.lastName || 'Member',
        guestEmail: contact.email || 'premium@example.com',
        guestPhone: contact.phone || '',
        specialRequests: contact.specialRequest || '',
        source: 'website'
      })

      navigate('/premium-booking-confirmed', {
        state: {
          selectedTime,
          guests,
          tableName: selectedTableObj?.name || selectedTableObj?.tableNumber,
          restaurantName: restaurantInfo?.name,
        }
      })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process premium reservation.')
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep(step - 1)
    else navigate(-1)
  }

  // Group tables by area for display
  const tablesByArea = tables.reduce<Record<string, TableData[]>>((acc, table) => {
    const areaName = table.area?.name || 'Main Dining'
    if (!acc[areaName]) acc[areaName] = []
    acc[areaName].push(table)
    return acc
  }, {})

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px'
    }}>
      <style>{`
        input::placeholder, textarea::placeholder {
          color: rgba(255, 255, 255, 0.4) !important;
          opacity: 1 !important;
        }
      `}</style>

      {/* Header Area */}
      <div style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '800px', width: '100%' }}>
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '0 auto 24px',
          color: '#8b949e'
        }}>
          <ChefHat size={32} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 16px 0' }}>
          {restaurantInfo?.name || 'Table Reservation'}
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#8b949e', margin: 0 }}>Book your perfect dining experience in just a few steps.</p>
      </div>

      {/* Main Content Box */}
      <div style={{ maxWidth: '1000px', width: '100%' }}>

        {/* Progress Bar */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ffffff', fontSize: '0.875rem', marginBottom: '12px' }}>
            <span>Step {step > 4 ? 4 : step} of 4</span>
            <span style={{ fontSize: '0.875rem' }}>
              {step === 1 ? '16% Complete' : step === 2 ? '50% Complete' : step === 3 ? '66% Complete' : step === 4 ? '82% Complete' : '100% Complete'}
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', backgroundColor: '#1A2325', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              width: step === 1 ? '16%' : step === 2 ? '50%' : step === 3 ? '66%' : step === 4 ? '82%' : '100%',
              height: '100%',
              backgroundColor: '#4a9e6b',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ backgroundColor: '#2d1416', color: '#ff7b72', border: '1px solid #ff7b72', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Inner Card */}
        <div style={{
          backgroundColor: '#101A1C',
          borderRadius: '16px',
          padding: '40px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>

          {/* STEP 1: Date, Time, Party Size */}
          {step === 1 && (
            <>
              {/* Section 1: When would you like to dine? */}
              <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 24px 0' }}>When would you like to dine?</h2>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Date</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        width: '100%',
                        padding: '16px',
                        paddingRight: '48px',
                        backgroundColor: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '16px' }}>
                    Preferred Time {slotsLoading && <Loader2 size={14} style={{ display: 'inline', animation: 'spin 1s linear infinite' }} />}
                  </label>

                  {slotData.allSlots.length === 0 && !slotsLoading ? (
                    <p style={{ color: '#8b949e', fontSize: '0.875rem' }}>No time slots available for this date.</p>
                  ) : (
                    <div className="res-prem-time-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '12px',
                      position: 'relative'
                    }}>
                      {slotData.allSlots.map((slot, index) => {
                        const isAvailable = slotData.availableSlots.includes(slot)
                        return (
                          <div key={index} style={{ position: 'relative' }}>
                            <button
                              onClick={() => isAvailable && setSelectedTime(slot)}
                              onMouseEnter={() => !isAvailable && setHoveredSlot(slot)}
                              onMouseLeave={() => setHoveredSlot(null)}
                              style={{
                                width: '100%',
                                padding: '12px 0',
                                backgroundColor: selectedTime === slot ? 'rgba(201, 156, 99, 0.1)' : 'transparent',
                                border: !isAvailable
                                  ? '1px solid #d73a49'
                                  : selectedTime === slot
                                    ? '1px solid #C99C63'
                                    : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: !isAvailable
                                  ? '#d73a49'
                                  : selectedTime === slot
                                    ? '#C99C63'
                                    : '#ffffff',
                                fontSize: '1rem',
                                cursor: !isAvailable ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              {!isAvailable && <Info size={16} />}
                              {slot}
                            </button>

                            {/* Tooltip for booked slot */}
                            {!isAvailable && hoveredSlot === slot && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: '12px',
                                backgroundColor: '#C99C63',
                                color: '#ffffff',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                whiteSpace: 'nowrap',
                                zIndex: 10,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '-6px',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  borderLeft: '6px solid transparent',
                                  borderRight: '6px solid transparent',
                                  borderBottom: '6px solid #C99C63'
                                }} />
                                No tables available for {guests} guest(s)<br />at this time.
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: How many people will be dining? */}
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 32px 0' }}>How many people will be dining?</h2>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ color: '#8b949e', marginBottom: '24px' }}>
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <button
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      style={{
                        width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#4a9e6b',
                        border: 'none', color: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
                      }}
                    >
                      <Minus size={20} />
                    </button>
                    <div style={{
                      width: '160px', height: '48px', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', color: '#ffffff', boxSizing: 'border-box'
                    }}>
                      {guests}
                    </div>
                    <button
                      onClick={() => setGuests(Math.min(restaurantInfo?.maxPartySize || 20, guests + 1))}
                      style={{
                        width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#4a9e6b',
                        border: 'none', color: '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
                      }}
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    {predefinedGuests.map(num => (
                      <button
                        key={num}
                        onClick={() => setGuests(num)}
                        style={{
                          width: '80px', padding: '12px 0',
                          backgroundColor: guests === num ? '#4a9e6b' : 'transparent',
                          border: guests === num ? '1px solid #4a9e6b' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px', color: '#ffffff', fontSize: '1rem', cursor: 'pointer'
                        }}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Choose Your Table (Dynamic) */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px 0' }}>Choose Your Table</h2>
              <p style={{ fontSize: '1rem', color: '#8b949e', margin: '0 0 40px 0' }}>
                Select from available tables for {selectedTime} on {formatDateDisplay(date)}
              </p>

              {tablesLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                  <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                  <p>Loading available tables...</p>
                </div>
              ) : tables.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#8b949e' }}>
                  <p>No tables available for this time and party size. Please go back and select a different time.</p>
                </div>
              ) : (
                Object.entries(tablesByArea).map(([areaName, areaTables], index) => (
                  <div key={areaName} style={{ marginBottom: index === Object.keys(tablesByArea).length - 1 ? 0 : '40px' }}>
                    {/* Category Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                      <span style={{
                        padding: '0 16px',
                        color: '#C99C63',
                        fontWeight: 500,
                        textTransform: 'capitalize'
                      }}>
                        {areaName}
                      </span>
                      <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                    </div>

                    {/* Table Grid */}
                    <div className="res-prem-table-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      {areaTables.map(table => (
                        <div
                          key={table.id}
                          onClick={() => setSelectedTable(table.id)}
                          style={{
                            border: selectedTable === table.id ? '1px solid #C99C63' : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            cursor: 'pointer',
                            backgroundColor: selectedTable === table.id ? 'rgba(201, 156, 99, 0.05)' : 'transparent',
                            transition: 'all 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (selectedTable !== table.id) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'
                          }}
                          onMouseLeave={(e) => {
                            if (selectedTable !== table.id) e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          {/* Table Icon */}
                          <div style={{
                            width: '64px', height: '64px', backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                          }}>
                            <img src="/table.svg" alt="Table" style={{ width: '32px', height: '32px', filter: 'brightness(0) invert(1)' }} />
                          </div>

                          {/* Table Details */}
                          <div style={{ flex: 1 }}>
                            <div className="res-prem-table-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{table.name || `Table ${table.tableNumber}`}</h3>
                                {table.type && table.type !== 'standard' && (
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    backgroundColor: 'rgba(45, 122, 138, 0.15)', color: '#38bdf8',
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 500
                                  }}>
                                    <Lock size={12} />
                                    <span>{table.type}</span>
                                  </div>
                                )}
                                {table.isPremium && (
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: '4px',
                                    backgroundColor: 'rgba(201, 156, 99, 0.15)', color: '#C99C63',
                                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600
                                  }}>
                                    <span>Premium</span>
                                    {table.premiumPrice ? ` (${restaurantInfo?.currency === 'USD' ? '$' : restaurantInfo?.currency === 'EUR' ? '€' : '£'}${table.premiumPrice})` : ''}
                                  </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', color: '#8b949e', fontSize: '0.875rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={16} />
                                <span>Capacity: {table.capacity} seats</span>
                              </div>
                              {table.area && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <MapPin size={16} />
                                  <span>{table.area.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* STEP 3: Contact Information */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px 0' }}>Contact Information</h2>
              <p style={{ fontSize: '1rem', color: '#8b949e', margin: '0 0 40px 0' }}>Please provide your details for the reservation</p>

              <div className="res-prem-contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>First Name</label>
                  <input
                    type="text" placeholder="John" value={contact.firstName}
                    onChange={(e) => setContact({ ...contact, firstName: e.target.value })}
                    style={{
                      width: '100%', padding: '16px', backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                      color: '#ffffff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Last Name</label>
                  <input
                    type="text" placeholder="Doe" value={contact.lastName}
                    onChange={(e) => setContact({ ...contact, lastName: e.target.value })}
                    style={{
                      width: '100%', padding: '16px', backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                      color: '#ffffff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Email</label>
                  <input
                    type="email" placeholder="johndoe@example.com" value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    style={{
                      width: '100%', padding: '16px', backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                      color: '#ffffff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Phone Number</label>
                  <input
                    type="tel" placeholder="+1 (555) 000-000" value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    style={{
                      width: '100%', padding: '16px', backgroundColor: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                      color: '#ffffff', fontSize: '1rem', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>Special Request</label>
                <textarea
                  placeholder="Any special requests or dietary requirements..."
                  value={contact.specialRequest}
                  onChange={(e) => setContact({ ...contact, specialRequest: e.target.value })}
                  style={{
                    width: '100%', padding: '16px', backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
                    color: '#ffffff', fontSize: '1rem', outline: 'none',
                    minHeight: '160px', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit'
                  }}
                />
              </div>
            </div>
          )}

          {/* STEP 4: Confirm Your Reservation */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px 0' }}>Confirm Your Reservation</h2>
              <p style={{ fontSize: '1rem', color: '#8b949e', margin: '0 0 40px 0' }}>Please review your booking details</p>

              <div className="res-prem-review-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '24px' }}>
                {/* Table Card */}
                <div style={{ backgroundColor: '#161F21', borderRadius: '12px', padding: '24px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#8b949e', cursor: 'pointer' }} onClick={() => setStep(2)}>
                    <Pencil size={20} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                    }}>
                      <img src="/table.svg" alt="Table" style={{ width: '24px', height: '24px', filter: 'brightness(0) invert(1)' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px 0' }}>Table</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '0.875rem' }}>
                          {selectedTableObj?.name || selectedTableObj?.tableNumber || 'Auto-assigned'}
                        </span>
                      </div>
                      <div className="res-prem-details-row" style={{ display: 'flex', alignItems: 'center', gap: '24px', color: '#cfcfcf', fontSize: '0.875rem' }}>
                        {selectedTableObj && (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Users size={16} />
                              <span>Capacity: {selectedTableObj.capacity} seats</span>
                            </div>
                            {selectedTableObj.area && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={16} />
                                <span>{selectedTableObj.area.name}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Party Size Card */}
                <div style={{ backgroundColor: '#161F21', borderRadius: '12px', padding: '24px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#8b949e', cursor: 'pointer' }} onClick={() => setStep(1)}>
                    <Pencil size={20} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                    }}>
                      <Users size={24} style={{ color: '#ffffff' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px 0' }}>Party size</h3>
                      <span style={{ fontSize: '0.875rem' }}>{guests} Guests</span>
                    </div>
                  </div>
                </div>

                {/* Date & Time Card */}
                <div style={{ backgroundColor: '#161F21', borderRadius: '12px', padding: '20px 24px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#8b949e', cursor: 'pointer' }} onClick={() => setStep(1)}>
                    <Pencil size={20} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                    }}>
                      <Calendar size={24} style={{ color: '#ffffff' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 8px 0' }}>Date & Time</h3>
                      <div className="res-prem-details-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem' }}>
                        <span>{formatDateDisplay(date)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={16} />
                          <span>{selectedTime || 'Not selected'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information Card */}
                <div style={{ backgroundColor: '#161F21', borderRadius: '12px', padding: '20px 24px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '24px', right: '24px', color: '#8b949e', cursor: 'pointer' }} onClick={() => setStep(3)}>
                    <Pencil size={20} />
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '48px', height: '48px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '50%',
                      display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                    }}>
                      <User size={24} style={{ color: '#ffffff' }} />
                    </div>
                    <div style={{ width: '100%' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 12px 0' }}>Contact Information</h3>
                      <div className="res-prem-details-row" style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.875rem', marginBottom: '12px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={16} />
                          <span>{contact.email || 'Not provided'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={16} />
                          <span>{contact.phone || 'Not provided'}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.875rem', margin: 0 }}>{contact.specialRequest || 'No special requests'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Payment (Stripe placeholder — ready for integration) */}
          {step === 5 && (
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 8px 0' }}>Secure Your Reservation</h2>
              <p style={{ fontSize: '1rem', color: '#8b949e', margin: '0 0 40px 0' }}>Complete the payment to confirm your premium table booking.</p>

              <div className="res-prem-payment-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                {/* Left Column: Payment Methods */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <button disabled={loading} onClick={handleNext} style={{
                    backgroundColor: loading ? '#9ca3af' : '#161F21',
                    border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '24px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer', color: '#ffffff', fontSize: '1.25rem', fontWeight: 600,
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1e2b2e' }}
                  onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#161F21' }}
                  >
                    {loading ? 'Processing Payment...' : '💳 Pay with Card (Mock)'}
                  </button>

                  <div style={{ marginTop: '24px', color: '#8b949e', fontSize: '0.75rem', lineHeight: '1.6' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#C99C63', fontWeight: 500 }}>
                      This is a simulated payment flow.
                    </p>
                    <p style={{ margin: 0 }}>
                      Click the button above to process a test payment. Once Stripe is fully integrated, a real secure checkout form will appear here.
                    </p>
                  </div>
                </div>

                {/* Right Column: Order Summary */}
                <div style={{
                  border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '32px', backgroundColor: 'transparent'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Restaurant</span>
                      <span style={{ color: '#cfcfcf', fontSize: '0.875rem' }}>{restaurantInfo?.name || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Date</span>
                      <span style={{ color: '#cfcfcf', fontSize: '0.875rem' }}>{formatDateDisplay(date)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Time</span>
                      <span style={{ color: '#cfcfcf', fontSize: '0.875rem' }}>{selectedTime || 'Not selected'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Guests</span>
                      <span style={{ color: '#cfcfcf', fontSize: '0.875rem' }}>{guests}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Table</span>
                      <span style={{ color: '#cfcfcf', fontSize: '0.875rem' }}>
                        {selectedTableObj?.name || selectedTableObj?.tableNumber || 'Auto-assigned'}
                      </span>
                    </div>

                    {selectedTableObj?.isPremium && selectedTableObj?.premiumPrice && (
                      <div style={{ padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, color: '#C99C63' }}>Premium Table Fee</span>
                          <span style={{ fontWeight: 600, color: '#C99C63' }}>
                            {restaurantInfo?.currency === 'USD' ? '$' : restaurantInfo?.currency === 'EUR' ? '€' : '£'}{selectedTableObj.premiumPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 500 }}>Guest</span>
                      <span style={{ color: '#cfcfcf', fontSize: '0.875rem' }}>
                        {contact.firstName} {contact.lastName}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div style={{
          marginTop: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={handleBack}
            style={{
              padding: '12px 32px', backgroundColor: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
              color: '#ffffff', fontSize: '1rem', cursor: 'pointer'
            }}
          >
            Back
          </button>

          {/* Pagination Indicators */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[1, 2, 3, 4].map(dot => (
              <div
                key={dot}
                style={{
                  width: (step === dot || (step === 5 && dot === 4)) ? '24px' : '6px',
                  height: '6px',
                  backgroundColor: (step === dot || (step === 5 && dot === 4)) ? '#C99C63' : 'rgba(255, 255, 255, 0.2)',
                  borderRadius: (step === dot || (step === 5 && dot === 4)) ? '4px' : '50%',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={
              loading ||
              (step === 1 && (!selectedTime || !date)) ||
              (step === 2 && !selectedTable) ||
              (step === 3 && (!contact.firstName || !contact.email))
            }
            style={{
              padding: '12px 32px',
              backgroundColor: '#C99C63',
              border: 'none', borderRadius: '8px',
              color: '#ffffff', fontSize: '1rem', fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: (
                loading ||
                (step === 1 && (!selectedTime || !date)) ||
                (step === 2 && !selectedTable) ||
                (step === 3 && (!contact.firstName || !contact.email))
              ) ? 0.5 : 1,
            }}
          >
            {step === 5 ? 'Process Mock Payment' : 
             step === 4 ? (selectedTableObj?.isPremium && restaurantInfo?.requirePayment !== false ? 'Proceed to Payment' : 'Confirm Reservation') : 
             step === 3 ? 'Review Booking' : 'Next'}
          </button>
        </div>

      </div>
      <PoweredByFooter theme="dark" />

      {/* Keyframe for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
