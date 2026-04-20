import { useState, useEffect } from 'react'
import { LifeBuoy, Send, MessageSquare, Clock, CheckCircle } from 'lucide-react'
import { api } from '../../../services/api'
import { toast } from 'react-hot-toast'

interface SupportTabProps {
  theme: 'dark' | 'light'
  orgId: string
}

export default function SupportTab({ theme, orgId }: SupportTabProps) {
  const isDark = theme === 'dark'
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTickets = async () => {
    try {
      const { data } = await api.get(`/organizations/${orgId}/support`)
      if (data?.tickets) {
        setTickets(data.tickets)
      }
    } catch (err) {
      console.error('Failed to fetch support tickets', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (orgId) fetchTickets()
  }, [orgId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      toast.error('Please provide a subject and message.')
      return
    }

    try {
      setSubmitting(true)
      await api.post(`/organizations/${orgId}/support`, { subject, message })
      toast.success('Support ticket submitted successfully!')
      setSubject('')
      setMessage('')
      fetchTickets()
    } catch (err) {
      console.error('Submit ticket error', err)
      toast.error('Failed to submit ticket.')
    } finally {
      setSubmitting(false)
    }
  }

  // Styles
  const cardBg = isDark ? '#161B22' : '#ffffff'
  const borderColor = isDark ? '#30363d' : '#e5e7eb'
  const textColor = isDark ? '#ffffff' : '#1f2937'
  const textMuted = isDark ? '#8b949e' : '#6b7280'
  const inputBg = isDark ? '#0d1117' : '#f9fafb'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
      
      {/* Submit Form */}
      <div style={{ backgroundColor: cardBg, borderRadius: '12px', padding: '32px', border: `1px solid ${borderColor}` }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: textColor, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LifeBuoy style={{ color: '#C99C63' }} size={24} /> Contact Support
        </h2>
        <p style={{ color: textMuted, fontSize: '0.9rem', marginBottom: '24px' }}>
          Need help? Experience a bug or have a feature request? Let our team know below.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: textColor, marginBottom: '8px' }}>Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="E.g. Issue with premium reservations"
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${borderColor}`,
                backgroundColor: inputBg, color: textColor, outline: 'none', fontSize: '0.95rem'
              }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: textColor, marginBottom: '8px' }}>Message Details</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue or feature request in detail..."
              rows={6}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${borderColor}`,
                backgroundColor: inputBg, color: textColor, outline: 'none', fontSize: '0.95rem', resize: 'vertical'
              }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '14px', borderRadius: '8px', backgroundColor: '#C99C63', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: '1rem', cursor: submitting ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: submitting ? 0.7 : 1
            }}
          >
            <Send size={18} /> {submitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>
      </div>

      {/* Ticket History */}
      <div style={{ backgroundColor: cardBg, borderRadius: '12px', padding: '32px', border: `1px solid ${borderColor}` }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: textColor, margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MessageSquare style={{ color: '#38bdf8' }} size={24} /> Ticket History
        </h3>

        {loading ? (
          <p style={{ color: textMuted }}>Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: textMuted }}>
            <CheckCircle size={48} style={{ margin: '0 auto 16px auto', opacity: 0.2 }} />
            <p>You haven't submitted any support tickets yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
            {tickets.map(ticket => (
              <div key={ticket.id} style={{ 
                padding: '20px', borderRadius: '8px', border: `1px solid ${borderColor}`, 
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: textColor }}>{ticket.subject}</h4>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase',
                    backgroundColor: ticket.status === 'open' ? 'rgba(250, 204, 21, 0.1)' : ticket.status === 'resolved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                    color: ticket.status === 'open' ? '#facc15' : ticket.status === 'resolved' ? '#22c55e' : '#38bdf8'
                  }}>
                    {ticket.status}
                  </span>
                </div>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: textMuted, whiteSpace: 'pre-wrap' }}>
                  {ticket.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: textMuted }}>
                  <Clock size={14} /> Submitted on {new Date(ticket.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
