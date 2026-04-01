import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Save, Grid, Plus, X } from 'lucide-react'
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable'
import { api } from '../../../services/api'

interface FloorMapTabProps {
  theme: 'dark' | 'light'
  orgId: string
}

interface TablePosition {
  id: string
  tableNumber: string
  name: string
  capacity: number
  shape: string
  type: string
  positionX: number
  positionY: number
}

interface Area {
  id: string
  name: string
}

interface TableForm {
  tableNumber: string
  name: string
  capacity: number
  areaId: string
  shape: string
  type: string
}

const emptyForm: TableForm = {
  tableNumber: '',
  name: '',
  capacity: 2,
  areaId: '',
  shape: 'rectangle',
  type: '',
}

export default function FloorMapTab({ theme, orgId }: FloorMapTabProps) {
  const isDark = theme === 'dark'
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [tables, setTables] = useState<TablePosition[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<TableForm>(emptyForm)
  const [creating, setCreating] = useState(false)

  // Inline area creation
  const [showNewArea, setShowNewArea] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [creatingArea, setCreatingArea] = useState(false)

  // Fetch Tables
  useEffect(() => {
    if (!orgId) return
    const fetchTables = async () => {
      try {
        setLoading(true)
        const { data } = await api.get(`/organizations/${orgId}/tables`)
        if (data.data) {
          const mapped = data.data.map((t: any) => ({
            id: t.id,
            tableNumber: t.tableNumber,
            name: t.name,
            capacity: t.capacity,
            shape: t.shape,
            type: t.type,
            positionX: t.positionX || 0,
            positionY: t.positionY || 0
          }))
          setTables(mapped)
          setHasChanges(false)
        }
      } catch (err) {
        console.error('Failed to fetch tables for floor map:', err)
      } finally {
        setLoading(false)
      }
    }
    const fetchAreas = async () => {
      try {
        const { data } = await api.get(`/organizations/${orgId}/tables/areas`)
        if (data.data) {
          setAreas(data.data)
        }
      } catch (err) {
        console.error('Failed to fetch areas:', err)
      }
    }

    fetchTables()
    fetchAreas()
  }, [orgId])

  const handleSaveTable = async () => {
    if (!form.tableNumber.trim()) {
      alert('Please enter a Table Number')
      return
    }
    if (!form.capacity || form.capacity < 1) {
      alert('Capacity must be at least 1')
      return
    }
    
    try {
      setCreating(true)
      const payload = {
        tableNumber: form.tableNumber.trim(),
        name: form.name.trim() || undefined,
        capacity: form.capacity,
        areaId: form.areaId || undefined,
        shape: form.shape,
        type: form.type.trim() || undefined,
        positionX: 0,
        positionY: 0
      }
      
      const { data } = await api.post(`/organizations/${orgId}/tables`, payload)
      
      if (data.data) {
        const newTable: TablePosition = {
          id: data.data.id,
          tableNumber: data.data.tableNumber,
          name: data.data.name,
          capacity: data.data.capacity,
          shape: data.data.shape,
          type: data.data.type,
          positionX: 0,
          positionY: 0
        }
        setTables(prev => [...prev, newTable])
        setShowModal(false)
        setForm(emptyForm)
      }
    } catch (err: any) {
      console.error('Failed to create table:', err)
      const errorMsg = err.response?.data?.details
        ? err.response.data.details.map((d: any) => `${d.field}: ${d.message}`).join('\n')
        : err.response?.data?.error || 'Failed to create table'
      alert(errorMsg)
    } finally {
      setCreating(false)
    }
  }

  // Bulk Save Positions
  const saveFloorPlan = async () => {
    try {
      setSaving(true)
      const payload = tables.map(t => ({
        id: t.id,
        positionX: t.positionX,
        positionY: t.positionY
      }))
      
      await api.put(`/organizations/${orgId}/tables/positions`, { tables: payload })
      setHasChanges(false)
      alert('Floor plan saved successfully!')
    } catch (err) {
      console.error('Failed to save floor plan:', err)
      alert('Failed to save floor plan.')
    } finally {
      setSaving(false)
    }
  }

  // Handle Drag
  const handleDragStop = (id: string, e: DraggableEvent, data: DraggableData) => {
    setTables(prev => prev.map(t => {
      if (t.id === id) {
        // Only mark changed if it actually moved
        if (t.positionX !== data.x || t.positionY !== data.y) {
          setHasChanges(true)
          return { ...t, positionX: data.x, positionY: data.y }
        }
      }
      return t
    }))
  }

  // CSV Upload Handlers
  const handleUploadClick = () => fileInputRef.current?.click()
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      await api.post(`/organizations/${orgId}/tables/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert('Floor plan CSV uploaded successfully! Refreshing tables...')
      window.location.reload()
    } catch (error) {
      console.error('Failed to upload CSV:', error)
      alert('Failed to upload floor plan CSV.')
    } finally {
      setUploading(false)
    }
  }

  // Visuals
  const getShapeStyle = (shape: string) => {
    const base = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column' as const,
      backgroundColor: isDark ? '#1F2937' : '#ffffff',
      border: `2px solid ${isDark ? '#4B5563' : '#D1D5DB'}`,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      color: isDark ? '#E5E7EB' : '#111827',
      cursor: 'move',
      userSelect: 'none' as const,
    }

    if (shape === 'circle' || shape === 'round') {
      return { ...base, borderRadius: '50%', width: '80px', height: '80px' }
    }
    if (shape === 'square') {
      return { ...base, borderRadius: '8px', width: '80px', height: '80px' }
    }
    // Default rectangle
    return { ...base, borderRadius: '8px', width: '120px', height: '80px' }
  }

  // Subcomponent to provide a guaranteed local ref for React 19 compatibility
  const DraggableTable = ({ table }: { table: TablePosition }) => {
    const nodeRef = useRef<HTMLDivElement>(null)
    
    return (
      <Draggable
        nodeRef={nodeRef}
        defaultPosition={{ x: table.positionX, y: table.positionY }}
        bounds="parent"
        grid={[20, 20]} // Snap to background grid
        onStop={(e, data) => handleDragStop(table.id, e, data)}
      >
        <div 
          ref={nodeRef}
          style={{
            ...getShapeStyle(table.shape),
            position: 'absolute',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>
            {table.name || `#${table.tableNumber}`}
          </span>
          <span style={{ fontSize: '0.75rem', color: isDark ? '#9CA3AF' : '#6B7280', marginTop: '4px' }}>
            {table.capacity} Seats
          </span>
        </div>
      </Draggable>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#ffffff' : '#111827', margin: 0 }}>
            Floor Map Editor
          </h2>
          <p style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: '0.875rem', marginTop: '4px' }}>
            Drag and drop tables to match your physical restaurant layout.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', backgroundColor: isDark ? '#238636' : '#10b981',
              color: '#ffffff', border: 'none', borderRadius: '6px',
              cursor: 'pointer', fontWeight: 500
            }}
          >
            <Plus size={16} />
            Add Table
          </button>

          <button
            onClick={handleUploadClick}
            disabled={uploading}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', backgroundColor: 'transparent',
              border: `1px solid ${isDark ? '#4B5563' : '#D1D5DB'}`,
              color: isDark ? '#E5E7EB' : '#374151', borderRadius: '6px',
              cursor: uploading ? 'wait' : 'pointer', fontWeight: 500
            }}
          >
            <Upload size={16} />
            {uploading ? 'Uploading...' : 'Import CSV'}
          </button>
          
          <button
            onClick={saveFloorPlan}
            disabled={!hasChanges || saving}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px',
              backgroundColor: hasChanges ? '#C99C63' : (isDark ? '#374151' : '#E5E7EB'),
              color: hasChanges ? '#ffffff' : (isDark ? '#9CA3AF' : '#9CA3AF'),
              border: 'none', borderRadius: '6px',
              cursor: (!hasChanges || saving) ? 'not-allowed' : 'pointer',
              fontWeight: 500, transition: 'all 0.2s'
            }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
      </div>

      <input type="file" accept=".csv" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />

      {/* Editor Canvas */}
      <div 
        style={{
          width: '100%',
          height: '600px',
          backgroundColor: isDark ? '#0D1117' : '#F3F4F6',
          border: `1px solid ${isDark ? '#30363D' : '#E5E7EB'}`,
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: isDark 
            ? 'linear-gradient(#161B22 1px, transparent 1px), linear-gradient(90deg, #161B22 1px, transparent 1px)' 
            : 'linear-gradient(#E5E7EB 1px, transparent 1px), linear-gradient(90deg, #E5E7EB 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      >
        {loading ? (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: isDark ? '#9CA3AF' : '#6B7280' }}>
            Loading floor plan...
          </div>
        ) : tables.length === 0 ? (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', color: isDark ? '#9CA3AF' : '#6B7280' }}>
            <Grid size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
            <p>No tables configured.</p>
            <p style={{ fontSize: '0.875rem' }}>Add tables via the Tables tab or Import CSV.</p>
          </div>
        ) : (
          tables.map(table => (
            <DraggableTable key={table.id} table={table} />
          ))
        )}
      </div>

      {/* Add Table Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: isDark ? '#161B22' : '#ffffff',
            borderRadius: '12px', width: '100%', maxWidth: '500px',
            padding: '24px', border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#ffffff' : '#111827', margin: 0 }}>
                Add New Table
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: isDark ? '#8b949e' : '#6b7280', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: isDark ? '#c9d1d9' : '#374151' }}>Table Number *</label>
                <input
                  type="text"
                  value={form.tableNumber}
                  onChange={e => setForm({ ...form, tableNumber: e.target.value })}
                  placeholder="e.g. 1, 10A"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '6px',
                    backgroundColor: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    color: isDark ? '#c9d1d9' : '#111827'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: isDark ? '#c9d1d9' : '#374151' }}>Display Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Window Seat"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '6px',
                    backgroundColor: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    color: isDark ? '#c9d1d9' : '#111827'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: isDark ? '#c9d1d9' : '#374151' }}>Capacity *</label>
                  <input
                    type="number"
                    value={form.capacity}
                    onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '6px',
                      backgroundColor: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                      color: isDark ? '#c9d1d9' : '#111827'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: isDark ? '#c9d1d9' : '#374151' }}>Shape</label>
                  <select
                    value={form.shape}
                    onChange={e => setForm({ ...form, shape: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '6px',
                      backgroundColor: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                      color: isDark ? '#c9d1d9' : '#111827'
                    }}
                  >
                    <option value="rectangle">Rectangle</option>
                    <option value="square">Square</option>
                    <option value="circle">Circle</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', color: isDark ? '#c9d1d9' : '#374151' }}>Restaurant Area</label>
                {!showNewArea ? (
                  <>
                    <select
                      value={form.areaId}
                      onChange={e => {
                        if (e.target.value === '__create_new__') {
                          setShowNewArea(true)
                        } else {
                          setForm({ ...form, areaId: e.target.value })
                        }
                      }}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '6px',
                        backgroundColor: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                        color: isDark ? '#c9d1d9' : '#111827'
                      }}
                    >
                      <option value="">No Area (Unassigned)</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                      <option value="__create_new__">+ Create New Area</option>
                    </select>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={newAreaName}
                      onChange={e => setNewAreaName(e.target.value)}
                      placeholder="e.g. Patio, Bar Area"
                      autoFocus
                      style={{
                        flex: 1, padding: '10px 12px', borderRadius: '6px',
                        backgroundColor: isDark ? '#0d1117' : '#ffffff', border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                        color: isDark ? '#c9d1d9' : '#111827'
                      }}
                    />
                    <button
                      onClick={async () => {
                        if (!newAreaName.trim()) return
                        try {
                          setCreatingArea(true)
                          const { data } = await api.post(`/organizations/${orgId}/tables/areas`, { name: newAreaName.trim() })
                          if (data.data) {
                            setAreas(prev => [...prev, data.data])
                            setForm({ ...form, areaId: data.data.id })
                          }
                          setShowNewArea(false)
                          setNewAreaName('')
                        } catch (areaErr: any) {
                          alert(areaErr?.response?.data?.error || 'Failed to create area')
                        } finally {
                          setCreatingArea(false)
                        }
                      }}
                      disabled={creatingArea || !newAreaName.trim()}
                      style={{
                        padding: '10px 14px', backgroundColor: isDark ? '#238636' : '#10b981',
                        color: '#ffffff', border: 'none', borderRadius: '6px',
                        fontWeight: 600, cursor: creatingArea ? 'wait' : 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap'
                      }}
                    >
                      {creatingArea ? '...' : 'Add'}
                    </button>
                    <button
                      onClick={() => { setShowNewArea(false); setNewAreaName('') }}
                      style={{
                        padding: '10px 12px', backgroundColor: 'transparent',
                        border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                        color: isDark ? '#c9d1d9' : '#374151', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px', backgroundColor: 'transparent',
                  border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                  color: isDark ? '#c9d1d9' : '#374151', borderRadius: '6px',
                  cursor: 'pointer', fontWeight: 500
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTable}
                disabled={creating}
                style={{
                  padding: '10px 20px', backgroundColor: isDark ? '#238636' : '#10b981',
                  color: '#ffffff', border: 'none', borderRadius: '6px',
                  cursor: creating ? 'wait' : 'pointer', fontWeight: 600
                }}
              >
                {creating ? 'Adding...' : 'Add Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
