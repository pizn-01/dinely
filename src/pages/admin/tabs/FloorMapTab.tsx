import { useState, useEffect, useRef } from 'react'
import { Upload, Download, Save, Grid, Plus, X } from 'lucide-react'
import Draggable, { DraggableData, DraggableEvent } from 'react-draggable'
import { api } from '../../../services/api'
import { toast } from 'react-hot-toast'

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
  isMerged?: boolean
  parentTableId?: string
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

  // Merge State
  const [mergeMode, setMergeMode] = useState(false)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [merging, setMerging] = useState(false)

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
            positionY: t.positionY || 0,
            isMerged: t.isMerged,
            parentTableId: t.parentTableId
          }))
          // Only show active tables or merged tables that are not parented (children should be hidden)
          setTables(mapped.filter((t: any) => !t.parentTableId))
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
      toast.error('Please enter a Table Number')
      return
    }
    if (!form.capacity || form.capacity < 1) {
      toast.error('Capacity must be at least 1')
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
      toast.error(errorMsg)
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
      toast.success('Floor plan saved successfully!')
    } catch (err) {
      console.error('Failed to save floor plan:', err)
      toast.error('Failed to save floor plan.')
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
      toast.success('Floor plan CSV uploaded successfully! Refreshing tables...')
      window.location.reload()
    } catch (error) {
      console.error('Failed to upload CSV:', error)
      toast.error('Failed to upload floor plan CSV.')
    } finally {
      setUploading(false)
    }
  }

  // Handle Merge Actions
  const toggleTableSelection = (id: string, isMerged: boolean = false) => {
    if (!mergeMode) return
    if (isMerged) {
      if (window.confirm('Do you want to un-merge this table back to its original pieces?')) {
        unmergeTable(id)
      }
      return
    }

    setSelectedTables(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  const handleMergeSubmit = async () => {
    if (selectedTables.length < 2) return
    const tablesToMerge = tables.filter(t => selectedTables.includes(t.id))
    const totalCapacity = tablesToMerge.reduce((sum, t) => sum + (Number(t.capacity) || 0), 0)
    
    const newName = window.prompt(`Merging ${selectedTables.length} tables. Enter name for the new Merged Table:`, 'Merged Table')
    if (!newName) return

    try {
      setMerging(true)
      const payload = {
        sourceTableIds: selectedTables,
        mergedTable: { name: newName, capacity: totalCapacity }
      }
      const { data } = await api.post(`/organizations/${orgId}/tables/merge`, payload)
      if (data.success) {
        // Reload tables to get the fresh snapshot
        window.location.reload()
      }
    } catch (err: any) {
      console.error('Failed to merge tables:', err)
      toast.error(err?.response?.data?.error || 'Failed to merge tables')
    } finally {
      setMerging(false)
    }
  }

  const unmergeTable = async (mergedId: string) => {
    try {
      setMerging(true)
      await api.post(`/organizations/${orgId}/tables/${mergedId}/unmerge`)
      window.location.reload()
    } catch (err: any) {
      console.error('Failed to unmerge table:', err)
      toast.error(err?.response?.data?.error || 'Failed to unmerge table')
    } finally {
      setMerging(false)
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
    const isSelected = selectedTables.includes(table.id)
    
    return (
      <Draggable
        nodeRef={nodeRef}
        defaultPosition={{ x: table.positionX, y: table.positionY }}
        bounds="parent"
        grid={[20, 20]} // Snap to background grid
        disabled={mergeMode}
        onStop={(e, data) => handleDragStop(table.id, e, data)}
      >
        <div 
          ref={nodeRef}
          onClick={() => toggleTableSelection(table.id, table.isMerged)}
          style={{
            ...getShapeStyle(table.shape),
            position: 'absolute',
            width: table.isMerged ? '140px' : getShapeStyle(table.shape).width,
            height: table.isMerged ? '100px' : getShapeStyle(table.shape).height,
            border: isSelected ? '2px solid #C99C63' : getShapeStyle(table.shape).border,
            boxShadow: isSelected ? '0 0 0 4px rgba(201, 156, 99, 0.2)' : getShapeStyle(table.shape).boxShadow,
            backgroundColor: table.isMerged ? (isDark ? 'rgba(201, 156, 99, 0.1)' : '#fef3c7') : getShapeStyle(table.shape).backgroundColor,
            cursor: mergeMode ? 'pointer' : 'move',
            transition: 'all 0.2s',
            zIndex: isSelected ? 10 : 1
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
      <div className="res-admin-tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#ffffff' : '#111827', margin: 0 }}>
            Floor Map Editor
          </h2>
          <p style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontSize: '0.875rem', marginTop: '4px' }}>
            Drag and drop tables to match your physical restaurant layout.
          </p>
        </div>
        
        <div className="res-floormap-toolbar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>

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

          <div style={{ width: '1px', backgroundColor: isDark ? '#30363d' : '#d1d5db', margin: '0 8px' }} />

          <button
            onClick={() => {
              setMergeMode(!mergeMode)
              setSelectedTables([])
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 16px', 
              backgroundColor: mergeMode ? '#C99C63' : 'transparent',
              border: `1px solid ${isDark ? '#4B5563' : '#D1D5DB'}`,
              color: mergeMode ? '#ffffff' : (isDark ? '#E5E7EB' : '#374151'), 
              borderRadius: '6px', cursor: 'pointer', fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {mergeMode ? 'Exit Merge Mode' : 'Merge Tables'}
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
          <>
            {tables.map(table => (
              <DraggableTable key={table.id} table={table} />
            ))}

            {/* Merge Mode Active Overlay */}
            {mergeMode && tables.length > 0 && (
              <div style={{
                position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: isDark ? '#161B22' : '#ffffff', 
                padding: '16px 24px', borderRadius: '12px',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', gap: '16px', zIndex: 100
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#1f2937' }}>Merge Mode Active</div>
                  <div style={{ fontSize: '0.875rem', color: isDark ? '#9ca3af' : '#6b7280' }}>
                    Select multiple adjacent tables to merge into one.<br/>
                    Click an already merged table to un-merge it.
                  </div>
                </div>
                
                <button
                  onClick={handleMergeSubmit}
                  disabled={selectedTables.length < 2 || merging}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: selectedTables.length >= 2 ? '#C99C63' : (isDark ? '#374151' : '#e5e7eb'),
                    color: selectedTables.length >= 2 ? '#ffffff' : (isDark ? '#9ca3af' : '#9ca3af'),
                    border: 'none', borderRadius: '6px', fontWeight: 600,
                    cursor: selectedTables.length >= 2 && !merging ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', whiteSpace: 'nowrap'
                  }}
                >
                  {merging ? 'Merging...' : `Merge ${selectedTables.length} Tables`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Table Modal */}
      {showModal && (
        <div className="res-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)', padding: '16px'
        }}>
          <div className="res-modal-content" style={{
            backgroundColor: isDark ? '#161B22' : '#ffffff',
            borderRadius: '12px', width: '100%', maxWidth: '500px',
            maxHeight: '90vh', overflowY: 'auto',
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
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.capacity}
                    onChange={e => setForm({ ...form, capacity: parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0 })}
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
                          toast.error(areaErr?.response?.data?.error || 'Failed to create area')
                        } finally {
                          setCreatingArea(false)
                        }
                      }}
                      disabled={creatingArea || !newAreaName.trim()}
                      style={{
                        padding: '10px 14px', backgroundColor: '#C99C63',
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
                  padding: '10px 20px', backgroundColor: '#C99C63',
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
