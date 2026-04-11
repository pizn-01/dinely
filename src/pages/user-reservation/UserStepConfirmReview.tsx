import { useState, useEffect } from 'react'
import { Edit3, Users, Calendar, Clock, Mail, Phone, Info } from 'lucide-react'
import type { ReservationData } from './UserReservationWizard'
import { api } from '../../services/api'

interface UserStepConfirmReviewProps {
  data: ReservationData
  onEdit: (step: number) => void
}

export default function UserStepConfirmReview({ data, onEdit }: UserStepConfirmReviewProps) {
  const [cancellationPolicy, setCancellationPolicy] = useState<string | null>(null)

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get('restaurant') || 'default-restaurant'
    api.get(`/public/${slug}/info`)
      .then(res => setCancellationPolicy(res.data.data.cancellationPolicy))
      .catch(console.error)
  }, [])

  const cardStyle = {
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '20px',
    position: 'relative' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)'
  }

  const editBtnStyle = {
    position: 'absolute' as const,
    top: '20px',
    right: '20px',
    color: '#8b949e',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 0
  }

  const iconCircle = {
    width: '40px',
    height: '40px',
    borderRadius: '9999px',
    backgroundColor: 'rgba(94, 139, 106, 0.15)',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', marginTop: 0 }}>
        Confirm Your Reservation
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '24px', marginTop: 0 }}>
        Please review your booking details
      </p>

      <div className="res-review-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '24px'
      }}>
        {/* Table Info */}
        <div style={cardStyle}>
          <button onClick={() => onEdit(2)} style={editBtnStyle}>
            <Edit3 size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={iconCircle}>
              <img src="/Group 1597888803.svg" alt="Table" width={18} height={12} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0 }}>Table</h3>
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                {data.tableName || 'Table 1'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '0.75rem', color: '#8b949e' }}>
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
        <div style={cardStyle}>
          <button onClick={() => onEdit(1)} style={editBtnStyle}>
            <Edit3 size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={iconCircle}>
              <Users size={20} style={{ color: '#6B9E78' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0 }}>Party size</h3>
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
                {data.guests} Guests
              </p>
            </div>
          </div>
        </div>

        {/* Date & Time */}
        <div style={cardStyle}>
          <button onClick={() => onEdit(1)} style={editBtnStyle}>
            <Edit3 size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={iconCircle}>
              <Calendar size={20} style={{ color: '#6B9E78' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0 }}>Date & Time</h3>
              <p style={{ color: '#8b949e', fontSize: '0.875rem', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {data.date ? new Date(
                  data.date.includes('/') 
                    ? `${data.date.split('/')[2]}-${data.date.split('/')[1]}-${data.date.split('/')[0]}T12:00:00`
                    : `${data.date}T12:00:00`
                ).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Select Date'}
                <Clock size={12} />
                {data.time || '17:30'}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div style={cardStyle}>
          <button onClick={() => onEdit(3)} style={editBtnStyle}>
            <Edit3 size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={iconCircle}>
              <Users size={20} style={{ color: '#6B9E78' }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0 }}>Contact Information</h3>
              <div className="res-review-contact" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#8b949e' }}>
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
                <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '4px', margin: 0 }}>{data.specialRequest}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Policy rendering */}
      {cancellationPolicy && (
        <div style={{
          marginTop: '24px',
          backgroundColor: 'rgba(201, 156, 99, 0.05)',
          border: '1px solid rgba(201, 156, 99, 0.2)',
          borderRadius: '12px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <Info size={20} style={{ color: '#C99C63', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 4px 0', color: '#C99C63', fontSize: '0.875rem', fontWeight: 600 }}>Cancellation Policy</h4>
            <p style={{ margin: 0, color: '#c9d1d9', fontSize: '0.875rem', lineHeight: '1.5' }}>
              {cancellationPolicy}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
