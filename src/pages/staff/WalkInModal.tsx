import React, { useState, useEffect, useCallback } from 'react'
import { X, UserCheck, Users, Minus, Plus, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../../services/api'
import { toast } from 'react-hot-toast'

interface AvailableTable {
  id: string
  name: string
  tableNumber: string
  capacity: number
  areaName?: string | null
}

interface WalkInModalProps {
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
  isDark?: boolean
}

const getLocalISODate = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getCurrentTimeRounded = () => {
  const now = new Date()
  const mins = now.getMinutes()
  const rounded = Math.floor(mins / 15) * 15
  return `${String(now.getHours()).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`
}

export default function WalkInModal({ restaurantId, onClose, onSuccess, isDark = true }: WalkInModalProps) {
  const [partySize, setPartySize] = useState(2)
  const [date, setDate] = useState(getLocalISODate())
  const [time, setTime] = useState(getCurrentTimeRounded())
  const [tableId, setTableId] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [specialRequest, setSpecialRequest] = useState('')

  const [tables, setTables] = useState<AvailableTable[]>([])
  const [tablesLoading, setTablesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchTables = useCallback(async () => {
    if (!date || !time) return
    setTablesLoading(true)
    setTableId(null)
    try {
      const { data: res } = await api.get(`/organizations/${restaurantId}/tables/availability`, {
        params: { date, time, partySize }
      })
      const fetched: AvailableTable[] = res?.data || res || []
      setTables(fetched)
      if (fetched.length === 1) setTableId(fetched[0].id)
    } catch {
      setTables([])
    } finally {
      setTablesLoading(false)
    }
  }, [restaurantId, date, time, partySize])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  const selectedTable = tables.find(t => t.id === tableId)

  const handleSubmit = async () => {
    if (!tableId) { setError('Please select a table.'); return }
    if (!phone.trim()) { setError('Phone number is required.'); return }
    if (partySize < 1) { setError('Party size must be at least 1.'); return }

    setError(null)
    setSubmitting(true)

    try {
      const payload = {
        reservationDate: date,
        startTime: time,
        partySize,
        tableId,
        guestFirstName: firstName.trim() || 'Walk-in',
        guestLastName: lastName.trim() || '',
        guestEmail: email.trim() || undefined,
        guestPhone: phone.trim(),
        specialRequests: specialRequest.trim() || undefined,
        source: 'walk_in',
      }

      const { data: createRes } = await api.post(`/organizations/${restaurantId}/reservations`, payload)
      const newId = createRes?.data?.id || createRes?.id

      if (newId) {
        await api.patch(`/organizations/${restaurantId}/reservations/${newId}/status`, { status: 'seated' })
      }

      const tableName = selectedTable?.name || selectedTable?.tableNumber || 'table'
      toast.success(`Walk-in seated at ${tableName}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to seat walk-in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── styling tokens ──────────────────────────────────────────────────────────
  const bg = 'var(--bg-secondary, #161b22)'
  const bgInput = 'var(--bg-primary, #0d1117)'
  const border = 'var(--border-color, #30363d)'
  const textPrimary = 'var(--text-primary, #e6edf3)'
  const textSecondary = 'var(--text-secondary, #8b949e)'
  const gold = '#C99C63'

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: `1px solid ${border}`,
    backgroundColor: bgInput,
    color: textPrimary,
    fontSize: '0.875rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    fontWeight: 500,
    color: textSecondary,
    marginBottom: '5px',
    display: 'block',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        backgroundColor: bg,
        borderRadius: '16px',
        border: `1px solid ${border}`,
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '8px',
              backgroundColor: 'rgba(201,156,99,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCheck size={18} style={{ color: gold }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: textPrimary }}>Walk-in</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: textSecondary }}>Seat a guest immediately</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: textSecondary, padding: '4px', borderRadius: '6px',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>

          {/* Row 1: Party Size + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            {/* Party Size */}
            <div>
              <label style={labelStyle}>Party Size</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setPartySize(p => Math.max(1, p - 1))}
                  style={{
                    width: '34px', height: '36px', borderRadius: '8px',
                    border: `1px solid ${border}`, background: bgInput,
                    color: textPrimary, cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                ><Minus size={14} /></button>
                <div style={{
                  flex: 1, textAlign: 'center', padding: '8px',
                  borderRadius: '8px', border: `1px solid ${border}`,
                  background: bgInput, color: textPrimary,
                  fontSize: '0.875rem', fontWeight: 600,
                }}>
                  <Users size={13} style={{ verticalAlign: 'middle', marginRight: '4px', color: textSecondary }} />
                  {partySize}
                </div>
                <button
                  onClick={() => setPartySize(p => Math.min(20, p + 1))}
                  style={{
                    width: '34px', height: '36px', borderRadius: '8px',
                    border: `1px solid ${border}`, background: bgInput,
                    color: textPrimary, cursor: 'pointer', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                ><Plus size={14} /></button>
              </div>
            </div>
            {/* Date */}
            <div>
              <label style={labelStyle}>Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Row 2: Time */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Time</label>
            <input
              type="time"
              value={time}
              step="900"
              onChange={e => setTime(e.target.value)}
              style={{ ...inputStyle, maxWidth: '160px' }}
            />
          </div>

          {/* Available Tables */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Table
              {tablesLoading && <Loader2 size={12} className="animate-spin" style={{ marginLeft: '6px', verticalAlign: 'middle', color: gold }} />}
            </label>
            {tablesLoading ? (
              <div style={{ padding: '12px', textAlign: 'center', color: textSecondary, fontSize: '0.8rem' }}>
                Checking availability...
              </div>
            ) : tables.length === 0 ? (
              <div style={{
                padding: '10px 12px', borderRadius: '8px',
                border: `1px solid rgba(201,156,99,0.3)`,
                backgroundColor: 'rgba(201,156,99,0.06)',
                color: '#C99C63', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <AlertCircle size={14} />
                No tables available for {partySize} guest{partySize !== 1 ? 's' : ''} at this time
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {tables.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTableId(t.id)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: tableId === t.id ? `1.5px solid ${gold}` : `1px solid ${border}`,
                      backgroundColor: tableId === t.id ? 'rgba(201,156,99,0.12)' : bgInput,
                      color: tableId === t.id ? gold : textPrimary,
                      fontSize: '0.8rem', fontWeight: tableId === t.id ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    {t.name || t.tableNumber}
                    <span style={{ color: textSecondary, fontSize: '0.72rem' }}>· {t.capacity} seats</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: border, margin: '4px 0 16px' }} />

          {/* Guest Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>First Name <span style={{ color: textSecondary, fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                placeholder="Jane"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Last Name <span style={{ color: textSecondary, fontWeight: 400 }}>(optional)</span></label>
              <input
                type="text"
                placeholder="Smith"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>
                Phone <span style={{ color: '#e05252', fontSize: '0.7rem' }}>*</span>
              </label>
              <input
                type="tel"
                placeholder="+44 7700 000000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Email <span style={{ color: textSecondary, fontWeight: 400 }}>(optional)</span></label>
              <input
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '4px' }}>
            <label style={labelStyle}>Special Requests <span style={{ color: textSecondary, fontWeight: 400 }}>(optional)</span></label>
            <textarea
              placeholder="Allergies, accessibility needs, etc."
              value={specialRequest}
              onChange={e => setSpecialRequest(e.target.value)}
              rows={2}
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              marginTop: '12px', padding: '10px 12px', borderRadius: '8px',
              backgroundColor: 'rgba(224,82,82,0.08)',
              border: '1px solid rgba(224,82,82,0.3)',
              color: '#e05252', fontSize: '0.8rem',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: `1px solid ${border}`,
          display: 'flex', gap: '12px', justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: '9px 20px', borderRadius: '8px',
              border: `1px solid ${border}`, background: 'transparent',
              color: textSecondary, fontSize: '0.875rem', cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || tablesLoading}
            style={{
              padding: '9px 24px', borderRadius: '8px',
              border: 'none', background: gold,
              color: '#0B1517', fontSize: '0.875rem',
              fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'opacity 0.15s',
            }}
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> Seating...</>
            ) : (
              <><UserCheck size={15} /> Seat Walk-in</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
