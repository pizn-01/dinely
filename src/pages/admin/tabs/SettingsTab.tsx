import { useState, useEffect } from 'react'
import { Link, Copy, Check } from 'lucide-react'
import { api } from '../../../services/api'

interface SettingsTabProps {
  theme: 'dark' | 'light'
  orgId: string
}

export default function SettingsTab({ theme, orgId }: SettingsTabProps) {
  const isDark = theme === 'dark'
  const [copiedStaff, setCopiedStaff] = useState(false)
  const [copiedBooking, setCopiedBooking] = useState(false)
  const [restaurantSlug, setRestaurantSlug] = useState('')
  
  useEffect(() => {
    if (!orgId) return
    const fetchOrg = async () => {
      try {
        const { data } = await api.get(`/organizations/${orgId}`)
        if (data.data?.slug) {
          setRestaurantSlug(data.data.slug)
        }
      } catch (err) {
        console.error('Failed to fetch organization:', err)
      }
    }
    fetchOrg()
  }, [orgId])

  const baseUrl = window.location.origin
  
  const staffUrl = restaurantSlug ? `${baseUrl}/staff-login/${restaurantSlug}` : `${baseUrl}/staff-login`
  const bookingUrl = restaurantSlug ? `${baseUrl}/book-a-table?restaurant=${restaurantSlug}` : 'Loading...'

  const copyToClipboard = async (text: string, type: 'staff' | 'booking') => {
    try {
      await navigator.clipboard.writeText(text)
      if (type === 'staff') {
        setCopiedStaff(true)
        setTimeout(() => setCopiedStaff(false), 2000)
      } else {
        setCopiedBooking(true)
        setTimeout(() => setCopiedBooking(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy', err)
    }
  }

  return (
    <div style={{
      backgroundColor: isDark ? '#161B22' : '#f9fafb',
      borderRadius: '12px',
      border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
      padding: '32px',
      color: isDark ? '#ffffff' : '#1f2937'
    }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>
        System Credentials & Links
      </h2>
      <p style={{ color: isDark ? '#8b949e' : '#6b7280', marginBottom: '32px', fontSize: '0.95rem' }}>
        Generate and copy the secure links required for your staff to log in, and the public widget link to embed on your restaurant's main website.
      </p>

      <div style={{ display: 'grid', gap: '24px', maxWidth: '800px' }}>
        
        {/* Staff Link */}
        <div style={{
          backgroundColor: isDark ? '#0d1117' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '8px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '8px' }}>Staff Portal Access</h3>
          <p style={{ color: isDark ? '#8b949e' : '#6b7280', fontSize: '0.875rem', marginBottom: '16px' }}>
            Provide this link to your team members so they can log into their POS/Management dashboard.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={staffUrl}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: isDark ? '#161B22' : '#f3f4f6',
                border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                borderRadius: '6px',
                color: isDark ? '#c9d1d9' : '#374151',
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            />
            <button
              onClick={() => copyToClipboard(staffUrl, 'staff')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: isDark ? '#238636' : '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {copiedStaff ? <Check size={16} /> : <Copy size={16} />}
              {copiedStaff ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

        {/* Public Widget */}
        <div style={{
          backgroundColor: isDark ? '#0d1117' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '8px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '8px' }}>Public Reservation Widget</h3>
          <p style={{ color: isDark ? '#8b949e' : '#6b7280', fontSize: '0.875rem', marginBottom: '16px' }}>
            Link the "Reserve a Table" button on your main website to this URL.
          </p>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input
              type="text"
              readOnly
              value={bookingUrl}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: isDark ? '#161B22' : '#f3f4f6',
                border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                borderRadius: '6px',
                color: isDark ? '#c9d1d9' : '#374151',
                fontSize: '0.875rem',
                fontFamily: 'monospace'
              }}
            />
            <button
              onClick={() => copyToClipboard(bookingUrl, 'booking')}
              disabled={!restaurantSlug}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: !restaurantSlug ? '#4b5563' : (isDark ? '#238636' : '#10b981'),
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: !restaurantSlug ? 'not-allowed' : 'pointer'
              }}
            >
              {copiedBooking ? <Check size={16} /> : <Link size={16} />}
              {copiedBooking ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
