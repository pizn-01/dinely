import { Edit3, Users, Calendar, Clock, Mail, Phone } from 'lucide-react'
import type { ReservationData } from './ReservationWizard'

interface StepConfirmReviewProps {
  data: ReservationData
  onEdit: (step: number) => void
}

export default function StepConfirmReview({ data, onEdit }: StepConfirmReviewProps) {
  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', fontFamily: 'var(--font-sans)', marginTop: 0 }}>
        Confirm Your Reservation
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '24px', fontFamily: 'var(--font-sans)', marginTop: 0 }}>
        Please review your booking details
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '24px'
      }}>
        {/* Table Info */}
        <div style={{
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          backgroundColor: '#161b22'
        }}>
          <button
            onClick={() => onEdit(2)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: '#8b949e',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <Edit3 size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              backgroundColor: '#0d1117',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#8b949e' }}>
                <rect x="3" y="4" width="18" height="12" rx="1" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="9" y1="4" x2="9" y2="16" />
                <line x1="15" y1="4" x2="15" y2="16" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0, fontFamily: 'var(--font-sans)' }}>Table</h3>
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: '4px 0 0 0', fontFamily: 'var(--font-sans)' }}>
                {data.tableName || 'Table 1'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '0.75rem', color: '#8b949e', fontFamily: 'var(--font-sans)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={12} />
                  Capacity: {data.tableCapacity || 2} seats
                </span>
                <span>{data.tableLocation || 'By the window'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Party Size */}
        <div style={{
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          backgroundColor: '#161b22'
        }}>
          <button
            onClick={() => onEdit(1)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: '#8b949e',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <Edit3 size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Users size={20} style={{ color: '#8b949e' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0, fontFamily: 'var(--font-sans)' }}>Party size</h3>
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: '4px 0 0 0', fontFamily: 'var(--font-sans)' }}>
                {data.guests} Guests
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div style={{
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          backgroundColor: '#161b22'
        }}>
          <button
            onClick={() => onEdit(1)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: '#8b949e',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <Edit3 size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Calendar size={20} style={{ color: '#eab308' }} /> {/* gold icon */}
            </div>
            <div>
              <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0, fontFamily: 'var(--font-sans)' }}>Date & Time</h3>
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-sans)' }}>
                Thu, Mar 5, 2026
                <Clock size={12} />
                {data.time || '17:30'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div style={{
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '20px',
          position: 'relative',
          backgroundColor: '#161b22'
        }}>
          <button
            onClick={() => onEdit(3)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              color: '#8b949e',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            <Edit3 size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Users size={20} style={{ color: '#8b949e' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0, fontFamily: 'var(--font-sans)' }}>Contact Information</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#8b949e', fontFamily: 'var(--font-sans)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mail size={11} />
                  {data.email || 'johndoe@example.com'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={11} />
                  {data.phone || '+1 (555) 000-000'}
                </span>
              </div>
              {data.specialRequest && (
                <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '4px', margin: 0, fontFamily: 'var(--font-sans)' }}>{data.specialRequest}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
