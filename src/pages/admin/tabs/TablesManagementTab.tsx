import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, X } from 'lucide-react'
import { api } from '../../../services/api'
import { toast } from 'react-hot-toast'
import StatusBadge from '../../../components/StatusBadge'

interface TablesManagementTabProps {
  theme: 'dark' | 'light'
  orgId: string
}

interface TableForm {
  tableNumber: string
  name: string
  capacity: number
  areaId: string
  shape: string
  type: string
  isMergeable: boolean
  isPremium: boolean
  premiumPrice: number
}

const emptyForm: TableForm = {
  tableNumber: '',
  name: '',
  capacity: 2,
  areaId: '',
  shape: 'rectangle',
  type: '',
  isMergeable: false,
  isPremium: false,
  premiumPrice: 0,
}

export default function TablesManagementTab({ theme, orgId }: TablesManagementTabProps) {
  const isDark = theme === 'dark'
  const [tablesList, setTablesList] = useState<any[]>([])
  const [areasList, setAreasList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingTable, setEditingTable] = useState<any>(null)
  const [form, setForm] = useState<TableForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState<any>(null)
  const [deleting, setDeleting] = useState(false)

  // Inline area creation
  const [showNewAreaInput, setShowNewAreaInput] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [creatingArea, setCreatingArea] = useState(false)

  const fetchTables = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/organizations/${orgId}/tables`)
      if (data.data) {
        setTablesList(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch tables:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAreas = async () => {
    try {
      const { data } = await api.get(`/organizations/${orgId}/tables/areas`)
      if (data.data) {
        setAreasList(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch areas:', err)
    }
  }

  useEffect(() => {
    if (!orgId) return
    fetchTables()
    fetchAreas()
  }, [orgId])

  const openAddModal = () => {
    setEditingTable(null)
    setForm(emptyForm)
    setFormError('')
    setShowModal(true)
  }

  const openEditModal = (table: any) => {
    setEditingTable(table)
    setForm({
      tableNumber: String(table.tableNumber || ''),
      name: table.name || '',
      capacity: table.capacity || 2,
      areaId: table.area?.id || '',
      shape: table.shape || 'rectangle',
      type: table.type || '',
      isMergeable: table.isMergeable || false,
      isPremium: table.isPremium || false,
      premiumPrice: table.premiumPrice || 0,
    })
    setFormError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.tableNumber || !form.capacity) return
    try {
      setSaving(true)
      if (editingTable) {
        await api.put(`/organizations/${orgId}/tables/${editingTable.id}`, {
          tableNumber: form.tableNumber,
          name: form.name || `Table ${form.tableNumber}`,
          capacity: form.capacity,
          areaId: form.areaId || undefined,
          shape: form.shape,
          type: form.type || undefined,
          isMergeable: form.isMergeable,
          isPremium: form.isPremium,
          premiumPrice: form.isPremium ? form.premiumPrice : null,
        })
      } else {
        await api.post(`/organizations/${orgId}/tables`, {
          tableNumber: form.tableNumber,
          name: form.name || `Table ${form.tableNumber}`,
          capacity: form.capacity,
          areaId: form.areaId || undefined,
          shape: form.shape,
          type: form.type || undefined,
          isMergeable: form.isMergeable,
          isPremium: form.isPremium,
          premiumPrice: form.isPremium ? form.premiumPrice : null,
        })
      }
      setShowModal(false)
      setForm(emptyForm)
      setEditingTable(null)
      setShowNewAreaInput(false)
      setNewAreaName('')
      fetchTables()
    } catch (err: any) {
      console.error('Failed to save table:', err)
      const errorMsg = err?.response?.data?.details
        ? err.response.data.details.map((d: any) => `${d.field}: ${d.message}`).join('\n')
        : err?.response?.data?.message || err?.response?.data?.error || 'Failed to save table.'
      // Show duplicate errors inline in the modal for immediate visibility
      if (err?.response?.status === 409) {
        setFormError(errorMsg)
      } else {
        toast.error(errorMsg)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      setDeleting(true)
      await api.delete(`/organizations/${orgId}/tables/${confirmDelete.id}`)
      setTablesList(tablesList.filter(t => t.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      console.error('Failed to delete table:', err)
      toast.error('Failed to delete table.')
    } finally {
      setDeleting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
    borderRadius: '8px',
    color: isDark ? '#ffffff' : '#111827',
    boxSizing: 'border-box' as const,
    fontSize: '0.875rem',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isDark ? '#d1d5db' : '#374151',
    marginBottom: '6px',
  }

  return (
    <div>
      <div className="res-admin-tab-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: isDark ? '#ffffff' : '#1f2937' }}>
          All Tables
        </h3>
        <button
          onClick={openAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            padding: '8px 16px',
            backgroundColor: '#C99C63',
            color: '#101A1C',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
          <Plus size={16} />
          Add Table
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}` }}>
              {['Table', 'Area', 'Capacity', 'Type', 'Shape', 'Status', ''].map((h) => (
                <th key={h} style={{
                  textAlign: 'left',
                  padding: '16px',
                  fontWeight: 500,
                  color: isDark ? '#8b949e' : '#6b7280'
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>Loading tables...</td></tr>
            )}
            {!loading && tablesList.map((table) => (
              <tr
                key={table.id}
                style={{
                  borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#161B22' : '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '16px', fontWeight: 600, color: isDark ? '#ffffff' : '#1f2937' }}>
                  {table.name || `#${table.tableNumber}`}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {table.area?.name || 'Unassigned'}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {table.capacity}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {table.type || 'Standard'}
                  {table.isPremium && (
                    <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: 'rgba(201,156,99,0.1)', color: '#C99C63', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Premium (${table.premiumPrice})
                    </span>
                  )}
                  {table.isMerged && (
                    <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      Merged Area
                    </span>
                  )}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {table.shape || 'Rectangle'}
                </td>
                <td style={{ padding: '16px' }}>
                  <StatusBadge status={'available'} />
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(table) }}
                      style={{ background: 'none', border: 'none', color: isDark ? '#8b949e' : '#6b7280', cursor: 'pointer', padding: '4px' }}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(table) }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && tablesList.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>No tables found. Add one or upload a floor plan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Table Modal */}
      {showModal && (
        <div className="res-modal-overlay" style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div className="res-modal-content" style={{
            backgroundColor: isDark ? '#101A1C' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h3>
              <button
                onClick={() => { setShowModal(false); setEditingTable(null) }}
                style={{ background: 'none', border: 'none', color: isDark ? '#8b949e' : '#6b7280', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{
                backgroundColor: isDark ? '#2d1416' : '#fef2f2',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.875rem',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '1.1rem' }}>⚠</span>
                {formError}
              </div>
            )}

            <div className="res-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Table Number *</label>
                <input
                  type="text"
                  value={form.tableNumber}
                  onChange={(e) => { setForm({ ...form, tableNumber: e.target.value }); setFormError('') }}
                  placeholder="e.g. 1"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); setFormError('') }}
                  placeholder="e.g. Window Seat 1"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Capacity *</label>
                <input
                  type="number"
                  min={1}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Area</label>
                {!showNewAreaInput ? (
                  <>
                    <select
                      value={form.areaId}
                      onChange={(e) => {
                        if (e.target.value === '__create_new__') {
                          setShowNewAreaInput(true)
                        } else {
                          setForm({ ...form, areaId: e.target.value })
                        }
                      }}
                      style={{ ...inputStyle, backgroundColor: isDark ? '#161B22' : '#ffffff' }}
                    >
                      <option value="">No Area</option>
                      {areasList.map((area: any) => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                      <option value="__create_new__">+ Create New Area</option>
                    </select>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      placeholder="Area name"
                      style={{ ...inputStyle, flex: 1 }}
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        if (!newAreaName.trim()) return
                        try {
                          setCreatingArea(true)
                          const { data } = await api.post(`/organizations/${orgId}/tables/areas`, { name: newAreaName.trim() })
                          if (data.data) {
                            setAreasList((prev: any[]) => [...prev, data.data])
                            setForm({ ...form, areaId: data.data.id })
                          }
                          setShowNewAreaInput(false)
                          setNewAreaName('')
                        } catch (areaErr: any) {
                          toast.error(areaErr?.response?.data?.error || 'Failed to create area')
                        } finally {
                          setCreatingArea(false)
                        }
                      }}
                      disabled={creatingArea || !newAreaName.trim()}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#C99C63',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: creatingArea ? 'wait' : 'pointer',
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {creatingArea ? '...' : 'Add'}
                    </button>
                    <button
                      onClick={() => { setShowNewAreaInput(false); setNewAreaName('') }}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: 'transparent',
                        border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                        color: isDark ? '#c9d1d9' : '#374151',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Shape</label>
                <select
                  value={form.shape}
                  onChange={(e) => setForm({ ...form, shape: e.target.value })}
                  style={{ ...inputStyle, backgroundColor: isDark ? '#161B22' : '#ffffff' }}
                >
                  <option value="rectangle">Rectangle</option>
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                  <option value="oval">Oval</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <input
                  type="text"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  placeholder="e.g. VIP, Standard"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={form.isMergeable}
                  onChange={(e) => setForm({ ...form, isMergeable: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#C99C63' }}
                />
                Allow merging with adjacent tables
              </label>

              <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  checked={form.isPremium}
                  onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: '#C99C63' }}
                />
                Enable Premium Pricing for this table
              </label>

              {form.isPremium && (
                <div style={{ paddingLeft: '24px', marginTop: '4px' }}>
                  <label style={{ ...labelStyle, fontSize: '0.8rem' }}>Premium Reservation Price (£/$/€)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.premiumPrice}
                    onChange={(e) => setForm({ ...form, premiumPrice: parseFloat(e.target.value) || 0 })}
                    style={{ ...inputStyle, width: '100px', padding: '6px 12px' }}
                  />
                  <div style={{ fontSize: '0.75rem', color: isDark ? '#8b949e' : '#6b7280', marginTop: '4px' }}>
                    This amount will be required upfront during online booking.
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving || !form.tableNumber}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: saving ? '#9ca3af' : '#C99C63',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? 'Saving...' : (editingTable ? 'Update Table' : 'Create Table')}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="res-modal-overlay" style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 60,
          padding: '16px'
        }}>
          <div className="res-modal-content" style={{
            backgroundColor: isDark ? '#101A1C' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>Delete Table</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.875rem', color: isDark ? '#d1d5db' : '#4b5563', lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>{confirmDelete.name || `Table #${confirmDelete.tableNumber}`}</strong>? This action cannot be undone.
            </p>
            <div className="res-modal-actions" style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '10px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                  color: isDark ? '#e6edf3' : '#374151',
                  borderRadius: '8px', fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer'
                }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: '10px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px', fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer'
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
