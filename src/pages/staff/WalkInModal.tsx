import React, { useState, useEffect, useCallback } from 'react'
import { X, UserCheck, Users, Minus, Plus, AlertCircle, Loader2, Clock, Calendar, ChevronRight, Layers, Check, Info } from 'lucide-react'
import { api } from '../../services/api'
import { toast } from 'react-hot-toast'
import { openNativePicker } from '../../utils/nativePicker'

interface AvailableTable {
  id: string
  name: string
  tableNumber: string
  capacity: number
  isMergeable: boolean
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const getCurrentTimeRounded = () => {
  const now = new Date()
  const rounded = Math.floor(now.getMinutes() / 15) * 15
  return `${String(now.getHours()).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`
}

type TableMode = 'single' | 'merge'

export default function WalkInModal({ restaurantId, onClose, onSuccess, isDark = true }: WalkInModalProps) {
  const [partySize, setPartySize] = useState(2)
  const [date, setDate] = useState(getLocalISODate())
  const [time, setTime] = useState(getCurrentTimeRounded())

  // Single-select
  const [tableId, setTableId] = useState<string | null>(null)
  // Merge multi-select
  const [tableMode, setTableMode] = useState<TableMode>('single')
  const [mergeSelection, setMergeSelection] = useState<Set<string>>(new Set())

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
    setMergeSelection(new Set())
    try {
      const { data: res } = await api.get(`/organizations/${restaurantId}/tables/availability`, {
        params: { date, time, partySize }
      })
      const fetched: AvailableTable[] = res?.data || res || []
      setTables(fetched)
      if (fetched.length === 1 && tableMode === 'single') setTableId(fetched[0].id)
    } catch {
      setTables([])
    } finally {
      setTablesLoading(false)
    }
  }, [restaurantId, date, time, partySize, tableMode])

  useEffect(() => { fetchTables() }, [fetchTables])

  const mergeableTables = tables.filter(t => t.isMergeable)
  const mergeCapacity = tables
    .filter(t => mergeSelection.has(t.id))
    .reduce((sum, t) => sum + t.capacity, 0)

  const toggleMergeTable = (id: string) => {
    setMergeSelection(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectedTable = tables.find(t => t.id === tableId)

  const isReadyToSubmit = tableMode === 'single'
    ? !!tableId
    : mergeSelection.size >= 2

  const handleSubmit = async () => {
    if (partySize < 1) { setError('Party size must be at least 1.'); return }

    if (tableMode === 'single') {
      if (!tableId) { setError('Please select a table.'); return }
    } else {
      if (mergeSelection.size < 2) { setError('Select at least 2 mergeable tables to merge.'); return }
    }

    setError(null)
    setSubmitting(true)

    try {
      let finalTableId = tableId

      // ── Merge mode: create merged table first ──────────────────────────────
      if (tableMode === 'merge') {
        const selectedIds = Array.from(mergeSelection)
        const selectedTableRows = tables.filter(t => selectedIds.includes(t.id))
        const combinedCapacity = selectedTableRows.reduce((s, t) => s + t.capacity, 0)
        const autoName = selectedTableRows.map(t => t.name || t.tableNumber).join(' + ')

        const { data: mergeRes } = await api.post(`/organizations/${restaurantId}/tables/merge`, {
          sourceTableIds: selectedIds,
          mergedTable: { name: autoName, capacity: combinedCapacity },
          mergeEffectiveFrom: date,
        })
        finalTableId = mergeRes?.data?.id || mergeRes?.id || null
        if (!finalTableId) throw new Error('Merge did not return a table ID.')
      }

      // ── Create reservation ──────────────────────────────────────────────────
      const payload = {
        reservationDate: date,
        startTime: time,
        partySize,
        tableId: finalTableId,
        guestFirstName: firstName.trim() || 'Walk-in',
        guestLastName: lastName.trim() || '',
        guestEmail: email.trim() || undefined,
        guestPhone: phone.trim() || undefined,
        specialRequests: specialRequest.trim() || undefined,
        source: 'walk_in',
      }

      const { data: createRes } = await api.post(`/organizations/${restaurantId}/reservations`, payload)
      const newId = createRes?.data?.id || createRes?.id

      if (newId) {
        await api.patch(`/organizations/${restaurantId}/reservations/${newId}/status`, { status: 'seated' })
      }

      const label = tableMode === 'merge'
        ? tables.filter(t => mergeSelection.has(t.id)).map(t => t.name || t.tableNumber).join(' + ')
        : selectedTable?.name || selectedTable?.tableNumber || 'table'

      toast.success(`Walk-in seated at ${label}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to seat walk-in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const gold = '#C99C63'
  const bg = 'var(--bg-secondary, #161b22)'
  const bgInput = 'var(--bg-primary, #0d1117)'
  const bgCard = 'var(--bg-card, #1c2128)'
  const border = 'var(--border-color, #30363d)'
  const textPrimary = 'var(--text-primary, #e6edf3)'
  const textSecondary = 'var(--text-secondary, #8b949e)'

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: `1px solid ${border}`, backgroundColor: bgInput,
    color: textPrimary, fontSize: '0.875rem', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', fontWeight: 600, color: textSecondary,
    marginBottom: '6px', display: 'block',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  }

  const sectionStyle: React.CSSProperties = {
    padding: '16px 24px',
    borderBottom: `1px solid ${border}`,
  }

  return (
    <>
      <style>{`
        .walkin-field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .walkin-datetime-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .walkin-table-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .walkin-party-step:hover { border-color: ${gold} !important; }
        .walkin-input:focus { border-color: ${gold} !important; }
        .walkin-table-card:hover { border-color: ${gold} !important; }
        @media (max-width: 500px) {
          .walkin-field-grid { grid-template-columns: 1fr !important; }
          .walkin-datetime-grid { grid-template-columns: 1fr !important; }
          .walkin-table-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 1000,
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001,
        width: 'min(560px, calc(100vw - 24px))',
        maxHeight: 'min(90vh, 820px)',
        display: 'flex', flexDirection: 'column',
        backgroundColor: bg, borderRadius: '16px',
        border: `1px solid ${border}`,
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: 'rgba(201,156,99,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserCheck size={19} style={{ color: gold }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: textPrimary }}>Walk-in Seating</h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: textSecondary }}>Seat a guest immediately</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: textSecondary, padding: '6px', borderRadius: '6px',
            display: 'flex', alignItems: 'center',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ── Section 1: Party + Date + Time ── */}
          <div style={sectionStyle}>
            <p style={{ ...labelStyle, marginBottom: '12px' }}>Booking Details</p>

            {/* Party size stepper */}
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Party Size</label>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px',
                border: `1px solid ${border}`, backgroundColor: bgInput,
              }}>
                <button className="walkin-party-step" onClick={() => setPartySize(p => Math.max(1, p - 1))} style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  border: `1px solid ${border}`, background: bgCard,
                  color: textPrimary, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.15s',
                }}><Minus size={14} /></button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={16} style={{ color: gold }} />
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: textPrimary, minWidth: '24px', textAlign: 'center' }}>
                    {partySize}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: textSecondary }}>
                    {partySize === 1 ? 'guest' : 'guests'}
                  </span>
                </div>

                <button className="walkin-party-step" onClick={() => setPartySize(p => Math.min(20, p + 1))} style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  border: `1px solid ${border}`, background: bgCard,
                  color: textPrimary, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'border-color 0.15s',
                }}><Plus size={14} /></button>
              </div>
            </div>

            {/* Date + Time */}
            <div className="walkin-datetime-grid">
              <div>
                <label style={labelStyle}>
                  <Calendar size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Date
                </label>
                <input className={`walkin-input ${isDark ? 'native-picker-dark' : ''}`} type="date" value={date} onClick={openNativePicker}
                  onChange={e => setDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>
                  <Clock size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Time
                </label>
                <input className={`walkin-input ${isDark ? 'native-picker-dark' : ''}`} type="time" value={time} step="900" onClick={openNativePicker}
                  onChange={e => setTime(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* ── Section 2: Table Selection ── */}
          <div style={sectionStyle}>
            {/* Section header + mode toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ ...labelStyle, margin: 0 }}>Select Table</p>
                {tablesLoading && (
                  <span style={{ fontSize: '0.72rem', color: textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Loader2 size={11} className="animate-spin" style={{ color: gold }} />Checking…
                  </span>
                )}
                {!tablesLoading && tables.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: textSecondary }}>{tables.length} available</span>
                )}
              </div>

              {/* Mode toggle — only shown when there are ≥2 mergeable tables */}
              {mergeableTables.length >= 2 && (
                <div style={{
                  display: 'flex', borderRadius: '8px',
                  border: `1px solid ${border}`, overflow: 'hidden',
                }}>
                  {([
                    { key: 'single' as TableMode, label: 'Single' },
                    { key: 'merge' as TableMode, label: 'Merge', icon: <Layers size={11} /> },
                  ] as { key: TableMode; label: string; icon?: React.ReactNode }[]).map(({ key, label, icon }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setTableMode(key)
                        setTableId(null)
                        setMergeSelection(new Set())
                      }}
                      style={{
                        padding: '5px 12px', border: 'none', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '4px',
                        backgroundColor: tableMode === key ? gold : 'transparent',
                        color: tableMode === key ? '#0B1517' : textSecondary,
                        transition: 'all 0.15s',
                      }}
                    >
                      {icon}{label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Merge mode hint */}
            {tableMode === 'merge' && (
              <div style={{
                marginBottom: '12px', padding: '10px 12px', borderRadius: '8px',
                backgroundColor: 'rgba(201,156,99,0.06)',
                border: `1px solid rgba(201,156,99,0.2)`,
                display: 'flex', gap: '8px', alignItems: 'flex-start',
                fontSize: '0.78rem', color: textSecondary,
              }}>
                <Info size={13} style={{ color: gold, flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Select <strong style={{ color: textPrimary }}>2 or more</strong> mergeable tables.
                  Tables will be joined and the combined seat count used.
                  Remember to <strong style={{ color: textPrimary }}>unmerge</strong> from the floor map after the party leaves.
                </span>
              </div>
            )}

            {/* Table grid */}
            {tablesLoading ? (
              <div className="walkin-table-grid">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={{
                    height: '56px', borderRadius: '10px',
                    backgroundColor: bgCard, border: `1px solid ${border}`,
                    opacity: 0.4,
                  }} />
                ))}
              </div>
            ) : tables.length === 0 ? (
              <div style={{
                padding: '14px 16px', borderRadius: '10px',
                border: `1px solid rgba(201,156,99,0.25)`,
                backgroundColor: 'rgba(201,156,99,0.05)',
                color: '#C99C63', fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                No tables available for {partySize} guest{partySize !== 1 ? 's' : ''} at this time
              </div>
            ) : tableMode === 'single' ? (
              /* ── Single select grid ── */
              <div className="walkin-table-grid">
                {tables.map(t => {
                  const isSelected = tableId === t.id
                  return (
                    <button key={t.id} className="walkin-table-card" onClick={() => setTableId(t.id)} style={{
                      padding: '10px 12px', borderRadius: '10px',
                      border: isSelected ? `1.5px solid ${gold}` : `1px solid ${border}`,
                      backgroundColor: isSelected ? 'rgba(201,156,99,0.1)' : bgCard,
                      color: textPrimary, cursor: 'pointer', textAlign: 'left',
                      transition: 'all 0.15s',
                      display: 'flex', flexDirection: 'column', gap: '3px',
                    }}>
                      <span style={{
                        fontSize: '0.82rem', fontWeight: 600,
                        color: isSelected ? gold : textPrimary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {t.name || t.tableNumber}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: textSecondary }}>{t.capacity} seats</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              /* ── Merge multi-select grid ── */
              <div className="walkin-table-grid">
                {tables.map(t => {
                  const isSelected = mergeSelection.has(t.id)
                  const canSelect = t.isMergeable
                  return (
                    <button
                      key={t.id}
                      className="walkin-table-card"
                      onClick={() => canSelect && toggleMergeTable(t.id)}
                      disabled={!canSelect}
                      style={{
                        padding: '10px 12px', borderRadius: '10px',
                        border: isSelected
                          ? `1.5px solid ${gold}`
                          : `1px solid ${border}`,
                        backgroundColor: isSelected
                          ? 'rgba(201,156,99,0.1)'
                          : !canSelect ? 'rgba(255,255,255,0.02)' : bgCard,
                        color: textPrimary, cursor: canSelect ? 'pointer' : 'not-allowed',
                        textAlign: 'left', transition: 'all 0.15s',
                        display: 'flex', flexDirection: 'column', gap: '3px',
                        opacity: canSelect ? 1 : 0.4,
                        position: 'relative',
                      }}
                    >
                      {/* Check badge */}
                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: '6px', right: '6px',
                          width: '16px', height: '16px', borderRadius: '50%',
                          backgroundColor: gold,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Check size={10} style={{ color: '#0B1517' }} />
                        </div>
                      )}
                      <span style={{
                        fontSize: '0.82rem', fontWeight: 600,
                        color: isSelected ? gold : textPrimary,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        paddingRight: isSelected ? '20px' : '0',
                      }}>
                        {t.name || t.tableNumber}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: textSecondary }}>
                        {t.capacity} seats{!canSelect ? ' · not mergeable' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Selection summary */}
            {tableMode === 'single' && selectedTable && (
              <div style={{
                marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                backgroundColor: 'rgba(201,156,99,0.08)',
                border: `1px solid rgba(201,156,99,0.2)`,
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.78rem', color: gold, fontWeight: 600,
              }}>
                <ChevronRight size={13} />
                {selectedTable.name || selectedTable.tableNumber} · {selectedTable.capacity} seats selected
              </div>
            )}

            {tableMode === 'merge' && mergeSelection.size >= 2 && (
              <div style={{
                marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
                backgroundColor: 'rgba(201,156,99,0.08)',
                border: `1px solid rgba(201,156,99,0.2)`,
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.78rem', color: gold, fontWeight: 600,
              }}>
                <Layers size={13} />
                {tables.filter(t => mergeSelection.has(t.id)).map(t => t.name || t.tableNumber).join(' + ')}
                &nbsp;·&nbsp;{mergeCapacity} seats combined
              </div>
            )}

            {tableMode === 'merge' && mergeSelection.size === 1 && (
              <div style={{
                marginTop: '10px', fontSize: '0.75rem', color: textSecondary,
                padding: '6px 0',
              }}>
                Select one more table to merge
              </div>
            )}
          </div>

          {/* ── Section 3: Guest Details ── */}
          <div style={{ ...sectionStyle, borderBottom: 'none' }}>
            <p style={{ ...labelStyle, marginBottom: '12px' }}>Guest Details</p>

            <div className="walkin-field-grid" style={{ marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>
                  First Name <span style={{ color: textSecondary, textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <input className="walkin-input" type="text" placeholder="Jane"
                  value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>
                  Last Name <span style={{ color: textSecondary, textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <input className="walkin-input" type="text" placeholder="Smith"
                  value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div className="walkin-field-grid" style={{ marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>
                  Phone <span style={{ color: textSecondary, textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <input className="walkin-input" type="tel" placeholder="+44 7700 000000"
                  value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>
                  Email <span style={{ color: textSecondary, textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <input className="walkin-input" type="email" placeholder="jane@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Special Requests <span style={{ color: textSecondary, textTransform: 'none', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea className="walkin-input" rows={2}
                placeholder="Allergies, high chair, accessibility needs…"
                value={specialRequest} onChange={e => setSpecialRequest(e.target.value)}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
            </div>

            {error && (
              <div style={{
                marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
                backgroundColor: 'rgba(224,82,82,0.08)',
                border: '1px solid rgba(224,82,82,0.25)',
                color: '#e05252', fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '14px 24px', borderTop: `1px solid ${border}`,
          display: 'flex', gap: '10px', flexShrink: 0, backgroundColor: bg,
        }}>
          <button onClick={onClose} disabled={submitting} style={{
            flex: 1, padding: '10px', borderRadius: '8px',
            border: `1px solid ${border}`, background: 'transparent',
            color: textSecondary, fontSize: '0.875rem', cursor: 'pointer', fontWeight: 500,
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || tablesLoading || !isReadyToSubmit}
            style={{
              flex: 2, padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: submitting || !isReadyToSubmit ? 'rgba(201,156,99,0.4)' : gold,
              color: '#0B1517', fontSize: '0.875rem', fontWeight: 700,
              cursor: submitting || !isReadyToSubmit ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'background 0.15s',
            }}
          >
            {submitting ? (
              <><Loader2 size={15} className="animate-spin" /> {tableMode === 'merge' ? 'Merging & Seating…' : 'Seating…'}</>
            ) : tableMode === 'merge' ? (
              <><Layers size={15} /> Merge & Seat Walk-in</>
            ) : (
              <><UserCheck size={15} /> Seat Walk-in</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
