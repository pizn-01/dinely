import { useState, useEffect } from 'react'
import { Link, Copy, Check, Upload, Image as ImageIcon } from 'lucide-react'
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
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  
  useEffect(() => {
    if (!orgId) return
    const fetchOrg = async () => {
      try {
        const { data } = await api.get(`/organizations/${orgId}`)
        if (data.data?.slug) setRestaurantSlug(data.data.slug)
        if (data.data?.logoUrl) setLogoUrl(data.data.logoUrl)
      } catch (err) {
        console.error('Failed to fetch organization:', err)
      }
    }
    fetchOrg()
  }, [orgId])

  const baseUrl = window.location.origin
  
  const staffUrl = restaurantSlug ? `${baseUrl}/staff-login/${restaurantSlug}` : `${baseUrl}/staff-login`
  const bookingUrl = restaurantSlug ? `${baseUrl}/book-a-table?restaurant=${restaurantSlug}` : 'Loading...'

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Size check: limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo must be smaller than 5MB')
      return
    }

    try {
      setUploadingLogo(true)
      const formData = new FormData()
      formData.append('logo', file)
      
      const { data } = await api.post(`/organizations/${orgId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (data.data?.logoUrl) {
        setLogoUrl(data.data.logoUrl)
        setUploadSuccess(true)
        setTimeout(() => setUploadSuccess(false), 3000)
        
        // Refresh the page so Navbar picks it up (an exact full site refresh to ensure context updates)
        window.location.reload()
      }
    } catch (err: any) {
      console.error('Failed to upload logo:', err)
      alert(err?.response?.data?.error || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

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
        
        {/* Custom Logo Upload */}
        <div style={{
          backgroundColor: isDark ? '#0d1117' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '8px',
          padding: '24px'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '8px' }}>Restaurant Logo</h3>
          <p style={{ color: isDark ? '#8b949e' : '#6b7280', fontSize: '0.875rem', marginBottom: '24px' }}>
            Upload your custom logo. It will be displayed in the navigation bar for both admins and staff.
            (Max size: 5MB. Formats: PNG, JPG, SVG).
          </p>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '32px' }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '12px',
              border: `2px dashed ${isDark ? '#30363d' : '#d1d5db'}`,
              backgroundColor: isDark ? '#161B22' : '#f9fafb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {logoUrl ? (
                <img src={logoUrl} alt="Restaurant Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '8px' }} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: isDark ? '#8b949e' : '#9ca3af' }}>
                  <ImageIcon size={32} style={{ marginBottom: '8px' }} />
                  <span style={{ fontSize: '0.75rem' }}>No Logo</span>
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: isDark ? '#238636' : '#C99C63',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: uploadingLogo ? 'wait' : 'pointer',
                transition: 'opacity 0.2s',
                opacity: uploadingLogo ? 0.7 : 1
              }}>
                <Upload size={16} />
                {uploadingLogo ? 'Uploading...' : 'Upload New Logo'}
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,.webp"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  style={{ display: 'none' }}
                />
              </label>
              
              {uploadSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.875rem', marginTop: '12px', fontWeight: 500 }}>
                  <Check size={16} />
                  Logo updated successfully
                </div>
              )}
            </div>
          </div>
        </div>

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
