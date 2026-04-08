import { useState, useEffect } from 'react'
import { Link, Copy, Check, Upload, Image as ImageIcon, Save, Clock, Users, CreditCard, Merge, Footprints, FileText, DollarSign, CalendarDays, Settings2 } from 'lucide-react'
import { api } from '../../../services/api'
import { toast } from 'react-hot-toast'

interface SettingsTabProps {
  theme: 'dark' | 'light'
  orgId: string
}

interface OrgSettings {
  name: string
  address: string
  phone: string
  email: string
  openingTime: string
  closingTime: string
  currency: string
  allowMergeableTables: boolean
  allowWalkIns: boolean
  defaultReservationDurationMin: number
  minAdvanceBookingHours: number
  maxAdvanceBookingDays: number
  maxPartySize: number
  requirePayment: boolean
  cancellationPolicy: string
  stripeOnboardingComplete?: boolean
  vipMembershipFee?: number
}

const defaultSettings: OrgSettings = {
  name: '',
  address: '',
  phone: '',
  email: '',
  openingTime: '12:00',
  closingTime: '22:00',
  currency: 'GBP',
  allowMergeableTables: false,
  allowWalkIns: true,
  defaultReservationDurationMin: 90,
  minAdvanceBookingHours: 1,
  maxAdvanceBookingDays: 30,
  maxPartySize: 12,
  requirePayment: false,
  cancellationPolicy: '',
  stripeOnboardingComplete: false,
  vipMembershipFee: 15,
}

