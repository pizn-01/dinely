import { useNavigate, useLocation } from 'react-router-dom'
import { Check, ChefHat } from 'lucide-react'

export default function PremiumBookingConfirmed() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = location.state || {}

  const formattedDate = data.selectedDate 
    ? new Date(data.selectedDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Tue, 17 Feb 2026';

  const details = [
    { label: 'Guest Name', value: `${data.firstName || 'John'} ${data.lastName || 'Doe'}` },
    { label: 'Party Size', value: `${data.guests || 2} Guests` },
    { label: 'Date', value: formattedDate },
    { label: 'Time', value: data.selectedTime || '17:30' },
    { label: 'Table', value: data.tableName ? `${data.tableName}` : 'Table 2' },
    { label: 'Contact', value: data.email || 'johndoe@example.com' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 16px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ChefHat size={32} style={{ color: '#8b949e' }} strokeWidth={1.5} />
          </div>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Table Reservation</h1>
        <p style={{ color: '#8b949e', fontSize: '0.875rem', marginTop: '4px' }}>
          Book your perfect dining experience in just a few steps.
        </p>
      </div>

      {/* Confirmation Card */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        marginTop: '24px',
        marginBottom: '40px',
      }}>
        <div style={{
          boxSizing: 'border-box',
          backgroundColor: '#101A1C',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '56px 40px 32px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Success Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#4a9e6b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 4px 14px 0 rgba(74, 158, 107, 0.3)'
          }}>
            <Check size={32} style={{ color: '#ffffff' }} strokeWidth={3} />
          </div>

          {/* Success Header Content */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
             <h2 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>
               Booking Confirmed!
             </h2>
             <p style={{ fontSize: '1rem', color: '#8b949e', margin: 0 }}>
               Your reservation details have been sent to {data.email || 'johndoe@example.com'}
             </p>
          </div>

          {/* Inner Details Box */}
          <div style={{
            width: '100%',
            maxWidth: '600px',
            boxSizing: 'border-box',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '24px 32px',
            marginBottom: '40px'
          }}>
            {details.map((item) => (
              <div key={item.label} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                  <span style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: '1rem', color: '#8b949e', textAlign: 'right' }}>
                    {item.value}
                  </span>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#C99C63',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '1rem',
              padding: '12px 32px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d4a873'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C99C63'}
          >
            Return to home
          </button>
        </div>
      </div>
    </div>
  )
}
