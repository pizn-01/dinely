import React, { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../../services/api'
import { X, Calendar, Clock, Users, ChevronRight, ChevronLeft, ChevronDown, Check, ZoomIn, ZoomOut } from 'lucide-react'
import { openNativePicker } from '../../utils/nativePicker'
import { QUARTER_HOUR_TIME_OPTIONS } from '../../utils/timeOptions'

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

const floorNameFromArea = (areaName?: string | null) => {
  const name = areaName || 'Main Area'
  return name.includes(' - ') ? name.split(' - ')[0].trim() : name
}

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
  const [selectedMergeableTableIds, setSelectedMergeableTableIds] = useState<string[]>([])
  const [selectedFloorMapFloor, setSelectedFloorMapFloor] = useState('')
  const [floorMapZoom, setFloorMapZoom] = useState(1)
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false)
  const timeDropdownRef = useRef<HTMLDivElement | null>(null)
  const timeOptionsListRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    if (!isTimeDropdownOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setIsTimeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isTimeDropdownOpen])

  useEffect(() => {
    if (!isTimeDropdownOpen || !timeOptionsListRef.current) return

    const selectedIndex = QUARTER_HOUR_TIME_OPTIONS.indexOf(data.time)
    if (selectedIndex < 0) return

    timeOptionsListRef.current.scrollTop = Math.max(0, (selectedIndex - 3) * 36)
  }, [data.time, isTimeDropdownOpen])

  const fetchAvailableTables = async () => {
    setLoadingTables(true)
    setError(null)
    try {
      const { data: res } = await api.get(`/organizations/${restaurantId}/tables/availability`, {
        params: {
          date: data.date,
          time: data.time,
          partySize: data.guests,
          includeAllAvailable: true
        }
      })
      const tables: any[] = res.data || []
      const floors: string[] = Array.from(new Set(tables.map((table: any) => floorNameFromArea(table.area?.name))))
      setAvailableTables(tables)
      setSelectedFloorMapFloor(prev => (prev && floors.includes(prev)) ? prev : floors[0] || '')
      setSelectedMergeableTableIds([])
      updateData({
        tableId: null,
        tableName: '',
        tableCapacity: 0,
        tableLocation: '',
        isPremium: false,
        premiumPrice: 0
      })
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
      if (!Number.isInteger(data.guests) || data.guests < 1) {
        setError('Please enter a valid party size.')
        return
      }
      if (!hasPreselectedTable) {
        await fetchAvailableTables()
      }
      setError(null)
      setCurrentStep(prev => prev + 1)
    } else if (content === 'table') {
      if (selectedMergeableTableIds.length > 0) {
        if (selectedMergeableTableIds.length < 2) {
          setError('Please select at least two mergeable tables to combine.')
          return
        }
        const selectedTables = availableTables.filter(t => selectedMergeableTableIds.includes(t.id))
        if (selectedTables.some(t => !t.isMergeable || t.isMerged)) {
          setError('Only available tables marked as mergeable can be combined.')
          return
        }
      } else {
        if (!data.tableId) {
          setError('Please select a table to continue.')
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

      const finalTableId: string | undefined = selectedMergeableTableIds.length > 1 ? undefined : data.tableId || undefined
      
      const fn = data.firstName?.trim()
      const ln = data.lastName?.trim()
      const payload = {
        reservationDate: data.date,
        startTime: data.time,
        partySize: data.guests,
        tableId: finalTableId || null,
        autoMergeTableIds: selectedMergeableTableIds.length > 1 ? selectedMergeableTableIds : undefined,
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
      <style>
        {`
          .staff-res-time-options {
            scrollbar-width: thin;
            scrollbar-color: var(--border-input) transparent;
          }
          .staff-res-time-options::-webkit-scrollbar {
            width: 8px;
          }
          .staff-res-time-options::-webkit-scrollbar-track {
            background: transparent;
          }
          .staff-res-time-options::-webkit-scrollbar-thumb {
            background-color: var(--border-input);
            border-radius: 999px;
            border: 2px solid var(--bg-input);
          }
          .staff-res-time-options::-webkit-scrollbar-thumb:hover {
            background-color: var(--text-tertiary);
          }
        `}
      </style>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Date</label>
        <div style={{ position: 'relative' }}>
          <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <input
            type="date"
            value={data.date}
            onClick={openNativePicker}
            onChange={(e) => updateData({ date: e.target.value })}
            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
          />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Time</label>
        <div ref={timeDropdownRef} style={{ position: 'relative' }}>
          <Clock size={18} style={{ position: 'absolute', left: '12px', top: '20px', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isTimeDropdownOpen}
            onClick={() => setIsTimeDropdownOpen((open) => !open)}
            style={{ width: '100%', padding: '10px 38px 10px 40px', borderRadius: '8px', border: '1px solid var(--border-input)', fontSize: '0.875rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', textAlign: 'left', minHeight: '40px' }}
          >
            {data.time}
          </button>
          <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '20px', transform: `translateY(-50%) ${isTimeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'}`, color: 'var(--text-tertiary)', pointerEvents: 'none', transition: 'transform 0.15s ease' }} />
          {isTimeDropdownOpen && (
            <div
              ref={timeOptionsListRef}
              className="staff-res-time-options"
              role="listbox"
              aria-label="Reservation time"
              style={{ marginTop: '6px', maxHeight: '288px', overflowY: 'auto', borderRadius: '10px', border: '1px solid var(--border-input)', backgroundColor: 'var(--bg-input)', boxShadow: 'var(--shadow-lg)', padding: '4px', paddingRight: '6px', zIndex: 2 }}
            >
              {QUARTER_HOUR_TIME_OPTIONS.map((option) => {
                const selected = option === data.time
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      updateData({ time: option })
                      setIsTimeDropdownOpen(false)
                    }}
                    style={{ width: '100%', height: '36px', border: 'none', borderRadius: '7px', backgroundColor: selected ? 'var(--accent-gold)' : 'transparent', color: selected ? '#ffffff' : 'var(--text-primary)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: selected ? 700 : 500, textAlign: 'left', padding: '0 12px' }}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          )}
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
            value={data.guests > 0 ? data.guests : ''}
            onChange={(e) => {
              const value = e.target.value
              updateData({ guests: value === '' ? 0 : parseInt(value, 10) || 0 })
              setError(null)
            }}
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

    const selectedMergeableList = availableTables.filter(t => selectedMergeableTableIds.includes(t.id))
    const currentCombinedCap = selectedMergeableList.reduce((sum, t) => sum + (t.capacity || 0), 0)
    const selectedAreaNames = Array.from(new Set(selectedMergeableList.map(t => t.area?.name || 'Main Area')))
    const tablesByFloor = availableTables.reduce((acc, table) => {
      const floor = floorNameFromArea(table.area?.name)
      if (!acc[floor]) acc[floor] = []
      acc[floor].push(table)
      return acc
    }, {} as Record<string, any[]>)
    const floorMapFloors = Object.keys(tablesByFloor)
    const activeFloor = selectedFloorMapFloor && tablesByFloor[selectedFloorMapFloor]
      ? selectedFloorMapFloor
      : floorMapFloors[0] || ''
    const visibleTables: any[] = activeFloor ? tablesByFloor[activeFloor] : availableTables

    const positionedTables: Array<{ table: any; x: number; y: number }> = visibleTables.map((table: any, index: number) => ({
      table,
      x: table.positionX ?? ((index % 6) * 135 + 28),
      y: table.positionY ?? (Math.floor(index / 6) * 112 + 28),
    }))
    const mapWidth = Math.max(760, ...positionedTables.map((item) => item.x + 170))
    const mapHeight = Math.max(420, ...positionedTables.map((item) => item.y + 130))

    const handleTableClick = (table: any, areaName: string) => {
      const canFitAlone = (table.capacity || 0) >= data.guests
      const isInMergeSelection = selectedMergeableTableIds.includes(table.id)
      const shouldToggleMerge = (!canFitAlone && table.isMergeable) || (selectedMergeableTableIds.length > 0 && table.isMergeable)

      if (shouldToggleMerge) {
        if (!table.isMergeable || table.isMerged) {
          setError(canFitAlone ? 'This table can be assigned on its own, but it cannot be part of a merge.' : 'This table is not marked as mergeable.')
          return
        }
        let nextIds = [...selectedMergeableTableIds]
        if (isInMergeSelection) {
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
        setSelectedMergeableTableIds([])
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <style>
          {`
            .reservation-floor-map-scroll {
              scrollbar-width: thin;
              scrollbar-color: #5f7f7a #111b1e;
            }
            [data-theme="light"] .reservation-floor-map-scroll {
              scrollbar-color: #98bbb5 #eef5f3;
            }
            .reservation-floor-map-scroll::-webkit-scrollbar {
              width: 12px;
              height: 12px;
            }
            .reservation-floor-map-scroll::-webkit-scrollbar-track {
              background: #111b1e;
              border-radius: 999px;
            }
            [data-theme="light"] .reservation-floor-map-scroll::-webkit-scrollbar-track {
              background: #eef5f3;
            }
            .reservation-floor-map-scroll::-webkit-scrollbar-thumb {
              background: #5f7f7a;
              border: 3px solid #111b1e;
              border-radius: 999px;
            }
            [data-theme="light"] .reservation-floor-map-scroll::-webkit-scrollbar-thumb {
              background: #98bbb5;
              border-color: #eef5f3;
            }
            .reservation-floor-map-scroll::-webkit-scrollbar-thumb:hover {
              background: #7aa09a;
            }
            [data-theme="light"] .reservation-floor-map-scroll::-webkit-scrollbar-thumb:hover {
              background: #7ca9a2;
            }
            .reservation-floor-map-scroll::-webkit-scrollbar-corner {
              background: #111b1e;
            }
            [data-theme="light"] .reservation-floor-map-scroll::-webkit-scrollbar-corner {
              background: #eef5f3;
            }
            .reservation-floor-map-shell {
              border: 1px solid #25343a;
              background-color: #0b1113;
              box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
            }
            [data-theme="light"] .reservation-floor-map-shell {
              border-color: #e8efed;
              background-color: #fbfdfc;
              box-shadow: inset 0 0 0 1px rgba(255,255,255,0.85);
            }
            .reservation-floor-table {
              background-color: #183531;
              border: 1px solid rgba(143,196,188,0.24);
              color: #d9efec;
              box-shadow: 0 1px 2px rgba(15,23,42,0.04);
            }
            [data-theme="light"] .reservation-floor-table {
              background-color: #bfdfda;
              border-color: rgba(132,183,174,0.18);
              color: #36504c;
            }
            .reservation-floor-table-selected {
              border: 3px solid #C99C63;
              box-shadow: 0 1px 5px rgba(15,23,42,0.18);
            }
            .reservation-floor-table-disabled {
              opacity: 0.58;
            }
          `}
        </style>
        {selectedMergeableTableIds.length > 0 && (
          <div style={{ backgroundColor: 'rgba(201,156,99,0.08)', border: '1px solid rgba(201,156,99,0.3)', padding: '12px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.8125rem', flexWrap: 'wrap' }}>
            <>
              <span style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--accent-gold)' }}>Merge selection:</strong> {selectedMergeableList.map(t => t.name || `Table ${t.tableNumber}`).join(' + ') || 'No tables selected'}
                {selectedAreaNames.length > 1 ? ' • Staff review needed' : ''}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                Combined Cap: {currentCombinedCap}
              </span>
            </>
          </div>
        )}

        {floorMapFloors.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-secondary)', overflowX: 'auto' }}>
            {floorMapFloors.map(floor => {
              const active = activeFloor === floor
              return (
                <button
                  key={floor}
                  type="button"
                  onClick={() => setSelectedFloorMapFloor(floor)}
                  style={{
                    padding: '8px 18px',
                    border: 'none',
                    borderBottom: `3px solid ${active ? '#2f8f83' : 'transparent'}`,
                    backgroundColor: 'transparent',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: 800,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {floor}
                </button>
              )
            })}
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <div
            className="reservation-floor-map-scroll reservation-floor-map-shell"
            style={{
              height: '430px',
              overflow: 'auto',
              borderRadius: '10px',
              position: 'relative',
            }}
          >
            <div style={{ width: `${mapWidth * floorMapZoom}px`, height: `${mapHeight * floorMapZoom}px`, position: 'relative' }}>
              <div style={{ width: `${mapWidth}px`, height: `${mapHeight}px`, position: 'relative', transform: `scale(${floorMapZoom})`, transformOrigin: 'top left' }}>
                {positionedTables.map(({ table, x, y }) => {
              const areaName = table.area?.name || 'Main Area'
              const canFitAlone = (table.capacity || 0) >= data.guests
              const canMerge = table.isMergeable && !table.isMerged
              const isSingleSelected = selectedMergeableTableIds.length === 0 && data.tableId === table.id
              const isMergeSelected = selectedMergeableTableIds.includes(table.id)
              const isDisabled = selectedMergeableTableIds.length > 0 && !canMerge
              const shape = String(table.shape || 'rectangle').toLowerCase()
              const isRound = shape === 'circle' || shape === 'round'
              const isVip = table.isPremium || String(table.type || '').toLowerCase().includes('vip')
              const tableWidth = isRound ? 82 : isVip ? 138 : 120
              const tableHeight = isRound ? 82 : 82
              const title = isDisabled
                ? `${table.name || `Table ${table.tableNumber}`} is not mergeable`
                : canFitAlone && selectedMergeableTableIds.length === 0
                  ? `${table.name || `Table ${table.tableNumber}`} can be assigned directly`
                  : canMerge
                    ? `${table.name || `Table ${table.tableNumber}`} can be combined`
                    : `${table.name || `Table ${table.tableNumber}`} can be assigned directly`

              return (
                <button
                  key={table.id}
                  type="button"
                  className={`reservation-floor-table ${isSingleSelected || isMergeSelected ? 'reservation-floor-table-selected' : ''} ${isDisabled ? 'reservation-floor-table-disabled' : ''}`}
                  title={title}
                  onClick={() => handleTableClick(table, areaName)}
                  style={{
                    position: 'absolute',
                    left: `${x}px`,
                    top: `${y}px`,
                    width: `${tableWidth}px`,
                    height: `${tableHeight}px`,
                    borderRadius: isRound ? '999px' : '8px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    textAlign: 'center',
                    transition: 'border-color 0.18s, background-color 0.18s, transform 0.18s',
                  }}
                >
                  {table.isPremium && (
                    <span style={{ position: 'absolute', top: '5px', right: '5px', backgroundColor: '#C99C63', color: '#111827', fontSize: '0.55rem', padding: '2px 6px', borderRadius: '100px', fontWeight: 800 }}>
                      VIP
                    </span>
                  )}
                  {(isSingleSelected || isMergeSelected) && (
                    <span style={{ position: 'absolute', top: '5px', left: '6px', color: 'var(--accent-gold)', display: 'flex' }}>
                      <Check size={14} />
                    </span>
                  )}
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.15, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {table.name || `Table ${table.tableNumber}`}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.1 }}>
                    {table.capacity || 0} guests
                  </span>
                  <span style={{ fontSize: '0.58rem', color: canFitAlone ? '#10B981' : canMerge ? '#60A5FA' : 'var(--text-secondary)', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase', lineHeight: 1.1 }}>
                    {canFitAlone ? 'Fits' : canMerge ? 'Mergeable' : 'Assign'}
                  </span>
                </button>
              )
            })}
              </div>
            </div>
          </div>
          <div
            style={{
              position: 'absolute',
              right: '18px',
              bottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 9px',
              borderRadius: '999px',
              backgroundColor: 'rgba(11,17,19,0.88)',
              color: '#a9cbc5',
              boxShadow: '0 10px 28px rgba(15,23,42,0.16)',
              border: '1px solid rgba(143,196,188,0.18)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <button
              type="button"
              onClick={() => setFloorMapZoom(prev => Math.max(0.3, Number((prev - 0.1).toFixed(2))))}
              aria-label="Zoom out floor map"
              title="Zoom out"
              style={{ width: '28px', height: '28px', borderRadius: '999px', border: 'none', backgroundColor: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ZoomOut size={18} strokeWidth={2.8} />
            </button>
            <span style={{ minWidth: '48px', textAlign: 'center', fontSize: '1rem', lineHeight: 1, fontWeight: 800 }}>
              {Math.round(floorMapZoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setFloorMapZoom(prev => Math.min(1.8, Number((prev + 0.1).toFixed(2))))}
              aria-label="Zoom in floor map"
              title="Zoom in"
              style={{ width: '28px', height: '28px', borderRadius: '999px', border: 'none', backgroundColor: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ZoomIn size={18} strokeWidth={2.8} />
            </button>
          </div>
        </div>
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
      <div style={{ backgroundColor: 'var(--bg-modal)', borderRadius: '24px', width: '100%', maxWidth: contentStep === 'table' ? '900px' : '600px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', border: '1px solid var(--border-primary)' }}>
        
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
