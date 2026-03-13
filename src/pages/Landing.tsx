import { useNavigate } from 'react-router-dom'
import { Calendar, Clock } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useState } from 'react'

import heroBg from '../assets/mask-group.png'

export default function Landing() {
  const navigate = useNavigate()
  const [date, setDate] = useState('19/02/2026')
  const [time, setTime] = useState('17:00')
  const [guests, setGuests] = useState('2')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar with solid dark background */}
      <div style={{ backgroundColor: '#0B1517' }}>
        <Navbar variant="public" />
      </div>

      {/* Hero Section with background image */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Background Image Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url(${heroBg})`,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'stretch',
            padding: '0 64px',
            maxWidth: '1400px',
            margin: '0 auto',
            width: '100%',
            minHeight: 'calc(100vh - 72px)',
          }}
        >
          {/* Left Content — aligned toward bottom */}
          <div
            className="animate-fade-in"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '4.5rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  lineHeight: 1.1,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Welcome
              </h1>
              <p
                style={{
                  fontSize: '1.125rem',
                  color: '#d1d5db',
                  marginTop: '16px',
                  maxWidth: '28rem',
                  lineHeight: 1.6,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Experience authentic italian cuisine
                <br />
                in an elegant atmosphere
              </p>
            </div>
          </div>

          {/* Right Reservation Card — vertically centered */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              className="animate-slide-up"
              style={{
                width: '430px',
                height: '430px',
                padding: '32px',
                animationDelay: '0.2s',
                backgroundColor: '#101A1C',
                border: '1px solid #30363d',
                borderRadius: '12px',
              }}
            >
              <h2
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  marginBottom: '24px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Reserve your table
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#ffffff',
                      marginBottom: '6px',
                    }}
                  >
                    Date
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="input-dark"
                      style={{ paddingRight: '40px' }}
                    />
                    <Calendar
                      size={14}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8b949e',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#ffffff',
                      marginBottom: '8px',
                    }}
                  >
                    Preferred Time
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="input-dark"
                      style={{ paddingRight: '40px' }}
                    />
                    <Clock
                      size={14}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8b949e',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#ffffff',
                      marginBottom: '8px',
                    }}
                  >
                    No of Guests
                  </label>
                  <input
                    type="text"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="input-dark"
                  />
                </div>

                <button
                  onClick={() => navigate('/reserve')}
                  className="btn-gold"
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '0.9rem',
                    marginTop: '6px',
                  }}
                >
                  Book Table
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
