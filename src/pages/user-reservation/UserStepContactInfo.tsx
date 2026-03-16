import type { ReservationData } from './UserReservationWizard'

interface UserStepContactInfoProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  backgroundColor: 'transparent',
  border: '1px solid #30363d',
  borderRadius: '8px',
  padding: '12px 16px',
  color: '#ffffff',
  fontSize: '1rem',
  fontFamily: 'Inter, system-ui, sans-serif',
  outline: 'none'
}

export default function UserStepContactInfo({ data, updateData }: UserStepContactInfoProps) {
  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', marginTop: 0 }}>
        Contact Information
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '24px', marginTop: 0 }}>
        Please provide your details for the reservation
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '24px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
            First Name
          </label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => updateData({ firstName: e.target.value })}
            placeholder="John"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
            Last Name
          </label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => updateData({ lastName: e.target.value })}
            placeholder="Doe"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
            Email
          </label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => updateData({ email: e.target.value })}
            placeholder="johndoe@example.com"
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
            Phone Number
          </label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => updateData({ phone: e.target.value })}
            placeholder="+1 (555) 000-000"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
          Special Request
        </label>
        <textarea
          value={data.specialRequest}
          onChange={(e) => updateData({ specialRequest: e.target.value })}
          placeholder="Any special requests or dietary requirements..."
          rows={5}
          style={{ 
            ...inputStyle,
            resize: 'none' as const,
          }}
        />
      </div>
    </div>
  )
}
