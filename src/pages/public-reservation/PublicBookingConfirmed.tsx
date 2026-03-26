import { useNavigate, useLocation } from 'react-router-dom'
import { Check, ChefHat } from 'lucide-react'
import type { ReservationData } from './BookATableWizard'

export default function PublicBookingConfirmed() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = (location.state as ReservationData) || {}

  const formattedDate = data.date 
    ? new Date(data.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Thu, 19 Feb 2026';

  const details = [
    { label: 'Guest Name', value: `${data.firstName || 'John'} ${data.lastName || 'Doe'}` },
    { label: 'Party Size', value: `${data.guests || 2} Guests` },
    { label: 'Date', value: formattedDate },
    { label: 'Time', value: data.time || '17:00' },
    { label: 'Table', value: data.tableName ? `${data.tableName}` : 'Table 8' },
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
            borderRadius: '9999px',
            backgroundColor: 'rgba(94, 139, 106, 0.15)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ChefHat size={32} style={{ color: '#6B9E78' }} strokeWidth={1.5} />
          </div>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Table Reservation</h1>
        <p style={{ color: '#8b949e', fontSize: '0.875rem', marginTop: '4px' }}>
          Book your perfect dining experience in just a few steps.
        </p>
      </div>

      {/* Confirmation Card (Outer Box) */}
      <div style={{
        width: '100%',
        maxWidth: '1240px',
        marginTop: '24px',
        marginBottom: '40px',
        animation: 'slideUp 0.5s ease-out'
      }}>
      <div className="res-confirm-box" style={{
          boxSizing: 'border-box',
          backgroundColor: '#101A1C',
          borderRadius: '16px',
          border: '1px solid #30363d',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
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
            borderRadius: '9999px',
            backgroundColor: '#5E8B6A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            boxShadow: '0 4px 14px 0 rgba(94, 139, 106, 0.39)'
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
          <div className="res-confirm-details" style={{
            width: '100%',
            maxWidth: '700px',
            height: '340px',
            boxSizing: 'border-box',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid #30363d',
            borderRadius: '12px',
            padding: '24px 32px',
            marginBottom: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            {details.map((item) => (
              <div key={item.label} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0',
                height: '56px'
              }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 600, color: '#ffffff' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '1rem', color: '#8b949e', textAlign: 'right', marginTop: '2px' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Footer Button */}
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                backgroundColor: '#C99C63',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '1rem',
                padding: '10px 32px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              Return to home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
