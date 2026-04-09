import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Users, Clock, Phone, Mail, AlertCircle, Bell, UserCheck, XCircle, Trash2, ChevronDown } from 'lucide-react'
import { api } from '../../../services/api'
import { toast } from 'react-hot-toast'

interface WaitingListTabProps {
  theme: 'dark' | 'light'
  orgId: string
  serverToday?: string
}

interface WaitingEntry {
  id: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  partySize: number
  requestedDate: string
  requestedTime?: string
  preferredArea?: string
  status: 'waiting' | 'notified' | 'seated' | 'expired'
  position: number
  estimatedWaitMin?: number
  notes?: string
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  waiting: { label: 'Waiting', color: '#C99C63', bg: 'rgba(201, 156, 99, 0.12)', icon: Clock },
  notified: { label: 'Notified', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', icon: Bell },
  seated: { label: 'Seated', color: '#59A673', bg: 'rgba(89, 166, 115, 0.12)', icon: UserCheck },
  expired: { label: 'Expired', color: '#8b949e', bg: 'rgba(139, 148, 158, 0.12)', icon: XCircle },
}

export default function WaitingListTab({ theme, orgId, serverToday }: WaitingListTabProps) {
  const isDark = theme === 'dark'
  const [entries, setEntries] = useState<WaitingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('active')
  const [actionDropdown, setActionDropdown] = useState<string | null>(null)

  // Add form state
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    partySize: 2,
    requestedTime: '',
    preferredArea: '',
    notes: '',
  })
  const [addLoading, setAddLoading] = useState(false)

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<WaitingEntry | null>(null)

  const today = serverToday || new Date().toISOString().split('T')[0]

  const textColor = isDark ? '#e6edf3' : '#1f2937'
  const mutedColor = isDark ? '#8b949e' : '#6b7280'
  const borderColor = isDark ? '#30363d' : '#e5e7eb'
  const cardBg = isDark ? '#161B22' : '#ffffff'
  const panelBg = isDark ? '#101A1C' : '#f9fafb'

  const fetchEntries = useCallback(async () => {
    try {
      const params = statusFilter === 'all' ? `?date=${today}` : ''
      const { data } = await api.get(`/organizations/${orgId}/waiting-list${params}`)
      setEntries(data.data || [])
    } catch (err) {
      console.error('Failed to fetch waiting list:', err)
    } finally {
      setLoading(false)
    }
  }, [orgId, today, statusFilter])

  useEffect(() => {
    fetchEntries()
    const interval = setInterval(fetchEntries, 15_000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  const handleAdd = async () => {
    if (!form.customerName.trim()) {
      toast.error('Customer name is required')
      return
    }
    try {
      setAddLoading(true)
      await api.post(`/organizations/${orgId}/waiting-list`, {
        customerName: form.customerName,
        customerPhone: form.customerPhone || undefined,
        customerEmail: form.customerEmail || undefined,
        partySize: form.partySize,
        requestedDate: today,
        requestedTime: form.requestedTime || undefined,
        preferredArea: form.preferredArea || undefined,
        notes: form.notes || undefined,
      })
      toast.success(`${form.customerName} added to waiting list`)
      setShowAddModal(false)
      setForm({ customerName: '', customerPhone: '', customerEmail: '', partySize: 2, requestedTime: '', preferredArea: '', notes: '' })
      fetchEntries()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add to waiting list')
    } finally {
      setAddLoading(false)
    }
  }

  const handleStatusChange = async (entryId: string, newStatus: string) => {
    try {
      await api.patch(`/organizations/${orgId}/waiting-list/${entryId}/status`, { status: newStatus })
      toast.success(`Status updated to ${newStatus}`)
      setActionDropdown(null)
      fetchEntries()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update status')
    }
  }

  const handleRemove = async () => {
    if (!confirmDelete) return
    try {
      await api.delete(`/organizations/${orgId}/waiting-list/${confirmDelete.id}`)
      toast.success('Removed from waiting list')
      setConfirmDelete(null)
      fetchEntries()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove entry')
    }
  }

  const getWaitTime = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const activeEntries = entries.filter(e => e.status === 'waiting' || e.status === 'notified')
  const displayEntries = statusFilter === 'active' ? activeEntries : entries

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: `1px solid ${borderColor}`,
    borderRadius: '8px',
    color: textColor,
    fontSize: '0.875rem',
    boxSizing: 'border-box' as const,
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isDark ? '#d1d5db' : '#374151',
    marginBottom: '6px',
  }

  return (
    <div>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: textColor }}>
            Waiting List
          </h3>
          <div style={{
            padding: '4px 12px',
            borderRadius: '20px',
            backgroundColor: 'rgba(201, 156, 99, 0.15)',
            color: '#C99C63',
            fontSize: '0.8125rem',
            fontWeight: 600,
          }}>
            {activeEntries.length} active
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 16px',
              backgroundColor: isDark ? '#161B22' : '#ffffff',
              border: `1px solid ${borderColor}`,
              borderRadius: '8px',
              color: textColor,
              fontSize: '0.875rem',
              cursor: 'pointer',
              minWidth: '130px',
            }}
          >
            <option value="active">Active Only</option>
            <option value="all">All Today</option>
          </select>

          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              backgroundColor: '#C99C63',
              color: '#ffffff',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            <Plus size={16} />
            Add to Waitlist
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: mutedColor,
          backgroundColor: cardBg,
          borderRadius: '12px',
          border: `1px solid ${borderColor}`,
        }}>
          Loading waiting list...
        </div>
      ) : displayEntries.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          color: mutedColor,
          backgroundColor: cardBg,
          borderRadius: '12px',
          border: `1px solid ${borderColor}`,
        }}>
          <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ margin: '0 0 4px 0', fontWeight: 500, fontSize: '1rem' }}>No entries on the waiting list</p>
          <p style={{ margin: 0, fontSize: '0.875rem' }}>Add walk-in customers when tables aren't available</p>
        </div>
      ) : (
        <div style={{
          borderRadius: '12px',
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{
                  borderBottom: `1px solid ${borderColor}`,
                  backgroundColor: panelBg,
                }}>
                  {['#', 'Customer', 'Party', 'Wait Time', 'Preferred', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left',
                      padding: '14px 20px',
                      fontWeight: 500,
                      color: isDark ? '#ffffff' : '#4b5563',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayEntries.map((entry) => {
                  const config = STATUS_CONFIG[entry.status] || STATUS_CONFIG.waiting
                  const StatusIcon = config.icon
                  return (
                    <tr
                      key={entry.id}
                      style={{
                        borderBottom: `1px solid ${borderColor}`,
                        transition: 'background-color 0.2s',
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#161B22' : '#f9fafb'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Position */}
                      <td style={{ padding: '16px 20px', color: '#C99C63', fontWeight: 700, fontSize: '1rem' }}>
                        {entry.position || '—'}
                      </td>

                      {/* Customer Info */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: textColor, marginBottom: '2px' }}>
                          {entry.customerName}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.8125rem', color: mutedColor }}>
                          {entry.customerPhone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} /> {entry.customerPhone}
                            </span>
                          )}
                          {entry.customerEmail && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={12} /> {entry.customerEmail}
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <div style={{ fontSize: '0.75rem', color: mutedColor, marginTop: '4px', fontStyle: 'italic' }}>
                            {entry.notes}
                          </div>
                        )}
                      </td>

                      {/* Party Size */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: textColor }}>
                          <Users size={14} />
                          <span style={{ fontWeight: 500 }}>{entry.partySize}</span>
                        </div>
                      </td>

                      {/* Wait Time */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: mutedColor }}>
                          <Clock size={14} />
                          <span>{getWaitTime(entry.createdAt)}</span>
                        </div>
                        {entry.requestedTime && (
                          <div style={{ fontSize: '0.75rem', color: mutedColor, marginTop: '2px' }}>
                            Requested: {entry.requestedTime}
                          </div>
                        )}
                      </td>

                      {/* Preferred Area */}
                      <td style={{ padding: '16px 20px', color: mutedColor }}>
                        {entry.preferredArea || '—'}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          backgroundColor: config.bg,
                          color: config.color,
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                        }}>
                          <StatusIcon size={13} />
                          {config.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', position: 'relative' }}>
                        {(entry.status === 'waiting' || entry.status === 'notified') && (
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                              <button
                                onClick={() => setActionDropdown(actionDropdown === entry.id ? null : entry.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  padding: '6px 14px',
                                  backgroundColor: 'rgba(201, 156, 99, 0.1)',
                                  color: '#C99C63',
                                  border: '1px solid rgba(201, 156, 99, 0.3)',
                                  borderRadius: '6px',
                                  fontSize: '0.8125rem',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Action <ChevronDown size={14} />
                              </button>

                              {actionDropdown === entry.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  marginTop: '4px',
                                  backgroundColor: isDark ? '#1C2830' : '#ffffff',
                                  border: `1px solid ${borderColor}`,
                                  borderRadius: '8px',
                                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                                  zIndex: 20,
                                  minWidth: '140px',
                                  overflow: 'hidden',
                                }}>
                                  {entry.status === 'waiting' && (
                                    <button
                                      onClick={() => handleStatusChange(entry.id, 'notified')}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        width: '100%', padding: '10px 16px',
                                        background: 'none', border: 'none',
                                        color: '#3B82F6', fontSize: '0.8125rem', cursor: 'pointer',
                                        textAlign: 'left',
                                      }}
                                    >
                                      <Bell size={14} /> Notify
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleStatusChange(entry.id, 'seated')}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      width: '100%', padding: '10px 16px',
                                      background: 'none', border: 'none',
                                      color: '#59A673', fontSize: '0.8125rem', cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <UserCheck size={14} /> Seat
                                  </button>
                                  <button
                                    onClick={() => handleStatusChange(entry.id, 'expired')}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: '8px',
                                      width: '100%', padding: '10px 16px',
                                      background: 'none', border: 'none',
                                      color: '#8b949e', fontSize: '0.8125rem', cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <XCircle size={14} /> Expire
                                  </button>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => setConfirmDelete(entry)}
                              style={{
                                display: 'flex', alignItems: 'center',
                                padding: '6px',
                                background: 'none', border: 'none',
                                color: '#ef4444', cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
        }}>
          <div style={{
            backgroundColor: isDark ? '#101A1C' : '#ffffff',
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: textColor }}>
                Add to Waiting List
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', color: mutedColor, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              {/* Name */}
              <div>
                <label style={labelStyle}>Customer Name *</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="e.g. John Smith"
                  style={inputStyle}
                />
              </div>

              {/* Phone & Party Size */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    type="tel"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    placeholder="+44 7XXX XXX XXX"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Party Size *</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.partySize}
                    onChange={(e) => setForm({ ...form, partySize: parseInt(e.target.value) || 1 })}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                  placeholder="Optional"
                  style={inputStyle}
                />
              </div>

              {/* Preferred Time & Area */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Preferred Time</label>
                  <input
                    type="time"
                    value={form.requestedTime}
                    onChange={(e) => setForm({ ...form, requestedTime: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Preferred Area</label>
                  <input
                    type="text"
                    value={form.preferredArea}
                    onChange={(e) => setForm({ ...form, preferredArea: e.target.value })}
                    placeholder="e.g. Terrace"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special requests or notes..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={addLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: addLoading ? '#9ca3af' : '#C99C63',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: addLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {addLoading ? 'Adding...' : 'Add to Waiting List'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 60,
        }}>
          <div style={{
            backgroundColor: isDark ? '#101A1C' : '#ffffff',
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            padding: '32px',
            width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 600, color: textColor }}>Remove from Waiting List</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.875rem', color: mutedColor, lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{confirmDelete.customerName}</strong> (party of {confirmDelete.partySize}) from the waiting list?
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  flex: 1, padding: '10px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={handleRemove}
                style={{
                  flex: 1, padding: '10px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                }}
              >Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