export default function SettingsTab({ theme, orgId }: SettingsTabProps) {
  const isDark = theme === 'dark'
  const [copiedStaff, setCopiedStaff] = useState(false)
  const [copiedBooking, setCopiedBooking] = useState(false)
  const [restaurantSlug, setRestaurantSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // Restaurant configuration state
  const [settings, setSettings] = useState<OrgSettings>(defaultSettings)
  const [originalSettings, setOriginalSettings] = useState<OrgSettings>(defaultSettings)
  const [savingSettings, setSavingSettings] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const [connectingStripe, setConnectingStripe] = useState(false)

  useEffect(() => {
    if (!orgId) return
    const fetchOrg = async () => {
      try {
        const { data } = await api.get(`/organizations/${orgId}`)
        const org = data.data
        if (org?.slug) setRestaurantSlug(org.slug)
        if (org?.logoUrl) setLogoUrl(org.logoUrl)

        let isStripeComplete = org?.stripeOnboardingComplete ?? false

        // Sync stripe status if returning from onboarding
        if (!isStripeComplete && window.location.search.includes('stripe_return')) {
          try {
            const statusRes = await api.get(`/organizations/${orgId}/stripe/status`)
            if (statusRes.data.data?.detailsSubmitted) {
              isStripeComplete = true
            }
          } catch (e) {
            console.error('Failed to sync stripe status', e)
          }
        }

        const loaded: OrgSettings = {
          name: org?.name || '',
          address: org?.address || '',
          phone: org?.phone || '',
          email: org?.email || '',
          openingTime: org?.openingTime || '12:00',
          closingTime: org?.closingTime || '22:00',
          currency: org?.currency || 'GBP',
          allowMergeableTables: org?.allowMergeableTables ?? false,
          allowWalkIns: org?.allowWalkIns ?? true,
          defaultReservationDurationMin: org?.defaultReservationDurationMin || 90,
          minAdvanceBookingHours: org?.minAdvanceBookingHours ?? 1,
          maxAdvanceBookingDays: org?.maxAdvanceBookingDays || 30,
          maxPartySize: org?.maxPartySize || 12,
          requirePayment: org?.requirePayment ?? false,
          cancellationPolicy: org?.cancellationPolicy || '',
          stripeOnboardingComplete: isStripeComplete,
          vipMembershipFee: org?.vipMembershipFee ?? 15,
        }
        setSettings(loaded)
        setOriginalSettings(loaded)
      } catch (err) {
        console.error('Failed to fetch organization:', err)
      }
    }
    fetchOrg()
  }, [orgId])

  // Track changes
  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(originalSettings))
  }, [settings, originalSettings])

  const baseUrl = window.location.origin

  const staffUrl = restaurantSlug ? `${baseUrl}/staff-login/${restaurantSlug}` : `${baseUrl}/staff-login`
  const bookingUrl = restaurantSlug ? `${baseUrl}/${restaurantSlug}` : 'Loading...'

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be smaller than 5MB')
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
        window.location.reload()
      }
    } catch (err: any) {
      console.error('Failed to upload logo:', err)
      toast.error(err?.response?.data?.error || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
      await api.put(`/organizations/${orgId}`, {
        openingTime: settings.openingTime,
        closingTime: settings.closingTime,
        currency: settings.currency,
        allowMergeableTables: settings.allowMergeableTables,
        allowWalkIns: settings.allowWalkIns,
        defaultReservationDurationMin: settings.defaultReservationDurationMin,
        maxAdvanceBookingDays: settings.maxAdvanceBookingDays,
        maxPartySize: settings.maxPartySize,
        requirePayment: settings.requirePayment,
        cancellationPolicy: settings.cancellationPolicy,
        vipMembershipFee: settings.vipMembershipFee,
      })
      setOriginalSettings({ ...settings })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      console.error('Failed to save settings:', err)
      toast.error(err?.response?.data?.error || 'Failed to save settings. Please try again.')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleConnectStripe = async () => {
    try {
      setConnectingStripe(true)
      const { data } = await api.post(`/organizations/${orgId}/stripe/connect`)
      if (data.data?.url) {
        window.location.href = data.data.url
      }
    } catch (err: any) {
      console.error('Failed to init stripe connect:', err)
      toast.error(err?.response?.data?.error || 'Failed to connect to Stripe')
    } finally {
      setConnectingStripe(false)
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

  // Reusable style helpers
  const cardStyle = {
    backgroundColor: isDark ? '#0d1117' : '#ffffff',
    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
    borderRadius: '8px',
    padding: '24px',
  }

  const labelStyle = {
    display: 'block' as const,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isDark ? '#d1d5db' : '#374151',
    marginBottom: '6px',
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: isDark ? '#161B22' : '#f3f4f6',
    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
    borderRadius: '8px',
    color: isDark ? '#c9d1d9' : '#374151',
    fontSize: '0.875rem',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }

  const sectionTitleStyle = {
    fontSize: '1rem',
    fontWeight: 600,
    color: isDark ? '#ffffff' : '#111827',
    margin: '0 0 6px 0',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
  }

  const sectionDescStyle = {
    color: isDark ? '#8b949e' : '#6b7280',
    fontSize: '0.875rem',
    margin: '0 0 20px 0',
  }

  const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#d1d5db' : '#374151' }}>{label}</span>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: '48px',
          height: '26px',
          borderRadius: '13px',
          border: 'none',
          backgroundColor: checked ? '#C99C63' : (isDark ? '#30363d' : '#d1d5db'),
          position: 'relative',
          cursor: 'pointer',
          transition: 'background-color 0.2s ease',
          flexShrink: 0,
        }}
      >
        <div style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '24px' : '3px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: '#ffffff',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* ──────────────────────────────────────────── */}
      {/* Section 1: Restaurant Configuration         */}
      {/* ──────────────────────────────────────────── */}
      <div style={{
        backgroundColor: isDark ? '#161B22' : '#f9fafb',
        borderRadius: '12px',
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        padding: '32px',
        color: isDark ? '#ffffff' : '#1f2937'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings2 size={20} style={{ color: '#C99C63' }} />
            Restaurant Configuration
          </h2>
          {hasChanges && (
            <span style={{ fontSize: '0.75rem', color: '#C99C63', fontWeight: 600, padding: '4px 12px', backgroundColor: isDark ? 'rgba(201,156,99,0.1)' : 'rgba(201,156,99,0.1)', borderRadius: '20px' }}>
              Unsaved Changes
            </span>
          )}
        </div>
        <p style={{ color: isDark ? '#8b949e' : '#6b7280', marginBottom: '28px', fontSize: '0.95rem' }}>
          Manage your restaurant&apos;s operating hours, booking policies, and feature toggles.
        </p>

        <div style={{ display: 'grid', gap: '24px', maxWidth: '900px' }}>

          {/* Operating Hours */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}><Clock size={16} style={{ color: '#C99C63' }} /> Operating Hours</h3>
            <p style={sectionDescStyle}>Set when your restaurant accepts reservations.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Opening Time</label>
                <input
                  type="time"
                  value={settings.openingTime}
                  onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Closing Time</label>
                <input
                  type="time"
                  value={settings.closingTime}
                  onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Booking Policy */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}><CalendarDays size={16} style={{ color: '#C99C63' }} /> Booking Policy</h3>
            <p style={sectionDescStyle}>Control reservation size, duration, and advance booking windows.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Max Party Size</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.maxPartySize}
                  onChange={(e) => setSettings({ ...settings, maxPartySize: parseInt(e.target.value) || 1 })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Reservation Duration (min)</label>
                <input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={settings.defaultReservationDurationMin}
                  onChange={(e) => setSettings({ ...settings, defaultReservationDurationMin: parseInt(e.target.value) || 90 })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="PKR">PKR (₨)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <label style={labelStyle}>Min Advance Booking (hours)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.minAdvanceBookingHours}
                  onChange={(e) => setSettings({ ...settings, minAdvanceBookingHours: parseInt(e.target.value) || 0 })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Max Advance Booking (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={settings.maxAdvanceBookingDays}
                  onChange={(e) => setSettings({ ...settings, maxAdvanceBookingDays: parseInt(e.target.value) || 30 })}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}><Settings2 size={16} style={{ color: '#C99C63' }} /> Feature Toggles</h3>
            <p style={sectionDescStyle}>Enable or disable key restaurant features.</p>
            <div style={{ borderTop: `1px solid ${isDark ? '#21262d' : '#f3f4f6'}` }}>
              <ToggleSwitch
                checked={settings.allowWalkIns}
                onChange={(v) => setSettings({ ...settings, allowWalkIns: v })}
                label="Allow Walk-In Reservations"
              />
              <div style={{ borderTop: `1px solid ${isDark ? '#21262d' : '#f3f4f6'}` }} />
              <ToggleSwitch
                checked={settings.allowMergeableTables}
                onChange={(v) => setSettings({ ...settings, allowMergeableTables: v })}
                label="Allow Table Merging"
              />
              <div style={{ borderTop: `1px solid ${isDark ? '#21262d' : '#f3f4f6'}` }} />
              <ToggleSwitch
                checked={settings.requirePayment}
                onChange={(v) => setSettings({ ...settings, requirePayment: v })}
                label="Require Payment for Premium Tables"
              />
            </div>
          </div>

          {/* Cancellation Policy */}
          <div style={cardStyle}>
            <h3 style={sectionTitleStyle}><FileText size={16} style={{ color: '#C99C63' }} /> Cancellation Policy</h3>
            <p style={sectionDescStyle}>Define the cancellation terms shown to guests during booking.</p>
            <textarea
              value={settings.cancellationPolicy}
              onChange={(e) => setSettings({ ...settings, cancellationPolicy: e.target.value })}
              placeholder="e.g. Free cancellation up to 2 hours before your reservation. Late cancellations may incur a fee."
              style={{
                ...inputStyle,
                minHeight: '100px',
                resize: 'vertical' as const,
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Save Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings || !hasChanges}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 28px',
                backgroundColor: (!hasChanges || savingSettings) ? (isDark ? '#21262d' : '#e5e7eb') : '#C99C63',
                color: (!hasChanges || savingSettings) ? (isDark ? '#484f58' : '#9ca3af') : '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: (!hasChanges || savingSettings) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Save size={16} />
              {savingSettings ? 'Saving...' : 'Save Configuration'}
            </button>
            {saveSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.875rem', fontWeight: 500, animation: 'fadeIn 0.3s ease' }}>
                <Check size={16} />
                Settings saved successfully
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* Section 2: Payment Gateway Settings          */}
      {/* ──────────────────────────────────────────── */}
      <div style={{
        backgroundColor: isDark ? '#161B22' : '#f9fafb',
        borderRadius: '12px',
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        padding: '32px',
        color: isDark ? '#ffffff' : '#1f2937'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '24px' }}>
          Payment Gateway Settings
        </h2>
        <p style={{ color: isDark ? '#8b949e' : '#6b7280', marginBottom: '32px', fontSize: '0.95rem' }}>
          Connect your Stripe account to securely receive payments directly from premium reservations. No API keys required.
        </p>

        <div style={{ display: 'grid', gap: '24px', maxWidth: '800px' }}>
          <div style={cardStyle}>
            <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} style={{ color: '#C99C63' }} /> Stripe Integration
            </h3>

            {settings.stripeOnboardingComplete ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ padding: '8px', backgroundColor: '#10b981', color: '#fff', borderRadius: '50%' }}>
                    <Check size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: isDark ? '#fff' : '#111827' }}>Connected to Stripe</h4>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: isDark ? '#a1a1aa' : '#6b7280' }}>Your restaurant is ready to process immediate payouts for reservations.</p>
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <label style={labelStyle}>One-Time Premium VIP Membership Fee</label>
                  <p style={{ color: isDark ? '#8b949e' : '#6b7280', fontSize: '0.85rem', marginBottom: '8px', marginTop: 0 }}>
                    Set the price users must pay to unlock Premium VIP status at your restaurant, which grants them access to premium table reservations.
                  </p>
                  <div style={{ position: 'relative', maxWidth: '300px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: isDark ? '#a1a1aa' : '#6b7280' }}>
                      {settings.currency === 'GBP' ? '£' : settings.currency === 'USD' ? '$' : settings.currency === 'EUR' ? '€' : ''}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.50"
                      value={settings.vipMembershipFee || 15}
                      onChange={(e) => setSettings({ ...settings, vipMembershipFee: parseFloat(e.target.value) || 0 })}
                      style={{
                        ...inputStyle,
                        paddingLeft: (settings.currency === 'GBP' || settings.currency === 'USD' || settings.currency === 'EUR') ? '28px' : '16px'
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: isDark ? '#8b949e' : '#6b7280', fontSize: '0.875rem', marginBottom: '24px' }}>
                  You currently have no payment gateway connected. Customers will not be able to pay for premium tables. Click below to securely connect your bank via Stripe.
                </p>
                <button
                  onClick={handleConnectStripe}
                  disabled={connectingStripe}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    backgroundColor: '#6366f1',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: connectingStripe ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: connectingStripe ? 0.7 : 1
                  }}
                >
                  {connectingStripe ? 'Redirecting to Stripe...' : 'Connect with Stripe'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────── */}
      {/* Section 3: System Credentials & Links        */}
      {/* ──────────────────────────────────────────── */}
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
          <div style={cardStyle}>
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
          <div style={cardStyle}>
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
          <div style={cardStyle}>
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
    </div>
  )
}
