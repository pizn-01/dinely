import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import { X, Calendar, Clock, Users, ChevronRight, ChevronLeft, Check } from 'lucide-react'

interface StaffReservationWizardProps {
  restaurantId: string
  onClose: () => void
  onSuccess: () => void
  preselectedTable?: {
    id: string
    name?: string | null
    tableNumber?: string | null
    capacity?: number | null
    areaName?: string | null
  }
  initialDate?: string
  initialTime?: string
  weeklyHours?: Record<string, any>
}

export interface ReservationData {
  date: string
  time: string
  guests: number
  tableId: string | null
  tableName: string
  tableCapacity: number
  tableLocation: string
  isPremium: boolean
  premiumPrice: number
  firstName: string
  lastName: string
  email: string
  phone: string
  specialRequest: string
}

const getLocalISODate = (date: Date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const getDefaultTime = () => {
  const now = new Date()
  const m = now.getMinutes()
  const roundedM = m < 30 ? '30' : '00'
  const h = m < 30 ? now.getHours() : (now.getHours() + 1) % 24
  return `${String(h).padStart(2, '0')}:${roundedM}`
}

const defaultDate = getLocalISODate()

const initialData: ReservationData = {
  date: defaultDate,
  time: getDefaultTime(),
  guests: 2,
  tableId: null,
  tableName: '',
  tableCapacity: 0,
  tableLocation: '',
  isPremium: false,
  premiumPrice: 0,
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  specialRequest: '',
}

export default function StaffReservationWizard({ restaurantId, onClose, onSuccess, preselectedTable, initialDate, initialTime, weeklyHours }: StaffReservationWizardProps) {
  // If table is preselected, skip the "Select Table" step entirely (3 steps instead of 4)
  const hasPreselectedTable = !!preselectedTable?.id
  const TOTAL_STEPS = hasPreselectedTable ? 3 : 4

  const stepTitles = hasPreselectedTable
    ? ['Date & Time', 'Guest Details', 'Review & Confirm']
    : ['Date & Time', 'Select Table', 'Guest Details', 'Review & Confirm']

  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<ReservationData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Table Selection State
  const [availableTables, setAvailableTables] = useState<any[]>([])
  const [loadingTables, setLoadingTables] = useState(false)
  const [selectedTableMode, setSelectedTableMode] = useState<'suitable' | 'mergeable'>('suitable')
  const [selectedMergeableTableIds, setSelectedMergeableTableIds] = useState<string[]>([])

  const updateData = useCallback((updates: Partial<ReservationData>) => {
    setData((prev) => ({ ...prev, ...updates }))
  }, [])

  // Apply optional initial values (date/time + preselected table)
  useEffect(() => {
    const updates: Partial<ReservationData> = {}
    if (initialDate) updates.date = initialDate
    if (initialTime) updates.time = initialTime
    if (preselectedTable?.id) {
      updates.tableId = preselectedTable.id
      const name = preselectedTable.name || preselectedTable.tableNumber || ''
      updates.tableName = name
      updates.tableCapacity = preselectedTable.capacity || 0
      updates.tableLocation = preselectedTable.areaName || ''
    }
    if (Object.keys(updates).length > 0) {
      setData(prev => ({ ...prev, ...updates }))
    }
  }, [initialDate, initialTime, preselectedTable])

  const fetchAvailableTables = async () => {
    setLoadingTables(true)
    setError(null)
    try {
      const { data: res } = await api.get(`/organizations/${restaurantId}/tables/availability`, {
        params: {
          date: data.date,
          time: data.time,
          partySize: data.guests
        }
      })
      setAvailableTables(res.data || [])
    } catch (err) {
      console.error('Failed to fetch tables:', err)
      setError('Failed to fetch available tables.')
    } finally {
      setLoadingTables(false)
    }
  }

  // Map logical step to the actual content step
  const getContentStep = () => {
    if (hasPreselectedTable) {
      // Steps: 1=DateTime, 2=GuestDetails, 3=Review
      if (currentStep === 1) return 'datetime'
      if (currentStep === 2) return 'guest'
      return 'review'
    } else {
      // Steps: 1=DateTime, 2=SelectTable, 3=GuestDetails, 4=Review
      if (currentStep === 1) return 'datetime'
      if (currentStep === 2) return 'table'
      if (currentStep === 3) return 'guest'
      return 'review'
    }
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const selectedDayOfWeek = dayNames[new Date(data.date + 'T00:00:00').getDay()]
  const dayConfig = weeklyHours?.[selectedDayOfWeek]
  const isDayClosed = dayConfig?.closed === true || dayConfig?.closed === 'true'

  const handleNext = async () => {
    const content = getContentStep()
    if (content === 'datetime') {
      if (isDayClosed) {
        setError(`The restaurant is closed on ${selectedDayOfWeek.charAt(0).toUpperCase() + selectedDayOfWeek.slice(1)}s.`)
        return
      }
      if (!hasPreselectedTable) {
        await fetchAvailableTables()
      }
      setError(null)
      setCurrentStep(prev => prev + 1)
    } else if (content === 'table') {
      const suitableTables = availableTables.filter(t => t.capacity >= data.guests)
      const mergeableTables = availableTables.filter(t => t.isMergeable && t.capacity < data.guests)
      const activeMode = (suitableTables.length === 0 && mergeableTables.length > 0) ? 'mergeable' : selectedTableMode

      if (activeMode === 'mergeable') {
        if (selectedMergeableTableIds.length === 0) {
          setError('Please select one or more tables to combine.')
          return
        }
        const selectedTables = availableTables.filter(t => selectedMergeableTableIds.includes(t.id))
        const combinedCap = selectedTables.reduce((sum, t) => sum + (t.capacity || 0), 0)
        if (combinedCap < data.guests) {
          setError(`Combined capacity of selected tables (${combinedCap}) is insufficient for ${data.guests} guests. Please select additional mergeable tables.`)
          return
        }
      } else {
        if (!data.tableId) {
          setError('Please select a table to continue.')
          return
        }
        if (data.tableCapacity < data.guests) {
          setError(`Selected table capacity (${data.tableCapacity}) is insufficient for ${data.guests} guests.`)
          return
        }
      }
      setError(null)
      setCurrentStep(prev => prev + 1)
    } else if (content === 'guest') {
      setError(null)
      setCurrentStep(prev => prev + 1)
    } else if (content === 'review') {
      submitReservation()
    }
  }

  const submitReservation = async () => {
    try {
      setLoading(true)
      setError(null)

      const suitableTables = availableTables.filter(t => t.capacity >= data.guests)
      const mergeableTables = availableTables.filter(t => t.isMergeable && t.capacity < data.guests)
      const activeMode = (suitableTables.length === 0 && mergeableTables.length > 0) ? 'mergeable' : selectedTableMode

      let finalTableId: string | undefined = data.tableId || undefined

      if (activeMode === 'mergeable' && selectedMergeableTableIds.length > 1) {
        // Merge the selected tables first in the backend
        const mergeRes = await api.post(`/organizations/${restaurantId}/tables/merge`, {
          sourceTableIds: selectedMergeableTableIds,
          mergedTable: {
            name: data.tableName || 'Merged Table',
            capacity: data.tableCapacity
          },
          mergeEffectiveFrom: data.date
        })
        if (mergeRes.data?.data?.id) {
          finalTableId = mergeRes.data.data.id
        }
      }
      
      const fn = data.firstName?.trim()
      const ln = data.lastName?.trim()
      const payload = {
        reservationDate: data.date,
        startTime: data.time,
        partySize: data.guests,
        tableId: finalTableId,
        guestFirstName: fn || undefined,
        guestLastName: ln || undefined,
        guestEmail: data.email?.trim() ? data.email.trim() : undefined,
        guestPhone: data.phone || undefined,
        specialRequests: data.specialRequest || undefined,
        source: 'pos'
      }

      await api.post(`/organizations/${restaurantId}/reservations`, payload)
      onSuccess()
    } catch (err: any) {
      console.error('Failed to create reservation:', err)
      setError(err.response?.data?.error || 'Failed to create reservation.')
    } finally {
      setLoading(false)
    }
  }

  const renderDateTimeStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Date</label>
        <div style={{ position: 'relative' }}>
          <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="date"
            value={data.date}
            onChange={(e) => updateData({ date: e.target.value })}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Time</label>
        <div style={{ position: 'relative' }}>
          <Clock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="time"
            value={data.time}
            onChange={(e) => updateData({ time: e.target.value })}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Party Size</label>
        <div style={{ position: 'relative' }}>
          <Users size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input
            type="number"
            min={1}
            max={20}
            value={data.guests}
            onChange={(e) => updateData({ guests: parseInt(e.target.value) || 1 })}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
      </div>
      {isDayClosed && (
        <div style={{ backgroundColor: 'rgba(224,93,93,0.1)', color: 'var(--accent-red)', padding: '12px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid rgba(224,93,93,0.2)' }}>
          🔒 The restaurant is closed on {selectedDayOfWeek.charAt(0).toUpperCase() + selectedDayOfWeek.slice(1)}s. Please select an available business day.
        </div>
      )}
    </div>
  )

  const renderTableStep = () => {
    if (loadingTables) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading available tables...</div>
    if (availableTables.length === 0) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-red)' }}>No tables available for {data.guests} guests at {data.time}.</div>

    const suitableTables = availableTables.filter(t => t.capacity >= data.guests)
    const mergeableTables = availableTables.filter(t => t.isMergeable && t.capacity < data.guests)

    const activeMode = (suitableTables.length === 0 && mergeableTables.length > 0) ? 'mergeable' : selectedTableMode
    const displayedTables = activeMode === 'mergeable' ? mergeableTables : suitableTables

    const tablesByArea = displayedTables.reduce((acc, table) => {
      const areaName = table.area?.name || 'Main Area'
      if (!acc[areaName]) acc[areaName] = []
      acc[areaName].push(table)
      return acc
    }, {} as Record<string, any[]>)

    // Calculate live selected capacity for UI banner feedback
    const selectedMergeableList = availableTables.filter(t => selectedMergeableTableIds.includes(t.id))
    const currentCombinedCap = selectedMergeableList.reduce((sum, t) => sum + (t.capacity || 0), 0)

    const handleTableClick = (table: any, areaName: string) => {
      if (activeMode === 'mergeable') {
        let nextIds = [...selectedMergeableTableIds]
        if (nextIds.includes(table.id)) {
          nextIds = nextIds.filter(id => id !== table.id)
        } else {
          nextIds.push(table.id)
        }
        setSelectedMergeableTableIds(nextIds)

        const selTables = availableTables.filter(t => nextIds.includes(t.id))
        const combCap = selTables.reduce((sum, t) => sum + (t.capacity || 0), 0)
        const combNames = selTables.map(t => t.name || `Table ${t.tableNumber}`).join(' + ')
        const combPrem = selTables.reduce((sum, t) => sum + (t.premiumPrice || 0), 0)
        const hasPrem = selTables.some(t => t.isPremium)

        updateData({
          tableId: selTables[0]?.id || null,
          tableName: combNames,
          tableCapacity: combCap,
          tableLocation: selTables[0]?.area?.name || areaName,
          isPremium: hasPrem,
          premiumPrice: combPrem
        })
      } else {
        updateData({
          tableId: table.id,
          tableName: table.name || `Table ${table.tableNumber}`,
          tableCapacity: table.capacity,
          tableLocation: areaName,
          isPremium: table.isPremium,
          premiumPrice: table.premiumPrice
        })
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
        {activeMode === 'mergeable' && (
          <div style={{ backgroundColor: 'rgba(201,156,99,0.08)', border: '1px solid rgba(201,156,99,0.3)', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent-gold)' }}>Merge Mode:</strong> Click multiple tables to combine them.
            </span>
            <span style={{ fontWeight: 700, color: currentCombinedCap >= data.guests ? '#10B981' : 'var(--accent-red)' }}>
              Combined Cap: {currentCombinedCap} / {data.guests} Guests
            </span>
          </div>
        )}

        {displayedTables.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            No individual tables large enough for {data.guests} guests. Please select the mergeable tables option below.
          </div>
        ) : (
          Object.entries(tablesByArea).map(([area, tables]) => (
            <div key={area}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{area}</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {(tables as any[]).map(table => {
                  const isSelected = activeMode === 'mergeable'
                    ? selectedMergeableTableIds.includes(table.id)
                    : data.tableId === table.id

                  return (
                    <div
                      key={table.id}
                      onClick={() => handleTableClick(table, area)}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        border: `2px solid ${isSelected ? 'var(--accent-gold)' : 'var(--border-secondary)'}`,
                        backgroundColor: isSelected ? 'var(--bg-hover)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      {table.isPremium && (
                        <span style={{ position: 'absolute', top: '-10px', backgroundColor: '#C99C63', color: '#fff', fontSize: '0.625rem', padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>PREMIUM</span>
                      )}
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: table.isPremium ? '8px' : '0' }}>{table.name || `Table ${table.tableNumber}`}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {activeMode === 'mergeable' ? `Base Cap: ${table.capacity} (Mergeable)` : `Up to ${table.capacity} Guests`}
                      </span>
                      {table.isPremium && (
                        <span style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 700, marginTop: '4px' }}>£{table.premiumPrice?.toFixed(2) || '0.00'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Radio buttons underneath to show available mergeable tables */}
        {mergeableTables.length > 0 && (
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-secondary)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Table View Options
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <input
                type="radio"
                name="tableMode"
                checked={activeMode === 'suitable'}
                onChange={() => {
                  setSelectedTableMode('suitable')
                  setSelectedMergeableTableIds([])
                  setError(null)
                }}
                style={{ accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }}
              />
              <span>Show individual suitable tables ({suitableTables.length})</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <input
                type="radio"
                name="tableMode"
                checked={activeMode === 'mergeable'}
                onChange={() => {
                  setSelectedTableMode('mergeable')
                  setError(null)
                }}
                style={{ accentColor: 'var(--accent-gold)', width: '16px', height: '16px' }}
              />
              <span>Show available mergeable tables ({mergeableTables.length}) — Combinable for larger groups</span>
            </label>
          </div>
        )}
      </div>
    )
  }

  const renderGuestStep = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-secondary)', paddingBottom: '8px' }}>Guest Information</h4>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>First name (optional)</label>
        <input type="text" value={data.firstName} onChange={e => updateData({ firstName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} placeholder="John" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Last name (optional)</label>
        <input type="text" value={data.lastName} onChange={e => updateData({ lastName: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} placeholder="Doe" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Email</label>
        <input type="email" value={data.email} onChange={e => updateData({ email: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} placeholder="john@example.com" />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Phone</label>
        <input type="tel" value={data.phone} onChange={e => updateData({ phone: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none' }} placeholder="+44 7700 900000" />
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px' }}>Special Requests</label>
        <textarea value={data.specialRequest} onChange={e => updateData({ specialRequest: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', minHeight: '80px', resize: 'vertical', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }} placeholder="Allergies, high chair required, etc." />
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border-secondary)' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>Booking Summary</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Date & Time</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(data.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {data.time}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Guests</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.guests} People</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Table</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{data.tableName}{data.tableLocation ? ` (${data.tableLocation})` : ''}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-tertiary)', display: 'block' }}>Guest</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{`${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Guest (no name)'}</span>
          </div>
        </div>
        
        {data.isPremium && (
          <div style={{ marginTop: '24px', backgroundColor: 'rgba(201,156,99,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(201,156,99,0.25)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.25rem' }}>⭐</span>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--accent-gold)', fontSize: '0.9375rem', fontWeight: 700 }}>Premium Table Selected</h4>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.4 }}>
                This is a premium table requiring a supplementary payment of £{(data.premiumPrice || 0).toFixed(2)}. Please collect payment via your POS system or ensure the guest holds an active VIP membership before seating.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const contentStep = getContentStep()

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '24px', backdropFilter: 'var(--modal-backdrop)' }}>
      <div style={{ backgroundColor: 'var(--bg-modal)', borderRadius: '24px', width: '100%', maxWidth: '600px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', border: '1px solid var(--border-primary)' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Create Reservation</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Step {currentStep} of {TOTAL_STEPS}: {stepTitles[currentStep - 1]}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '8px', borderRadius: '50%' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={20} />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-tertiary)' }}>
          <div style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%`, height: '100%', backgroundColor: 'var(--accent-gold)', transition: 'width 0.3s ease' }} />
        </div>

        {/* Content */}
        <div style={{ padding: '32px', overflowY: 'auto' }}>
          {error && (
            <div style={{ backgroundColor: 'rgba(224,93,93,0.1)', color: 'var(--accent-red)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.875rem', fontWeight: 500, border: '1px solid rgba(224,93,93,0.2)' }}>
              {error}
            </div>
          )}
          
          {contentStep === 'datetime' && renderDateTimeStep()}
          {contentStep === 'table' && renderTableStep()}
          {contentStep === 'guest' && renderGuestStep()}
          {contentStep === 'review' && renderReviewStep()}
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid var(--border-secondary)', backgroundColor: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {currentStep > 1 ? (
            <button 
              onClick={() => setCurrentStep(prev => prev - 1)}
              style={{ padding: '10px 20px', backgroundColor: 'transparent', border: '1px solid var(--border-input)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div></div>}
          
          <button 
            onClick={handleNext}
            disabled={loading || loadingTables || (contentStep === 'datetime' && isDayClosed)}
            style={{ padding: '10px 24px', backgroundColor: 'var(--accent-gold)', border: 'none', borderRadius: '10px', color: '#ffffff', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: (loading || loadingTables || (contentStep === 'datetime' && isDayClosed)) ? 'not-allowed' : 'pointer', opacity: (loading || loadingTables || (contentStep === 'datetime' && isDayClosed)) ? 0.7 : 1 }}
          >
            {loading ? 'Processing...' : currentStep === TOTAL_STEPS ? 'Confirm Booking' : 'Next Step'}
            {currentStep < TOTAL_STEPS && <ChevronRight size={16} />}
          </button>
        </div>

      </div>
    </div>
  )
}
