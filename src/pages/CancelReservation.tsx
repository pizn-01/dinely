import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X, Check, AlertCircle } from 'lucide-react'
import { api } from '../services/api'
import { toast } from 'react-hot-toast'

export default function CancelReservation() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [reservation, setReservation] = useState<any>(null)
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!reservationId) {
      navigate('/')
      return
    }

    const fetchReservation = async () => {
      try {
        const { data } = await api.get(`/public/reservations/${reservationId}`)
        if (data.data) {
          setReservation(data.data)
        } else {
          toast.error('Reservation not found')
          navigate('/')
        }
      } catch (error: any) {
        console.error('Failed to fetch reservation:', error)
        toast.error(error?.response?.data?.error || 'Failed to load reservation')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    fetchReservation()
  }, [reservationId, navigate])

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }

    try {
      setCancelling(true)
      await api.post(`/public/reservations/${reservationId}/cancel`, {
        reason: reason.trim()
      })
      
      setConfirmed(true)
      toast.success('Reservation cancelled successfully')
    } catch (error: any) {
      console.error('Failed to cancel reservation:', error)
      toast.error(error?.response?.data?.error || 'Failed to cancel reservation')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        color: '#374151'
      }}>
        <div>Loading reservation details...</div>
      </div>
    )
  }

  if (confirmed) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#10b981',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto'
          }}>
            <Check size={40} color="#ffffff" />
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            margin: '0 0 16px 0'
          }}>
            Reservation Cancelled
          </h1>
          <p style={{
            color: '#6b7280',
            lineHeight: 1.6,
            margin: '0 0 32px 0'
          }}>
            Your reservation has been successfully cancelled. A confirmation email has been sent to you.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#111827',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Return to Homepage
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#111827',
            margin: 0
          }}>
            Cancel Reservation
          </h1>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {reservation && (
          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h2 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#111827',
              margin: '0 0 16px 0'
            }}>
              Reservation Details
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Restaurant:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {reservation.restaurant?.name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Date:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {new Date(reservation.reservation_date).toLocaleDateString()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Time:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {reservation.start_time}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#6b7280' }}>Party Size:</span>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {reservation.party_size} guests
                </span>
              </div>
              {reservation.tables && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>Table:</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>
                    {reservation.tables.name || reservation.tables.table_number}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '8px'
          }}>
            Reason for Cancellation *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please let us know why you need to cancel this reservation..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
            <strong>Please note:</strong> Once cancelled, this reservation cannot be restored. You will need to make a new reservation if you change your mind.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Keep Reservation
          </button>
          <button
            onClick={handleCancel}
            disabled={cancelling || !reason.trim()}
            style={{
              flex: 1,
              backgroundColor: cancelling ? '#9ca3af' : '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: (cancelling || !reason.trim()) ? 'not-allowed' : 'pointer',
              opacity: (cancelling || !reason.trim()) ? 0.6 : 1
            }}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Reservation'}
          </button>
        </div>
      </div>
    </div>
  )
}
