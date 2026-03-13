import { useNavigate, useLocation } from 'react-router-dom'
import { Check, ChefHat } from 'lucide-react'
import type { ReservationData } from './ReservationWizard'

export default function BookingConfirmed() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = (location.state as ReservationData) || {}

  const details = [
    { label: 'Guest Name', value: `${data.firstName || 'John'} ${data.lastName || 'Doe'}` },
    { label: 'Party Size', value: `${data.guests || 2} Guests` },
    { label: 'Date', value: 'Tue, Feb 17, 2026' },
    { label: 'Time', value: data.time || '17:00' },
    { label: 'Table', value: `${data.tableName || 'Table 8'} (Main hall)` },
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
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{
            width: '64px', // slightly wider to match new screenshot scale
            height: '64px',
            borderRadius: '9999px',
            backgroundColor: '#161F22', // match new screenshot
            border: 'none', // no border in new screenshot
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ChefHat size={32} style={{ color: '#ffffff' }} strokeWidth={1.5} />
          </div>
        </div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Table Reservation</h1>
        <p style={{ color: '#8b949e', fontSize: '0.875rem', marginTop: '4px' }}>
          Book your perfect dining experience in just a few steps.
        </p>
      </div>

      {/* Confirmation Card (Outer Box) */}
      <div style={{
        width: '100%',
        maxWidth: '1240px',
        marginTop: '24px',
        marginBottom: '40px', // space below box on background
        animation: 'slideUp 0.5s ease-out'
      }}>
        <div style={{
          boxSizing: 'border-box',
          backgroundColor: '#101A1C',
          borderRadius: '16px',
          padding: '56px 40px 32px 40px', // closer matching to screenshot footprint
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Success Icon */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '9999px',
            backgroundColor: '#6B9E78', // matching the muted green from the screenshot
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <Check size={28} style={{ color: '#0B1517' }} strokeWidth={3} />
          </div>

          {/* Success Header Content */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0', fontFamily: 'var(--font-sans)' }}>
               Booking Confirmed!
             </h2>
             <p style={{ fontSize: '1rem', color: '#8b949e', margin: 0, fontFamily: 'var(--font-sans)' }}>
               Your reservation details have been sent to {data.email || 'johndoe@example.com'}
             </p>
          </div>

          {/* Inner Details Box */}
          <div style={{
            width: '100%',
            maxWidth: '700px',
            height: '340px',
            boxSizing: 'border-box',
            backgroundColor: '#161F22', // slightly lighter than outer box
            borderRadius: '12px',
            padding: '24px 32px', // giving it some internal breathing room
            marginBottom: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            {details.map((item, index) => (
              <div key={item.label} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0',
                height: '56px'
              }}>
                <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-sans)' }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '1rem', color: '#8b949e', fontFamily: 'var(--font-sans)', textAlign: 'right', marginTop: '2px' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Footer Text & Button */}
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
                fontFamily: 'var(--font-sans)'
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
