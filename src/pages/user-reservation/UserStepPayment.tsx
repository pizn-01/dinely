import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import type { ReservationData } from './UserReservationWizard'

interface UserStepPaymentProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
}

export default function UserStepPayment({ data, updateData }: UserStepPaymentProps) {
  const [showFailedModal, setShowFailedModal] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<string | null>(data.paymentMethod)

  const handleSelect = (method: string) => {
    setSelectedMethod(method)
    updateData({ paymentMethod: method })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px', marginTop: 0 }}>Secure Your Reservation</h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '24px', marginTop: 0 }}>
        Complete the payment to confirm your premium table booking.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Payment Methods */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { id: 'apple', label: 'Apple Pay', icon: '' },
            { id: 'google', label: 'Google Pay', icon: 'G' },
            { id: 'stripe', label: 'Pay with Stripe', icon: '' },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelect(method.id)}
              style={{
                width: '100%',
                padding: '20px',
                borderRadius: '12px',
                border: selectedMethod === method.id ? '1px solid #C99C63' : '1px solid #30363d',
                backgroundColor: selectedMethod === method.id ? 'rgba(201, 156, 99, 0.1)' : 'transparent',
                textAlign: 'center',
                color: '#ffffff',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {method.id === 'apple' && <span style={{ fontSize: '1.125rem', fontWeight: 600 }}> Pay</span>}
              {method.id === 'google' && <span style={{ fontSize: '1.125rem' }}><span style={{ color: '#4285F4' }}>G</span> Pay</span>}
              {method.id === 'stripe' && <span style={{ fontSize: '1.125rem' }}>Pay with <span style={{ fontWeight: 700, color: '#6366f1' }}>stripe</span></span>}
            </button>
          ))}

          <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '16px', marginBottom: 0 }}>
            All payments are securely processed through our trusted payment partners.
          </p>
          <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: 0 }}>
            Your payment information is encrypted and never stored on our servers.
          </p>
        </div>

        {/* Order Summary */}
        <div style={{
          border: '1px solid #30363d',
          borderRadius: '12px',
          padding: '24px',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#ffffff' }}>Date</span>
              <span style={{ color: '#8b949e' }}>
                {data.date ? new Date(
                  data.date.includes('/')
                    ? `${data.date.split('/')[2]}-${data.date.split('/')[1]}-${data.date.split('/')[0]}T12:00:00`
                    : `${data.date}T12:00:00`
                ).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#ffffff' }}>Time</span>
              <span style={{ color: '#8b949e' }}>{data.time || '17:00'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#ffffff' }}>Guest</span>
              <span style={{ color: '#8b949e' }}>{data.guests}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#ffffff' }}>Table Type</span>
              <span style={{ color: '#8b949e' }}>{data.tableName || 'Table 8'}</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #30363d', marginTop: '16px', paddingTop: '16px' }}>
            <h4 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', marginBottom: '12px', marginTop: 0 }}>Charges</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8b949e' }}>Table Deposit</span>
                <span style={{ color: '#ffffff' }}>£{(data.tableFee || 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8b949e' }}>Service Fee</span>
                <span style={{ color: '#ffffff' }}>£{(data.tableFee ? 2.50 : 0).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span style={{ color: '#C99C63' }}>Total Payable Today</span>
                <span style={{ color: '#C99C63' }}>£{((data.tableFee || 0) + (data.tableFee ? 2.50 : 0)).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Failed Modal */}
      {showFailedModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            position: 'relative',
            backgroundColor: '#101A1C',
            border: '1px solid #30363d',
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            textAlign: 'center'
          }}>
            <button
              onClick={() => setShowFailedModal(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', color: '#8b949e', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff', margin: '0 0 16px 0' }}>Payment Failed</h3>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(255, 123, 114, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={24} style={{ color: '#ff7b72' }} />
            </div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>Payment Unsuccessful!</h4>
            <p style={{ fontSize: '0.875rem', color: '#8b949e', margin: '0 0 24px 0' }}>
              We couldn't process your payment.<br />
              Please try again or use a different method
            </p>
            <button
              onClick={() => setShowFailedModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: '#C99C63',
                color: '#ffffff',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
