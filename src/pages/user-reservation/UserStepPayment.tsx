import type { ReservationData } from './UserReservationWizard'

interface UserStepPaymentProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
}

export default function UserStepPayment({ data }: UserStepPaymentProps) {
  const total = (data.tableFee || 0) + (data.tableFee ? 2.50 : 0)

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', marginTop: 0 }}>Secure Your Reservation</h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '24px', marginTop: 0 }}>
        Review the charges below. You'll be taken to a secure Stripe checkout to complete payment.
      </p>

      <div style={{ border: '1px solid #30363d', borderRadius: '12px', padding: '24px', backgroundColor: 'rgba(255, 255, 255, 0.03)', maxWidth: '480px', margin: '0 auto' }}>
        <h4 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9rem', marginTop: 0, marginBottom: '16px' }}>Order Summary</h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>Date</span>
            <span style={{ color: '#ffffff' }}>
              {data.date ? new Date(
                data.date.includes('/')
                  ? `${data.date.split('/')[2]}-${data.date.split('/')[1]}-${data.date.split('/')[0]}T12:00:00`
                  : `${data.date}T12:00:00`
              ).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>Time</span>
            <span style={{ color: '#ffffff' }}>{data.time || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>Guests</span>
            <span style={{ color: '#ffffff' }}>{data.guests}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>Table</span>
            <span style={{ color: '#ffffff' }}>{data.tableName || 'Premium Table'}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #30363d', marginTop: '16px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>Table Deposit</span>
            <span style={{ color: '#ffffff' }}>£{(data.tableFee || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#8b949e' }}>Service Fee</span>
            <span style={{ color: '#ffffff' }}>£{(data.tableFee ? 2.50 : 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid #30363d', paddingTop: '10px', marginTop: '4px' }}>
            <span style={{ color: '#C99C63' }}>Total Payable</span>
            <span style={{ color: '#C99C63' }}>£{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B9E78" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
        <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>
          Payment is securely processed by Stripe. Click <strong style={{ color: '#ffffff' }}>Confirm Reservation</strong> to proceed.
        </span>
      </div>
    </div>
  )
}
