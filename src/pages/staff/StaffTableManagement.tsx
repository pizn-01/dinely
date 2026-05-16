import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Users, MapPin, Coffee, ChevronLeft, ChevronRight, Upload, Plus, Calendar, Clock, Layout, Moon, Sun, CircleUser, LogOut, KeyRound, Link2, Unlink, X, UserCheck, BarChart2 } from 'lucide-react'
import { api } from '../../services/api'
import { toast } from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useRealtimeReservations } from '../../hooks/useRealtimeReservations'
import PoweredByFooter from '../../components/PoweredByFooter'
import StaffReservationWizard from './StaffReservationWizard'
import WalkInModal from './WalkInModal'
import AnalyticsReportModal from '../../components/AnalyticsReportModal'
import { staffForgotPasswordPath, staffLoginPath, staffTablesPath } from '../../utils/restaurantRoutes'

interface TableData {
  id: string
  name: string
  capacity: number
  location: string
  status: 'available' | 'seated' | 'confirmed' | 'arriving' | 'noshow'
}

// Fixed Logo/Icon Container style from references
const IconContainer = ({ children, color = '#6B9E78' }: { children: React.ReactNode, color?: string }) => (
  <div style={{ 
    width: '40px', 
    height: '40px', 
    borderRadius: '12px', 
    backgroundColor: `${color}15`, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    color: color
  }}>
    {children}
  </div>
)

const getLocalISODate = (date: Date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function timeStrToMinutes(t: string | undefined | null): number {
  if (!t) return 0
  const parts = String(t).slice(0, 5).split(':').map(Number)
  return (parts[0] || 0) * 60 + (parts[1] || 0)
}

function bookingEndMinutes(res: any, defaultDurMin: number): number {
  if (res.endTime) return timeStrToMinutes(res.endTime)
  return timeStrToMinutes(res.startTime) + (Number(res.duration) || defaultDurMin)
}

/** Whether probe clock time falls inside an active reservation window [start, end). */
function reservationCoversProbe(res: any, probeMins: number, defaultDurMin: number): boolean {
  if (['cancelled', 'no_show', 'completed'].includes(String(res.status))) return false
  const startM = timeStrToMinutes(res.startTime)
  const endM = bookingEndMinutes(res, defaultDurMin)
  if (endM > startM) return probeMins >= startM && probeMins < endM
  return probeMins >= startM || probeMins < endM
}

function computeTableViewStatus(
  tableReservations: any[],
  viewTime: string,
  defaultDurMin: number
): { status: string; nextReservationTime: string | null } {
  const probeMins = timeStrToMinutes(viewTime.slice(0, 5))
  const active = tableReservations.filter((r) => !['cancelled', 'no_show', 'completed'].includes(String(r.status)))

  const overlapping = active.filter((r) => reservationCoversProbe(r, probeMins, defaultDurMin))
  if (overlapping.length) {
    if (overlapping.some((r) => r.status === 'seated')) return { status: 'seated', nextReservationTime: null }
    if (overlapping.some((r) => r.status === 'arriving')) return { status: 'arriving', nextReservationTime: null }
    return { status: 'confirmed', nextReservationTime: null }
  }

  const afterProbe = active
    .map((r) => ({ r, sm: timeStrToMinutes(r.startTime) }))
    .filter((x) => x.sm > probeMins)
    .sort((a, b) => a.sm - b.sm)

  const nextT = afterProbe.length ? (afterProbe[0].r.startTime || '').slice(0, 5) : null
  return { status: 'available', nextReservationTime: nextT }
}

export default function StaffTableManagement() {
  const { slug: urlSlug } = useParams<{ slug: string }>()
  const { user, logout, isLoading: authLoading } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('Table View') // Default to Table View
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [monthlyResCounts, setMonthlyResCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  
  // Dynamic State
  const [selectedDate, setSelectedDate] = useState(getLocalISODate())
  /** Floor/grid snapshot time — which reservations overlap this moment on the selected day. */
  const [viewTime, setViewTime] = useState('12:00')
  const [dbTables, setDbTables] = useState<any[]>([])
  const [dbAreas, setDbAreas] = useState<any[]>([])
  const [dbReservations, setDbReservations] = useState<any[]>([])
  const [restaurantName, setRestaurantName] = useState('Staff Dashboard')
  const [orgData, setOrgData] = useState<any>(null)
  const [usageData, setUsageData] = useState<any>(null)

  // Modal State
  const [selectedBooking, setSelectedBooking] = useState<any>(null)
  const [selectedTable, setSelectedTable] = useState<any>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showWalkInModal, setShowWalkInModal] = useState(false)
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
  const [wizardPreset, setWizardPreset] = useState<null | {
    table?: { id: string; name?: string | null; tableNumber?: string | null; capacity?: number | null; areaName?: string | null }
    date?: string
    time?: string
  }>(null)
  const [showAccountDropdown, setShowAccountDropdown] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)

  // CSV Import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; failed: number; total: number; errors: Array<{ row: number; error: string }> } | null>(null)
  const [newRes, setNewRes] = useState({
    date: getLocalISODate(),
    time: '18:30',
    partySize: 2,
    guestEmail: '',
    guestFirstName: '',
    guestLastName: '',
    guestPhone: '',
    specialRequests: '',
    tableId: ''
  })

  // ── Table Merge State ──────────────────────────────────────────────────────
  const [selectedTableIds, setSelectedTableIds] = useState<Set<string>>(new Set())
  const [isMergeMode, setIsMergeMode] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergedTableName, setMergedTableName] = useState('')
  const [isMerging, setIsMerging] = useState(false)

  // ── Area Filter State ──────────────────────────────────────────────────────
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('All Areas')

  // ── Table View Mode ────────────────────────────────────────────────────────
  const [tableViewMode, setTableViewMode] = useState<'grid' | 'floormap'>('grid')

  // ── Reservation Edit State ─────────────────────────────────────────────────
  const [editingBooking, setEditingBooking] = useState(false)
  const [editFields, setEditFields] = useState<{
    guestFirstName: string
    guestLastName: string
    guestEmail: string
    guestPhone: string
    reservationDate: string
    startTime: string
    endTime: string
    partySize: number
    specialRequests: string
    internalNotes: string
  } | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  
  // ── Drag and Drop State ──────────────────────────────────────────────
  const [draggedTable, setDraggedTable] = useState<any>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [tablePositions, setTablePositions] = useState<Record<string, { x: number; y: number }>>({})


  // ── Create Area State ──────────────────────────────────────────────────────
  const [showCreateAreaModal, setShowCreateAreaModal] = useState(false)
  const [newAreaName, setNewAreaName] = useState('')
  const [isCreatingArea, setIsCreatingArea] = useState(false)

  // ── Create Table State ──────────────────────────────────────────────────────
  const [showCreateTableModal, setShowCreateTableModal] = useState(false)
  const [newTableData, setNewTableData] = useState({ name: '', capacity: 2, minCapacity: 1, areaId: '' })
  const [isCreatingTable, setIsCreatingTable] = useState(false)

  const restaurantId = user?.restaurantId

  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  const fetchData = useCallback(async (date?: string, currentRestaurantId?: string) => {
    const rid = currentRestaurantId || restaurantId
    const d = date || selectedDate
    if (!rid) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [tablesRes, resvRes, orgRes, areasRes, usageRes] = await Promise.all([
        api.get(`/organizations/${rid}/tables`, {
          params: { forDate: d, layoutTime: viewTime.slice(0, 5) },
        }),
        api.get(`/organizations/${rid}/reservations?date=${d}&limit=500&sortBy=start_time&sortOrder=asc`),
        api.get(`/organizations/${rid}`),
        api.get(`/organizations/${rid}/tables/areas`),
        api.get(`/organizations/${rid}/usage`).catch(() => null)
      ])

      setDbTables(tablesRes.data.data || [])
      setDbAreas(areasRes.data.data || [])
      setDbReservations(resvRes.data.data?.reservations || []) 
      setRestaurantName(orgRes.data.data?.name || 'Staff Dashboard')
      setOrgData(orgRes.data.data)
      if (usageRes?.data?.data) {
        setUsageData(usageRes.data.data)
      }
      setLastRefreshed(new Date())
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [restaurantId, selectedDate, viewTime])

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, table: any) => {
    e.preventDefault()
    setDraggedTable(table)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedTable) return
    
    const areaName = draggedTable.area?.name || draggedTable.floor_areas?.name || draggedTable.location || 'Main Area'
    const containerId = `table-container-${areaName}`
    const container = document.getElementById(containerId)
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    const newX = Math.max(0, Math.min(e.clientX - containerRect.left - dragOffset.x, containerRect.width - 120))
    const newY = Math.max(0, Math.min(e.clientY - containerRect.top - dragOffset.y, containerRect.height - 120))
    
    setTablePositions(prev => ({
      ...prev,
      [draggedTable.id]: { x: newX, y: newY }
    }))
  }, [draggedTable, dragOffset])

  const handleMouseUp = useCallback(() => {
    if (draggedTable) {
      // Save new position to database
      const newPosition = tablePositions[draggedTable.id]
      if (newPosition) {
        api.patch(`/organizations/${restaurantId}/tables/${draggedTable.id}`, {
          positionX: newPosition.x,
          positionY: newPosition.y
        }).then(() => {
          toast.success('Table position updated')
          fetchData(selectedDate, restaurantId)
        }).catch(error => {
          toast.error('Failed to update table position')
          console.error('Failed to update table position:', error)
        })
      }
    }
    setDraggedTable(null)
  }, [draggedTable, tablePositions, restaurantId, selectedDate, fetchData])

  useEffect(() => {
    if (draggedTable) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [draggedTable, handleMouseMove, handleMouseUp])

  useEffect(() => {
    if (authLoading) return
    if (restaurantId) {
      fetchData(selectedDate, restaurantId)
    } else if (user === null) {
      setLoading(false)
    } else if (user && !restaurantId) {
      // Logged in but no org id on persisted user (should be rare after JWT merge on rehydrate)
      setLoading(false)
    }
  }, [authLoading, user, selectedDate, restaurantId, fetchData])

  const fetchMonthlyCounts = useCallback(async () => {
    if (!restaurantId) return
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth() + 1
    try {
      const res = await api.get(`/organizations/${restaurantId}/reservations/monthly-counts?year=${year}&month=${month}`)
      if (res.data?.data) setMonthlyResCounts(res.data.data)
    } catch (err) {
      console.error('Failed to fetch monthly counts:', err)
    }
  }, [restaurantId, calendarMonth])

  // Auto-poll every 15 seconds to keep the system updated
  useEffect(() => {
    if (!restaurantId) return
    const interval = setInterval(() => {
      fetchData(selectedDate, restaurantId)
      fetchMonthlyCounts()
    }, 15_000)
    return () => clearInterval(interval)
  }, [selectedDate, restaurantId, fetchData, fetchMonthlyCounts])

  // Real-time sync: instant refresh on any reservation event
  useRealtimeReservations(restaurantId, useCallback(() => {
    if (restaurantId) {
      fetchData(selectedDate, restaurantId)
      fetchMonthlyCounts()
    }
  }, [restaurantId, selectedDate, fetchData, fetchMonthlyCounts]))

  // Fetch monthly reservation counts for the calendar view when month changes
  useEffect(() => {
    fetchMonthlyCounts()
  }, [fetchMonthlyCounts])

  // Redirect if not logged in — keep restaurant context via slug-scoped staff login
  const navigate = useNavigate()
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate(urlSlug ? staffLoginPath(urlSlug) : staffLoginPath())
    }
  }, [user, authLoading, navigate, urlSlug])

  // URL slug must match the signed-in organization (prevents wrong-tenant bookmarks)
  useEffect(() => {
    if (!orgData?.slug || !urlSlug) return
    if (orgData.slug !== urlSlug) {
      navigate(staffTablesPath(orgData.slug), { replace: true })
    }
  }, [orgData?.slug, urlSlug, navigate])

  // Close account dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setShowAccountDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dayTabs = useMemo(() => {
    const tabs = []
    const now = new Date()
    for (let i = 0; i < 5; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const iso = getLocalISODate(d)
      let label = d.toLocaleDateString('en-GB', { weekday: 'short' })
      if (i === 0) label = 'Today'
      if (i === 1) label = 'Tomorrow'
      tabs.push({ label, iso, day: d.getDate(), month: d.toLocaleDateString('en-GB', { month: 'short' }) })
    }
    return tabs
  }, [])

  const viewTimeOptions = useMemo(() => {
    const slots: string[] = []
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const parts = selectedDate.split('-').map((x) => parseInt(x, 10))
    const cal =
      parts.length === 3 && parts.every((n) => !Number.isNaN(n))
        ? new Date(parts[0], parts[1] - 1, parts[2])
        : new Date()
    const dow = dayNames[cal.getDay()]
    let open = orgData?.openingTime || '09:00'
    let close = orgData?.closingTime || '23:00'
    let wh: any = orgData?.weeklyHours
    if (typeof wh === 'string') {
      try {
        wh = JSON.parse(wh)
      } catch {
        wh = null
      }
    }
    if (wh && typeof wh === 'object' && wh[dow]) {
      if (wh[dow].closed === true || wh[dow].closed === 'true') {
        return []
      }
      if (wh[dow].open != null && String(wh[dow].open).trim() !== '') {
        open = String(wh[dow].open).slice(0, 5)
      }
      if (wh[dow].close != null && String(wh[dow].close).trim() !== '') {
        close = String(wh[dow].close).slice(0, 5)
      }
    }
    let cur = timeStrToMinutes(String(open).slice(0, 5))
    const endM = timeStrToMinutes(String(close).slice(0, 5))
    let guard = 0
    while (cur <= endM && guard++ < 96) {
      const h = Math.floor(cur / 60)
      const m = cur % 60
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
      cur += 30
    }
    return slots.length
      ? slots
      : ['10:00', '10:30', '11:00', '12:00', '13:00', '14:00', '15:00', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00']
  }, [orgData, selectedDate])

  useEffect(() => {
    const now = new Date()
    if (selectedDate === getLocalISODate(now)) {
      const mi = now.getMinutes()
      const rounded = mi < 15 ? 0 : mi < 45 ? 30 : 0
      let h = now.getHours()
      if (mi >= 45) h = (h + 1) % 24
      setViewTime(`${String(h).padStart(2, '0')}:${String(rounded).padStart(2, '0')}`)
    } else {
      setViewTime('12:00')
    }
  }, [selectedDate])

  useEffect(() => {
    if (!viewTimeOptions.length) return
    if (!viewTimeOptions.includes(viewTime)) {
      setViewTime(viewTimeOptions[0])
    }
  }, [viewTimeOptions, viewTime])

  const stats = useMemo(() => {
    const arriving = dbReservations.filter(r => r.status === 'confirmed' || r.status === 'arriving').length
    const seated = dbReservations.filter(r => r.status === 'seated').length
    const confirmed = dbReservations.filter(r => r.status === 'confirmed').length
    const available = dbTables.length - dbReservations.filter(r => r.status === 'seated').length

    return [
      { label: 'Arriving', value: arriving, color: '#C99C63', icon: <Clock size={20} /> },
      { label: 'Seated', value: seated, color: '#E05D5D', icon: <Users size={20} /> },
      { label: 'Confirmed', value: confirmed, color: '#5D8FE0', icon: <Calendar size={20} /> },
      { label: 'Available', value: available, color: '#6B9E78', icon: <Layout size={20} /> }
    ]
  }, [dbTables, dbReservations])

  const groupedAreas = useMemo(() => {
    const areasMap: Record<string, Record<string, { areaId: string, name: string, tables: any[] }>> = {}
    
    dbAreas.forEach(areaObj => {
      const fullAreaName = areaObj.name || 'Main Area'
      let floor = 'Areas'
      let area = fullAreaName

      if (fullAreaName.includes(' - ')) {
        const parts = fullAreaName.split(' - ')
        floor = parts[0].trim()
        area = parts[1].trim()
      }

      if (!areasMap[floor]) areasMap[floor] = {}
      areasMap[floor][area] = { areaId: areaObj.id, name: fullAreaName, tables: [] }
    })

    dbTables.forEach(table => {
      const fullAreaName = table.area?.name || table.floor_areas?.name || table.location || 'Main Area'
      let floor = 'Areas'
      let area = fullAreaName

      if (fullAreaName.includes(' - ')) {
        const parts = fullAreaName.split(' - ')
        floor = parts[0].trim()
        area = parts[1].trim()
      }

      if (!areasMap[floor]) areasMap[floor] = {}
      if (!areasMap[floor][area]) areasMap[floor][area] = { areaId: table.area?.id || table.floor_areas?.id || '', name: fullAreaName, tables: [] }
      
      areasMap[floor][area].tables.push(table)
    })

    // Ensure tables are displayed sequentially within each area (natural sort)
    Object.values(areasMap).forEach(areaGroup => {
      Object.values(areaGroup).forEach(entry => {
        entry.tables.sort((a: any, b: any) => {
          const aKey = String(a.name || a.tableNumber || a.table_number || '').trim()
          const bKey = String(b.name || b.tableNumber || b.table_number || '').trim()
          return aKey.localeCompare(bKey, undefined, { numeric: true, sensitivity: 'base' })
        })
      })
    })

    return areasMap
  }, [dbTables, dbAreas])

  const handleStatusUpdate = async (resId: string, status: string) => {
    try {
      await api.patch(`/organizations/${restaurantId}/reservations/${resId}/status`, { status })
      setSelectedBooking(null); setSelectedTable(null);
      if (restaurantId) fetchData(selectedDate, restaurantId)
    } catch (error: any) {
      console.error('Failed to update status:', error)
      toast.error(error.response?.data?.error || 'Failed to update reservation status.')
    }
  }

  /** Free the physical table while keeping the booking (arriving → confirmed, unassign). */
  const handleClearSeatKeepBooking = async (resId: string) => {
    if (!restaurantId) return
    try {
      await api.patch(`/organizations/${restaurantId}/reservations/${resId}/status`, { status: 'confirmed' })
      await api.put(`/organizations/${restaurantId}/reservations/${resId}`, { tableId: null })
      toast.success('Table cleared — reservation moved back to confirmed (unassigned).')
      setSelectedBooking(null)
      setSelectedTable(null)
      fetchData(selectedDate, restaurantId)
    } catch (error: any) {
      console.error('Failed to clear seat:', error)
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to clear seat.')
    }
  }

  const handleSaveEdit = async () => {
    if (!restaurantId || !selectedBooking || !editFields) return
    try {
      setSavingEdit(true)
      await api.put(`/organizations/${restaurantId}/reservations/${selectedBooking.id}`, {
        guestFirstName: editFields.guestFirstName || undefined,
        guestLastName: editFields.guestLastName || undefined,
        guestEmail: editFields.guestEmail || undefined,
        guestPhone: editFields.guestPhone || undefined,
        reservationDate: editFields.reservationDate,
        startTime: editFields.startTime,
        endTime: editFields.endTime || undefined,
        partySize: editFields.partySize,
        specialRequests: editFields.specialRequests || undefined,
        internalNotes: editFields.internalNotes || undefined,
      })
      toast.success('Reservation updated successfully')
      setEditingBooking(false)
      setEditFields(null)
      setSelectedBooking(null)
      setSelectedTable(null)
      fetchData(selectedDate, restaurantId)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Failed to update reservation')
    } finally {
      setSavingEdit(false)
    }
  }

  const guestDisplayName = (r: { guestFirstName?: string; guestLastName?: string }) => {
    const n = `${r.guestFirstName || ''} ${r.guestLastName || ''}`.trim()
    return n || 'Guest'
  }

  const timelineScrollRef = useRef<HTMLDivElement | null>(null)

  const handleTimelineHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const el = timelineScrollRef.current
    if (!el) return
    const startX = e.clientX
    const startScroll = el.scrollLeft
    const onMove = (ev: MouseEvent) => {
      el.scrollLeft = startScroll - (ev.clientX - startX)
    }
    const onUp = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  const dayViewReservations = useMemo(
    () =>
      dbReservations.filter((r) => !['completed', 'cancelled', 'no_show'].includes(r.status)),
    [dbReservations]
  )

  const handleCreateArea = async () => {
    if (!newAreaName.trim()) return
    try {
      setIsCreatingArea(true)
      await api.post(`/organizations/${restaurantId}/tables/areas`, {
        name: newAreaName.trim()
      })
      toast.success('Area created successfully')
      setShowCreateAreaModal(false)
      setNewAreaName('')
      if (restaurantId) fetchData(selectedDate, restaurantId)
    } catch (error: any) {
      console.error('Failed to create area:', error)
      toast.error(error.response?.data?.error || 'Failed to create area')
    } finally {
      setIsCreatingArea(false)
    }
  }

  const handleCreateTable = async () => {
    if (!newTableData.name.trim() || !newTableData.areaId) return
    try {
      setIsCreatingTable(true)
      await api.post(`/organizations/${restaurantId}/tables`, {
        tableNumber: newTableData.name.trim(), // Use name as tableNumber for now
        name: newTableData.name.trim(),
        capacity: newTableData.capacity,
        minCapacity: newTableData.minCapacity,
        areaId: newTableData.areaId
      })
      toast.success('Table created successfully')
      setShowCreateTableModal(false)
      setNewTableData({ name: '', capacity: 2, minCapacity: 1, areaId: '' })
      if (restaurantId) fetchData(selectedDate, restaurantId)
    } catch (error: any) {
      console.error('Failed to create table:', error)
      toast.error(error.response?.data?.error || 'Failed to create table')
    } finally {
      setIsCreatingTable(false)
    }
  }

  const handleCreateReservation = async () => {
    try {
      await api.post(`/organizations/${restaurantId}/reservations`, {
        reservationDate: newRes.date,
        startTime: newRes.time,
        partySize: newRes.partySize,
        guestEmail: newRes.guestEmail,
        guestFirstName: newRes.guestFirstName,
        guestLastName: newRes.guestLastName,
        guestPhone: newRes.guestPhone,
        specialRequests: newRes.specialRequests,
        tableId: newRes.tableId || null,
        source: 'pos'
      })
      setShowCreateModal(false)
      if (restaurantId) fetchData(selectedDate, restaurantId)
    } catch (error) {
      console.error('Failed to create reservation:', error)
    }
  }

  const handleTableClick = (table: any, event: React.MouseEvent) => {
    if (event.shiftKey) {
      if (table.isMerged) return // Can't select already-merged tables
      setSelectedTableIds(prev => {
        const next = new Set(prev)
        next.has(table.id) ? next.delete(table.id) : next.add(table.id)
        return next
      })
      setIsMergeMode(true)
    } else {
      if (isMergeMode) {
        setSelectedTableIds(new Set())
        setIsMergeMode(false)
      }
      setSelectedTable(table)
    }
  }

  const handleConfirmMerge = async () => {
    if (!restaurantId) return
    setIsMerging(true)
    try {
      const ids = Array.from(selectedTableIds)
      const totalCapacity = dbTables
        .filter(t => ids.includes(t.id))
        .reduce((sum, t) => sum + (t.capacity || 0), 0)
      await api.post(`/organizations/${restaurantId}/tables/merge`, {
        sourceTableIds: ids,
        mergedTable: { name: mergedTableName.trim() || 'Merged Table', capacity: totalCapacity },
        mergeEffectiveFrom: selectedDate
      })
      toast.success(
        selectedDate > getLocalISODate()
          ? 'Merge scheduled: separate tables stay available until that day.'
          : 'Tables merged! Booking can now be assigned to the merged table.'
      )
      setSelectedTableIds(new Set())
      setIsMergeMode(false)
      setShowMergeModal(false)
      setMergedTableName('')
      fetchData(selectedDate, restaurantId)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to merge tables')
    } finally {
      setIsMerging(false)
    }
  }

  const handleUnmerge = async (mergedTableId: string) => {
    if (!restaurantId) return
    try {
      await api.post(`/organizations/${restaurantId}/tables/${mergedTableId}/unmerge`)
      toast.success('Tables restored to individual status')
      setSelectedTable(null)
      fetchData(selectedDate, restaurantId)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to unmerge tables')
    }
  }

  const formatDuration = (startTime: string, endTime: string): string | null => {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const totalMins = (eh * 60 + em) - (sh * 60 + sm)
    if (totalMins <= 0) return null
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  const getStatusStyle = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'arriving': return { bg: 'rgba(194, 65, 12, 0.15)', color: '#F59E0B' }
        case 'seated': return { bg: 'rgba(185, 28, 28, 0.15)', color: '#F87171' }
        case 'confirmed': return { bg: 'rgba(29, 78, 216, 0.15)', color: '#60A5FA' }
        case 'completed': return { bg: 'rgba(94, 234, 122, 0.1)', color: '#5EEA7A' }
        case 'noshow': return { bg: 'rgba(75, 85, 99, 0.15)', color: '#9CA3AF' }
        default: return { bg: 'rgba(21, 128, 61, 0.15)', color: '#4ADE80' }
      }
    }
    switch (status) {
      case 'arriving': return { bg: '#FFF7ED', color: '#C2410C' }
      case 'seated': return { bg: '#FEF2F2', color: '#B91C1C' }
      case 'confirmed': return { bg: '#EFF6FF', color: '#1D4ED8' }
      case 'completed': return { bg: '#F0FDF4', color: '#15803D' }
      case 'noshow': return { bg: '#F9FAFB', color: '#4B5563' }
      default: return { bg: '#F0FDF4', color: '#15803D' }
    }
  }

  if ((authLoading || loading) && dbTables.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', fontWeight: 500 }}>Loading Dashboard...</p>
      </div>
    )
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
  const selectedDayOfWeek = dayNames[new Date(selectedDate + 'T00:00:00').getDay()]
  const weeklyHours = orgData?.weeklyHours
  const dayConfig = weeklyHours?.[selectedDayOfWeek]
  const isDayClosed = dayConfig?.closed === true || dayConfig?.closed === 'true'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: "'Inter', system-ui, sans-serif", transition: 'background-color 0.3s' }}>
      {/* Header Section */}
      <header style={{ backgroundColor: 'var(--header-bg)', padding: '24px 40px', borderBottom: `1px solid var(--header-border)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50, transition: 'background-color 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {orgData?.logoUrl ? (
            <img src={orgData.logoUrl} alt="Logo" style={{ height: '48px', maxWidth: '160px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; const span = document.createElement('span'); span.innerText = 'Logo'; span.style.fontWeight = '700'; span.style.fontSize = '1.35rem'; span.style.color = 'var(--text-primary)'; e.currentTarget.parentNode?.appendChild(span); }} />
          ) : (
            <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layout size={24} color="var(--text-primary)" />
            </div>
          )}
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{restaurantName}</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Staff Console
              {lastRefreshed && (
                <span style={{ marginLeft: '12px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  • Last synced: {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => { setShowImportModal(true); setImportFile(null); setImportResult(null) }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '10px 16px', 
              border: `1px solid var(--border-primary)`, 
              borderRadius: '12px', 
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-card)',
              transition: 'all 0.2s'
            }}>
            <Calendar size={18} />
            Import Reservations
          </button>
          {/* Analytics Report button — manager/admin only */}
          {(user?.role === 'manager' || user?.role === 'admin' || user?.role === 'restaurant_admin') && (
            <button
              onClick={() => setShowAnalyticsModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px',
                border: `1px solid var(--border-primary)`,
                borderRadius: '12px', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: 600,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-card)',
                transition: 'all 0.2s'
              }}
            >
              <BarChart2 size={17} />
              Analytics
            </button>
          )}
          {/* Walk-in button */}
          <button
            onClick={() => {
              if (isDayClosed) {
                toast.error(`The restaurant is closed on ${selectedDayOfWeek.charAt(0).toUpperCase() + selectedDayOfWeek.slice(1)}s.`)
                return
              }
              setShowWalkInModal(true)
            }}
            disabled={isDayClosed}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              border: `1.5px solid ${isDayClosed ? 'var(--border-primary)' : '#C99C63'}`,
              borderRadius: '12px', cursor: isDayClosed ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem', fontWeight: 600,
              color: isDayClosed ? 'var(--text-tertiary)' : '#C99C63',
              backgroundColor: 'transparent',
              opacity: isDayClosed ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
          >
            <UserCheck size={17} />
            Walk In
          </button>
          <button
            onClick={() => {
              if (isDayClosed) {
                toast.error(`The restaurant is closed on ${selectedDayOfWeek.charAt(0).toUpperCase() + selectedDayOfWeek.slice(1)}s.`)
                return
              }
              setShowCreateModal(true)
            }}
            disabled={isDayClosed}
            style={{
              backgroundColor: isDayClosed ? 'var(--bg-tertiary)' : (isDark ? '#C99C63' : '#111827'),
              color: isDayClosed ? 'var(--text-tertiary)' : (isDark ? '#0B1517' : '#ffffff'),
              padding: '10px 24px',
              borderRadius: '12px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isDayClosed ? 'not-allowed' : 'pointer',
              opacity: isDayClosed ? 0.6 : 1,
              transition: 'all 0.2s'
            }}>
            <Plus size={18} />
            Create Reservation
          </button>
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--header-border)', margin: '0 8px' }} />
          {/* Account Dropdown */}
          {(() => {
            const displayName = user?.name || user?.email?.split('@')[0] || 'User'
            const displayEmail = user?.email || ''
            const displayRole = user?.role || 'viewer'
            const roleLabels: Record<string, { label: string; color: string; bg: string }> = {
              admin: { label: 'Admin', color: '#C99C63', bg: 'rgba(201,156,99,0.15)' },
              restaurant_admin: { label: 'Admin', color: '#C99C63', bg: 'rgba(201,156,99,0.15)' },
              manager: { label: 'Manager', color: '#6B9E78', bg: 'rgba(107,158,120,0.15)' },
              host: { label: 'Host', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
              viewer: { label: 'Viewer', color: '#8b949e', bg: 'rgba(139,148,158,0.15)' },
            }
            const r = roleLabels[displayRole] || roleLabels['viewer']
            return (
              <div style={{ position: 'relative' }} ref={accountRef}>
                <button
                  id="staff-account-menu-trigger"
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  style={{
                    padding: '6px',
                    color: showAccountDropdown ? '#C99C63' : 'var(--text-secondary)',
                    background: showAccountDropdown ? 'rgba(201,156,99,0.1)' : 'none',
                    border: showAccountDropdown ? '1px solid rgba(201,156,99,0.3)' : '1px solid transparent',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <CircleUser size={26} />
                </button>
                {showAccountDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    backgroundColor: isDark ? '#161B22' : '#ffffff',
                    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    padding: '6px',
                    minWidth: '260px',
                    boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    animation: 'fadeInUp 0.15s ease-out',
                  }}>
                    {/* User Info */}
                    <div style={{ padding: '14px', borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`, marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #C99C63, #b58b57)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isDark ? '#fff' : '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                          <div style={{ fontSize: '0.8rem', color: isDark ? '#8b949e' : '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{displayEmail}</div>
                          <div style={{ marginTop: '6px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, color: r.color, backgroundColor: r.bg, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{r.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Menu Items */}
                    <button
                      onClick={() => { toggleTheme(); setShowAccountDropdown(false) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'none', border: 'none', borderRadius: '6px', color: isDark ? '#e6edf3' : '#1f2937', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' as const, transition: 'background-color 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#30363d' : '#f3f4f6'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {isDark ? <Sun size={16} /> : <Moon size={16} />}
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button
                      onClick={() => { setShowAccountDropdown(false); navigate(staffForgotPasswordPath(orgData?.slug || urlSlug)) }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'none', border: 'none', borderRadius: '6px', color: isDark ? '#e6edf3' : '#1f2937', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' as const, transition: 'background-color 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#30363d' : '#f3f4f6'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <KeyRound size={16} />
                      Reset Password
                    </button>
                    <div style={{ height: '1px', backgroundColor: isDark ? '#30363d' : '#e5e7eb', margin: '4px 0' }} />
                    <button
                      onClick={() => {
                        const signOutSlug = orgData?.slug || user?.restaurantSlug || urlSlug
                        setShowAccountDropdown(false)
                        logout()
                        navigate(staffLoginPath(signOutSlug))
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'none', border: 'none', borderRadius: '6px', color: '#ef4444', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'left' as const, transition: 'background-color 0.15s' }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </header>

      <main style={{ padding: '32px 40px' }}>
        {/* Statistics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)', transition: 'background-color 0.3s, border-color 0.3s' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '8px', margin: 0 }}>{stat.label}</p>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{stat.value}</h2>
              </div>
              <IconContainer color={stat.color}>{stat.icon}</IconContainer>
            </div>
          ))}
        </div>

        {/* Plan Usage Indicator */}
        {usageData && usageData.plan === 'starter' && (
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--border-primary)', marginBottom: '40px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Reservations Limit</span>
                <span style={{ backgroundColor: isDark ? 'rgba(201,156,99,0.15)' : '#FFF7ED', color: '#C99C63', padding: '2px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700 }}>STARTER PLAN</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{usageData.monthlyCount}</span> / {usageData.monthlyLimit} reservations
              </div>
            </div>
            
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', 
                width: `${usageData.percentUsed}%`, 
                backgroundColor: usageData.percentUsed >= 100 ? '#ef4444' : usageData.percentUsed >= 80 ? '#f59e0b' : '#10b981',
                transition: 'width 0.5s ease-out',
                borderRadius: '4px'
              }} />
            </div>
            
            {/* Warning Text */}
            {usageData.percentUsed >= 100 ? (
              <div style={{ fontSize: '0.875rem', color: '#ef4444', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>You have reached your monthly reservation limit. Additional reservations will be blocked.</span>
                <button onClick={() => window.open('/admin', '_blank')} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Upgrade Now</button>
              </div>
            ) : usageData.percentUsed >= 80 ? (
              <div style={{ fontSize: '0.875rem', color: '#f59e0b', fontWeight: 500 }}>
                You are approaching your monthly reservation limit. Upgrade to Professional for unlimited bookings.
              </div>
            ) : null}
          </div>
        )}

        {/* View Controls & Date Navigation */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '24px', border: '1px solid var(--border-primary)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', transition: 'background-color 0.3s, border-color 0.3s' }}>
          <div style={{ padding: '24px 32px', borderBottom: `1px solid var(--border-primary)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', transition: 'background-color 0.3s' }}>
            <div style={{ display: 'flex', backgroundColor: 'var(--bg-hover)', padding: '4px', borderRadius: '12px', gap: '4px' }}>
              {['Day View', 'Table View', 'Timeline View', 'Calendar View'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    backgroundColor: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {dayTabs.map(tab => (
                <button
                  key={tab.iso}
                  onClick={() => setSelectedDate(tab.iso)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: selectedDate === tab.iso
                      ? (isDark ? '#C99C63' : '#111827')
                      : 'var(--border-primary)',
                    backgroundColor: selectedDate === tab.iso
                      ? (isDark ? '#C99C63' : '#111827')
                      : 'var(--bg-card)',
                    color: selectedDate === tab.iso
                      ? (isDark ? '#0B1517' : '#ffffff')
                      : 'var(--text-primary)',
                    cursor: 'pointer',
                    minWidth: '70px',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: selectedDate === tab.iso ? (isDark ? 'rgba(11,21,23,0.7)' : 'rgba(255,255,255,0.7)') : 'var(--text-secondary)' }}>{tab.label}</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700 }}>{tab.day}</span>
                </button>
              ))}
            </div>
          </div>

          {/* View Content */}
          <div style={{ minHeight: '500px' }}>
            {isDayClosed && (activeTab === 'Table View' || activeTab === 'Day View') && (
              <div style={{ padding: '32px' }}>
                <div style={{ border: `1px solid var(--border-secondary)`, borderRadius: '16px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-md)', padding: '64px 32px', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔒</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Restaurant Closed</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                    The restaurant is closed on {selectedDayOfWeek.charAt(0).toUpperCase() + selectedDayOfWeek.slice(1)}s. Select a different day to manage reservations.
                  </p>
                </div>
              </div>
            )}
            {activeTab === 'Table View' && !isDayClosed && (
              <div style={{ backgroundColor: 'var(--bg-card)', paddingBottom: '60px', transition: 'background-color 0.3s', position: 'relative' }}>
                {/* Table View Mode Toggle + Shift+Click hint */}
                <div style={{ padding: '10px 60px', backgroundColor: isMergeMode ? (isDark ? 'rgba(201,156,99,0.1)' : 'rgba(201,156,99,0.06)') : 'transparent', borderBottom: isMergeMode ? `1px solid rgba(201,156,99,0.2)` : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', transition: 'all 0.3s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 200px' }}>
                    <Link2 size={13} color={isMergeMode ? '#C99C63' : 'var(--text-tertiary)'} />
                    <span style={{ fontSize: '0.75rem', color: isMergeMode ? '#C99C63' : 'var(--text-tertiary)', fontWeight: 500 }}>
                      {isMergeMode ? `${selectedTableIds.size} table${selectedTableIds.size !== 1 ? 's' : ''} selected — Shift+Click to add more, or use the bar below` : 'Hold Shift + Click tables to select multiple for a large-party merge'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 auto' }}>
                    <Clock size={14} color="var(--text-tertiary)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>Status at</span>
                    <select
                      value={viewTime}
                      onChange={(e) => setViewTime(e.target.value)}
                      aria-label="Time snapshot for table occupancy"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                        backgroundColor: isDark ? '#161B22' : '#ffffff',
                        color: 'var(--text-primary)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        minWidth: '88px',
                      }}
                    >
                      {viewTimeOptions.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', maxWidth: '140px', lineHeight: 1.3 }}>Shows which tables are in use at this time on {selectedDate}</span>
                  </div>
                  {/* Grid / Floor Map toggle */}
                  <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', padding: '3px' }}>
                    {(['grid', 'floormap'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setTableViewMode(mode)}
                        style={{
                          padding: '5px 14px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          backgroundColor: tableViewMode === mode ? (isDark ? '#C99C63' : '#111827') : 'transparent',
                          color: tableViewMode === mode ? '#ffffff' : 'var(--text-secondary)',
                          transition: 'all 0.2s',
                        }}
                      >
                        {mode === 'grid' ? 'Grid' : 'Floor Map'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Main Two-Pane Layout (Grid mode only) */}
                <div style={{ display: tableViewMode === 'grid' ? 'flex' : 'none', alignItems: 'flex-start' }}>
                  
                  {/* Left Pane: Sidebar Navigator */}
                  <div style={{ width: '250px', flexShrink: 0, padding: '24px', borderRight: '1px solid var(--border-primary)', minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '24px' }}>
                        <button 
                          onClick={() => setSelectedAreaFilter('All Areas')}
                          style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderRadius: '12px', border: 'none', backgroundColor: selectedAreaFilter === 'All Areas' ? 'var(--bg-tertiary)' : 'transparent', color: selectedAreaFilter === 'All Areas' ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: selectedAreaFilter === 'All Areas' ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s', borderRight: selectedAreaFilter === 'All Areas' ? `3px solid #C99C63` : '3px solid transparent' }}>
                          All Areas
                        </button>
                      </div>

                      {Object.entries(groupedAreas).map(([floorName, areas]) => (
                        <div key={floorName} style={{ marginBottom: '24px' }}>
                        <div style={{ padding: '0 16px', marginBottom: '8px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {floorName}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {Object.keys(areas).map(areaName => {
                             const filterKey = floorName === 'Areas' ? areaName : `${floorName} - ${areaName}`
                             const isSelected = selectedAreaFilter === filterKey

                             // Calculate occupancy
                             const areaData = areas[areaName]
                             const areaTables = areaData.tables
                             const seatedCount = areaTables.filter(t => {
                               return dbReservations.some(r => r.table?.id === t.id && r.status === 'seated' && !['cancelled', 'no_show'].includes(r.status))
                             }).length

                             return (
                               <button 
                                 key={areaName}
                                 onClick={() => setSelectedAreaFilter(filterKey)}
                                 style={{ 
                                   width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left', padding: '10px 16px', borderRadius: '12px', border: 'none', 
                                   backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent', 
                                   color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', 
                                   fontWeight: isSelected ? 600 : 500, 
                                   cursor: 'pointer', transition: 'all 0.2s',
                                   borderRight: isSelected ? `3px solid #C99C63` : '3px solid transparent'
                                 }}
                               >
                                 <span style={{ fontSize: '0.875rem' }}>{areaName}</span>
                                 {seatedCount > 0 && (
                                   <span style={{ fontSize: '0.7rem', backgroundColor: isDark ? 'rgba(107,158,120,0.15)' : '#F0FDF4', color: '#6B9E78', padding: '2px 8px', borderRadius: '100px', fontWeight: 700 }}>
                                     {seatedCount}/{areaTables.length}
                                   </span>
                                 )}
                               </button>
                             )
                          })}
                        </div>
                      </div>
                    ))}
                    </div>

                    {/* Create Area Button */}
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--border-primary)' }}>
                      <button 
                        onClick={() => setShowCreateAreaModal(true)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px dashed var(--text-tertiary)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.875rem' }}
                        onMouseOver={e => { e.currentTarget.style.borderColor = '#C99C63'; e.currentTarget.style.color = '#C99C63' }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                      >
                        <Plus size={16} />
                        Create Area
                      </button>
                    </div>
                  </div>

                  {/* Right Pane: Table Grid */}
                  <div style={{ flex: 1, paddingBottom: '60px' }}>
                    {Object.entries(groupedAreas).flatMap(([floorName, floorAreas]) => 
                      Object.entries(floorAreas).map(([areaShortName, areaData]) => {
                        const fullAreaName = areaData.name
                        const areaTables = areaData.tables
                        if (selectedAreaFilter !== 'All Areas' && fullAreaName !== selectedAreaFilter) return []
                        
                        return (
                          <div key={fullAreaName} style={{ marginBottom: '40px' }}>
                            {selectedAreaFilter === 'All Areas' ? (
                              <div style={{ padding: '24px 60px', backgroundColor: 'var(--bg-tertiary)', borderTop: `1px solid var(--border-primary)`, borderBottom: `1px solid var(--border-primary)`, marginBottom: '40px', transition: 'background-color 0.3s' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{fullAreaName}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{(areaTables as any[]).length} Tables</p>
                              </div>
                            ) : (
                              <div style={{ padding: '32px 60px 16px', marginBottom: '24px', borderBottom: `1px solid var(--border-primary)` }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{areaShortName}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{(areaTables as any[]).length} Tables</p>
                              </div>
                            )}
                            <div
  id={`table-container-${areaShortName}`}
  style={{
  padding: '40px 60px',
  display: 'flex',
  flexWrap: 'wrap',
  gap: '40px',
  alignItems: 'flex-start',
}}>
                      {(areaTables as any[]).map(table => {
                        // Get all valid reservations for this table today
                        const tableReservations = dbReservations.filter(r => r.table?.id === table.id && !['cancelled', 'no_show', 'completed'].includes(r.status))
                        const defaultDur = orgData?.defaultReservationDurationMin ?? 90
                        const { status, nextReservationTime } = computeTableViewStatus(tableReservations, viewTime, defaultDur)
                        
                        const visualStatus = status === 'pending_arrival' ? 'arriving' : status
                        const style = getStatusStyle(visualStatus)
                        const capacity = table.capacity || 4
                        
                        return (
                          <div
                            key={table.id}
                            onClick={(e) => handleTableClick(table, e)}
                            style={{
                              position: 'relative',
                              width: '120px',
                              height: '120px',
                              cursor: 'pointer',
                              opacity: isMergeMode && table.isMerged ? 0.45 : 1,
                              transition: 'opacity 0.2s'
                            }}>
                            {/* Selected checkmark badge */}
                            {selectedTableIds.has(table.id) && (
                              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#C99C63', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, boxShadow: '0 2px 8px rgba(201,156,99,0.5)' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                              </div>
                            )}
                            {/* Merged chain badge */}
                            {table.isMerged && !selectedTableIds.has(table.id) && (
                              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, boxShadow: '0 2px 8px rgba(56,189,248,0.5)' }}>
                                <Link2 size={12} color="#fff" />
                              </div>
                            )}
                            
                            {/* Plus Chair Layout - Rendered based on capacity */}
                            {capacity >= 1 && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: `1px solid var(--chair-border)` }} />} {/* Top */}
                            {capacity >= 2 && <div style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: `1px solid var(--chair-border)` }} />} {/* Bottom */}
                            {capacity >= 3 && <div style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: `1px solid var(--chair-border)` }} />} {/* Left */}
                            {capacity >= 4 && <div style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: `1px solid var(--chair-border)` }} />} {/* Right */}

                            {/* The Table */}
                            <div style={{ 
                              width: '100%', 
                              height: '100%', 
                              borderRadius: '16px', 
                              border: selectedTableIds.has(table.id)
                                ? '2.5px solid #C99C63'
                                : table.isMerged
                                  ? '2.5px solid #38bdf8'
                                  : `2.5px solid ${status === 'available' ? 'var(--table-circle-border)' : style.color}`,
                              backgroundColor: selectedTableIds.has(table.id) ? (isDark ? 'rgba(201,156,99,0.1)' : 'rgba(201,156,99,0.05)') : 'var(--table-circle-bg)',
                              boxShadow: selectedTableIds.has(table.id) ? '0 0 0 4px rgba(201,156,99,0.25)' : 'var(--shadow-md)',
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              position: 'relative',
                              zIndex: 10,
                              transition: 'all 0.3s'
                            }}>
                              <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center', maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 4px' }}>{table.name || `T-${table.tableNumber}`}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                <Users size={12} color="var(--text-tertiary)" />
                                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{capacity}</span>
                              </div>
                              
                              {visualStatus !== 'available' ? (
                                <div style={{ 
                                  position: 'absolute', 
                                  bottom: '-6px', 
                                  backgroundColor: style.color, 
                                  color: '#ffffff', 
                                  fontSize: '0.625rem', 
                                  padding: '2px 10px', 
                                  borderRadius: '100px', 
                                  fontWeight: 800, 
                                  textTransform: 'uppercase',
                                  boxShadow: `0 4px 8px ${style.color}40`
                                }}>
                                  {visualStatus === 'arriving' ? 'ARRIVING' : visualStatus}
                                </div>
                              ) : nextReservationTime ? (
                                <div style={{ 
                                  position: 'absolute', 
                                  bottom: '-6px', 
                                  backgroundColor: 'var(--bg-tertiary)', 
                                  color: 'var(--text-secondary)', 
                                  border: `1px solid var(--border-primary)`,
                                  fontSize: '0.55rem', 
                                  padding: '2px 8px', 
                                  borderRadius: '100px', 
                                  fontWeight: 700, 
                                  textTransform: 'uppercase'
                                }}>
                                  NEXT: {nextReservationTime}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* Add Table Button for this Area */}
                      {areaData.areaId && (
                        <div 
                          onClick={() => { setNewTableData(prev => ({...prev, areaId: areaData.areaId})); setShowCreateTableModal(true); }}
                          style={{ position: 'relative', width: '120px', height: '120px', cursor: 'pointer', borderRadius: '16px', border: '2px dashed var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-tertiary)', transition: 'all 0.2s', backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = '#C99C63'; e.currentTarget.style.color = '#C99C63'; e.currentTarget.style.backgroundColor = isDark ? 'rgba(201,156,99,0.05)' : 'rgba(201,156,99,0.05)'; }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--text-tertiary)'; e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'; }}
                        >
                          <Plus size={24} />
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Add Table</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
                  </div>
                </div>
                {/* Merge Action Bar */}
                {isMergeMode && (
                  <div style={{ position: 'sticky', bottom: '20px', margin: '0 60px 20px', backgroundColor: isDark ? '#0d1b1e' : '#1f2937', borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(0,0,0,0.45)', border: '1px solid rgba(201,156,99,0.3)', zIndex: 40 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(201,156,99,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Link2 size={18} color="#C99C63" />
                      </div>
                      <div>
                        <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9rem' }}>
                          {selectedTableIds.size} table{selectedTableIds.size !== 1 ? 's' : ''} selected
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginTop: '2px' }}>
                          {selectedTableIds.size >= 2
                            ? `Combined capacity: ${dbTables.filter(t => selectedTableIds.has(t.id)).reduce((s, t) => s + (t.capacity || 0), 0)} guests`
                            : 'Select at least 2 tables to merge'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => { setSelectedTableIds(new Set()); setIsMergeMode(false) }} style={{ padding: '10px 18px', borderRadius: '10px', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.75)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
                      <button
                        onClick={() => {
                          if (selectedTableIds.size >= 2) {
                            const names = dbTables.filter(t => selectedTableIds.has(t.id)).map(t => t.name || `T-${t.tableNumber}`).join(' + ')
                            setMergedTableName(names)
                            setShowMergeModal(true)
                          }
                        }}
                        disabled={selectedTableIds.size < 2}
                        style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: selectedTableIds.size >= 2 ? '#C99C63' : 'rgba(201,156,99,0.25)', border: 'none', color: selectedTableIds.size >= 2 ? '#0B1517' : 'rgba(255,255,255,0.35)', fontWeight: 700, cursor: selectedTableIds.size >= 2 ? 'pointer' : 'not-allowed', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link2 size={15} /> Merge Tables
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Floor Map View ────────────────────────────────────────────────────── */}
                {tableViewMode === 'floormap' && (
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        width: 'calc(100% - 120px)',
                        height: '680px',
                        overflow: 'auto',
                        border: `1px solid var(--border-primary)`,
                        borderRadius: '12px',
                        margin: '24px 60px',
                        cursor: 'default',
                      }}
                    >
                      {/* Inner canvas — matches admin floor plan dimensions */}
                      <div
                        style={{
                          width: '2400px',
                          height: '1800px',
                          position: 'relative',
                          backgroundImage: isDark
                            ? 'linear-gradient(rgba(48,54,61,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(48,54,61,0.4) 1px, transparent 1px)'
                            : 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                          backgroundSize: '20px 20px',
                          backgroundColor: isDark ? '#0D1117' : '#F9FAFB',
                        }}
                      >
                        {dbTables.map((table, tableIndex) => {
                          const posX = table.positionX || (tableIndex % 8) * 160 + 40
                          const posY = table.positionY || Math.floor(tableIndex / 8) * 160 + 40

                          const tableReservations = dbReservations.filter(r => r.table?.id === table.id && !['cancelled', 'no_show', 'completed'].includes(r.status))
                          const defaultDur = orgData?.defaultReservationDurationMin ?? 90
                          const { status, nextReservationTime } = computeTableViewStatus(tableReservations, viewTime, defaultDur)

                          const visualStatus = status === 'pending_arrival' ? 'arriving' : status
                          const style = getStatusStyle(visualStatus)
                          const capacity = table.capacity || 4
                          const areaName = table.area?.name || table.floor_areas?.name || table.location || ''

                          return (
                            <div
                              key={table.id}
                              onClick={(e) => handleTableClick(table, e)}
                              style={{
                                position: 'absolute',
                                left: `${posX}px`,
                                top: `${posY}px`,
                                width: '120px',
                                height: '120px',
                                cursor: 'pointer',
                              }}
                            >
                              {/* Chair indicators */}
                              {capacity >= 1 && <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: '1px solid var(--chair-border)' }} />}
                              {capacity >= 2 && <div style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: '1px solid var(--chair-border)' }} />}
                              {capacity >= 3 && <div style={{ position: 'absolute', left: '-12px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: '1px solid var(--chair-border)' }} />}
                              {capacity >= 4 && <div style={{ position: 'absolute', right: '-12px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', backgroundColor: 'var(--chair-bg)', borderRadius: '6px', border: '1px solid var(--chair-border)' }} />}

                              {/* Table card */}
                              <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '16px',
                                border: `2px solid ${style.color}`,
                                backgroundColor: style.bg,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: 'var(--shadow-sm)',
                                transition: 'all 0.2s',
                              }}>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: style.color, textAlign: 'center', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {table.name || `T-${table.tableNumber}`}
                                </span>
                                {areaName && (
                                  <span style={{ fontSize: '0.6rem', color: style.color, opacity: 0.6, textAlign: 'center' }}>{areaName}</span>
                                )}
                                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: style.color, opacity: 0.7, textAlign: 'center' }}>{visualStatus.toUpperCase()}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textAlign: 'center', margin: '-12px 0 16px' }}>
                      Layout mirrors the admin floor plan. Scroll to navigate. Click a table to manage reservations.
                    </p>
                  </div>
                )}

                {/* Unassigned Reservations in Table View */}
                {dbReservations.filter(r => !r.table?.id && !['completed', 'cancelled', 'no_show'].includes(r.status)).length > 0 && (
                  <div style={{ width: '100%', marginTop: '40px', paddingTop: '40px', borderTop: `2px dashed var(--border-primary)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 24px 0' }}>Unassigned Reservations</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center' }}>
                      {dbReservations.filter(r => !r.table?.id && !['completed', 'cancelled', 'no_show'].includes(r.status)).map(res => (
                         <div 
                           key={res.id} 
                           onClick={() => setSelectedBooking(res)} 
                           style={{ backgroundColor: 'var(--bg-tertiary)', border: `1px dashed var(--border-secondary)`, padding: '16px 32px', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
                           onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--text-tertiary)'}
                           onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-secondary)'}
                         >
                           <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{guestDisplayName(res)}</span>
                           <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{res.partySize} Guests • {res.startTime?.slice(0, 5)}</span>
                           <span style={{ marginTop: '12px', fontSize: '0.625rem', fontWeight: 800, color: '#C2410C', backgroundColor: isDark ? 'rgba(194,65,12,0.15)' : '#FFF7ED', padding: '4px 10px', borderRadius: '100px', letterSpacing: '0.05em' }}>NEEDS TABLE</span>
                         </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Day View' && !isDayClosed && (
              <div style={{ padding: '40px', display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '12px' }}>
                {dayViewReservations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)' }}>
                    <Calendar size={48} style={{ opacity: 0.1, marginBottom: '16px' }} />
                    <p>No active reservations for {selectedDate}</p>
                  </div>
                ) : (
                  dayViewReservations.sort((a,b) => (a.startTime || '').localeCompare(b.startTime || '')).map(res => {
                    const style = getStatusStyle(res.status)
                    const initials = `${res.guestFirstName?.[0] || ''}${res.guestLastName?.[0] || ''}`.trim() || 'G'
                    return (
                      <div 
                        key={res.id} 
                        onClick={() => setSelectedBooking(res)}
                        style={{ 
                          backgroundColor: 'var(--bg-card)', 
                          padding: '20px 24px', 
                          borderRadius: '16px', 
                          border: `1px solid var(--border-primary)`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: 'var(--shadow-sm)'
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', width: '70px' }}>{res.startTime?.slice(0, 5)}</div>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: style.bg, color: style.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{guestDisplayName(res)}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Table {res.table?.tableNumber || res.table?.name || 'N/A'} • {res.partySize} Guests</div>
                          </div>
                        </div>
                        <div style={{ 
                          backgroundColor: style.bg, 
                          color: style.color, 
                          padding: '8px 20px', 
                          borderRadius: '100px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          textTransform: 'uppercase',
                          letterSpacing: '0.02em',
                          border: `1px solid ${style.color}15`
                        }}>
                          {res.status}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
                      {activeTab === 'Timeline View' && (() => {
              // ── Dynamic time range from restaurant's day-specific weekly hours ──
              const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
              const selectedDayOfWeek = dayNames[new Date(selectedDate + 'T00:00:00').getDay()]
              const weeklyHours = orgData?.weeklyHours
              const dayConfig = weeklyHours?.[selectedDayOfWeek]
              const isDayClosed = dayConfig?.closed === true || dayConfig?.closed === 'true'

              // Use day-specific hours if available, otherwise fall back to global defaults
              const rawOpen = (dayConfig && !isDayClosed && dayConfig.open) ? dayConfig.open : (orgData?.openingTime || '08:00')
              const rawClose = (dayConfig && !isDayClosed && dayConfig.close) ? dayConfig.close : (orgData?.closingTime || '23:00')
              const startHour = parseInt(rawOpen.split(':')[0], 10)
              const closeHour = parseInt(rawClose.split(':')[0], 10)
              
              // If closeHour is before startHour, it means the restaurant closes past midnight (next day)
              const actualCloseHour = closeHour <= startHour ? closeHour + 24 : closeHour
              
              // Add exactly 1-hour buffer at the end of the timeline so the closing time block is rendered cleanly
              const endHour = actualCloseHour + 1
              const totalHours = Math.max(endHour - startHour, 1)
              const totalHalfHours = totalHours * 2
              const totalMinutesSpan = totalHours * 60
              /** Minimum width as % of row so end-of-day blocks stay readable */
              const MIN_BAR_PCT = 14

              // If restaurant is closed on this day, show a message
              if (isDayClosed) {
                return (
                  <div style={{ padding: '32px' }}>
                    <div style={{ border: `1px solid var(--border-secondary)`, borderRadius: '16px', backgroundColor: 'var(--bg-card)', boxShadow: 'var(--shadow-md)', padding: '64px 32px', textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🔒</div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Restaurant Closed</h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                        The restaurant is closed on {selectedDayOfWeek.charAt(0).toUpperCase() + selectedDayOfWeek.slice(1)}s. Select a different day to manage reservations.
                      </p>
                    </div>
                  </div>
                )
              }

              return (
              <div style={{ padding: '32px', width: '100%', boxSizing: 'border-box' as const }}>
                {/* Day hours info bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedDayOfWeek.charAt(0).toUpperCase() + selectedDayOfWeek.slice(1)}</span>
                  <span>•</span>
                  <span>{rawOpen} – {rawClose}</span>
                  <span style={{ marginLeft: '8px', fontSize: '0.72rem', opacity: 0.85 }}>Drag the timeline header to scroll sideways.</span>
                </div>
                <div
                  ref={timelineScrollRef}
                  className="staff-timeline-scroll"
                  style={{
                    border: `1px solid var(--border-secondary)`,
                    borderRadius: '16px',
                    overflowX: 'auto',
                    overflowY: 'auto',
                    maxHeight: 'min(72vh, calc(100vh - 220px))',
                    width: '100%',
                    backgroundColor: 'var(--bg-card)',
                    boxShadow: 'var(--shadow-md)',
                    transition: 'background-color 0.3s',
                  }}
                >
                  
                  {/* Timeline Header */}
                  <div style={{ display: 'flex', backgroundColor: 'var(--calendar-header-bg)', borderBottom: `1px solid var(--border-secondary)`, position: 'sticky', top: 0, zIndex: 30 }}>
                    <div style={{ width: '160px', minWidth: '160px', flexShrink: 0, borderRight: `1px solid var(--border-secondary)`, position: 'sticky', left: 0, backgroundColor: 'var(--calendar-header-bg)', zIndex: 31 }}></div>
                    <div
                      className="staff-timeline-header-drag"
                      onMouseDown={handleTimelineHeaderMouseDown}
                      style={{ flex: 1, display: 'flex', minWidth: `${totalHours * 120}px` }}
                    >
                      {Array.from({ length: totalHours }).map((_, i) => {
                        const hour = startHour + i
                        const actualHour = hour % 24
                        const displayHour = actualHour === 0 ? '12 AM' : actualHour > 12 ? `${actualHour - 12} PM` : actualHour === 12 ? '12 PM' : `${actualHour} AM`
                        return (
                        <div key={i} style={{ flex: 1, position: 'relative', borderRight: `1px solid var(--border-secondary)`, minWidth: '120px' }}>
                          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {displayHour}
                          </div>
                          {/* Half-hour marker at the bottom center of the hour block */}
                          <div style={{ position: 'absolute', bottom: 0, left: '50%', width: '1px', height: '8px', backgroundColor: 'var(--border-secondary)' }} />
                        </div>
                      )})}
                    </div>
                    {/* Right spacer for scroll breathing room */}
                    <div style={{ minWidth: '32px', flexShrink: 0, backgroundColor: 'var(--calendar-header-bg)' }}></div>
                  </div>

                  {/* Grid Rows by Area */}
                  {Object.entries(
                    dbTables.reduce((acc, table) => {
                      const areaName = table.floor_areas?.name || 'Main Area'
                      if (!acc[areaName]) acc[areaName] = []
                      acc[areaName].push(table)
                      return acc
                    }, {} as Record<string, any[]>)
                  ).map(([area, tables], areaIdx, arr) => {
                    const sortedTables = [...(tables as any[])].sort((a, b) => {
                      const aName = String(a.name || a.tableNumber || a.table_number || '')
                      const bName = String(b.name || b.tableNumber || b.table_number || '')
                      return aName.localeCompare(bName, undefined, { numeric: true, sensitivity: 'base' })
                    })
                    return (
                    <div key={area} style={{ display: 'flex', borderBottom: areaIdx === arr.length - 1 ? 'none' : `1px solid var(--border-secondary)` }}>
                      
                      {/* Area Name Column (Vertical) */}
                      <div style={{ width: '60px', minWidth: '60px', borderRight: `1px solid var(--border-secondary)`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--calendar-header-bg)', position: 'sticky', left: 0, zIndex: 20 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                          {area}
                        </span>
                      </div>

                      {/* Tables inside this Area */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {sortedTables.map((table, tIdx) => (
                          <div key={table.id} style={{ display: 'flex', minHeight: '60px', borderBottom: tIdx === (tables as any[]).length - 1 ? 'none' : `1px solid var(--border-secondary)` }}>
                            
                            {/* Table Number & Capacity */}
                            <div style={{ width: '100px', minWidth: '100px', borderRight: `1px solid var(--border-secondary)`, display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between', backgroundColor: 'var(--calendar-header-bg)', position: 'sticky', left: '60px', zIndex: 20 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{table.name || table.tableNumber || '—'}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{table.capacity}</span>
                            </div>

                            {/* Timeline Grid (dynamic half-hour columns) */}
                            <div style={{ flex: 1, display: 'flex', position: 'relative', backgroundColor: 'var(--calendar-row-bg)', minWidth: `${totalHours * 120}px` }}>
                              {Array.from({ length: totalHalfHours }).map((_, colIdx) => (
                                <div
                                  key={colIdx}
                                  onClick={() => {
                                    const totalMins = colIdx * 30
                                    const hour = startHour + Math.floor(totalMins / 60)
                                    const actualHour = hour % 24
                                    const min = totalMins % 60
                                    const slot = `${String(actualHour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
                                    setWizardPreset({
                                      table: {
                                        id: table.id,
                                        name: table.name || null,
                                        tableNumber: table.tableNumber || table.table_number || null,
                                        capacity: table.capacity || null,
                                        areaName: table.floor_areas?.name || table.area?.name || null,
                                      },
                                      date: selectedDate,
                                      time: slot,
                                    })
                                    setShowCreateModal(true)
                                  }}
                                  style={{ flex: 1, borderRight: `1px solid var(--border-primary)`, cursor: 'pointer', minWidth: '60px' }}
                                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  title="Click to create reservation"
                                />
                              ))}

                              {dbReservations.filter(r => r.table?.id === table.id && !['completed', 'cancelled', 'no_show'].includes(r.status)).map((r, rIdx) => {
                                const rStartTime = r.startTime || `${String(startHour % 24).padStart(2, '0')}:00`
                                const rEndTime = r.endTime || ''
                                const [h, m] = rStartTime.split(':').map(Number)
                                const actualH = h < startHour ? h + 24 : h
                                const totalMins = (actualH - startHour) * 60 + m
                                const startPos = Math.max(0, (totalMins / totalMinutesSpan) * 100)
                                
                                // Calculate width based on actual duration if endTime available
                                let durationMins = 90 // default
                                if (rEndTime) {
                                  let [eh, em] = rEndTime.split(':').map(Number)
                                  if (eh < actualH || (eh === actualH && em < m)) eh += 24
                                  durationMins = (eh * 60 + em) - (actualH * 60 + m)
                                }
                                const width = (durationMins / totalMinutesSpan) * 100
                                
                                // Colors strictly from the UI design reference
                                const isSeated = r.status === 'seated'
                                const isConfirmed = r.status === 'confirmed'
                                const bgColor = isSeated ? '#2F5233' : (isConfirmed ? '#8C6B45' : (isDark ? '#1A2A2E' : '#111827'))

                                return (
                                  <div 
                                    key={r.id}
                                    onClick={() => setSelectedBooking(r)}
                                    style={{ 
                                      position: 'absolute', 
                                      left: `${startPos}%`,
                                      width: `${width}%`, 
                                      minWidth: '44px',
                                      top: `${14 + (rIdx * 36)}px`, 
                                      height: '32px',
                                      backgroundColor: bgColor,
                                      borderRadius: '10px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      cursor: 'pointer',
                                      color: '#ffffff',
                                      overflow: 'hidden',
                                      zIndex: 10 + rIdx,
                                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                                      transition: 'all 0.2s ease',
                                      padding: '0 6px'
                                    }}>
                                    <div style={{ 
                                      width: '24px', 
                                      height: '24px', 
                                      backgroundColor: 'rgba(0,0,0,0.2)', 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 800,
                                      borderRadius: '6px',
                                      flexShrink: 0,
                                      marginRight: '8px'
                                    }}>
                                      {r.partySize}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                      {guestDisplayName(r)}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {/* Right spacer for scroll breathing room */}
                            <div style={{ minWidth: '32px', flexShrink: 0, backgroundColor: 'var(--calendar-row-bg)' }}></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )})}

                  {/* Unassigned / Drag Drop Catcher */}
                  {dbReservations.filter(r => (!r.table?.id || !dbTables.some(t => t.id === r.table?.id)) && !['completed', 'cancelled', 'no_show'].includes(r.status)).length > 0 && (
                    <div style={{ display: 'flex', borderTop: `2px dashed var(--border-secondary)`, backgroundColor: 'var(--bg-tertiary)' }}>
                       <div style={{ width: '160px', minWidth: '160px', borderRight: `1px solid var(--border-secondary)`, display: 'flex', alignItems: 'center', padding: '0 16px', position: 'sticky', left: 0, backgroundColor: 'var(--bg-tertiary)', zIndex: 20 }}>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Unassigned</span>
                       </div>
                       <div style={{ flex: 1, display: 'flex', position: 'relative', minHeight: '60px', minWidth: `${totalHours * 120}px` }}>
                          {Array.from({ length: totalHalfHours }).map((_, colIdx) => (
                            <div key={colIdx} style={{ flex: 1, borderRight: `1px solid var(--border-primary)`, minWidth: '60px' }} />
                          ))}
                          {dbReservations.filter(r => (!r.table?.id || !dbTables.some(t => t.id === r.table?.id)) && !['completed', 'cancelled', 'no_show'].includes(r.status)).map((r, rIdx) => {
                             const rStartTime = r.startTime || `${String(startHour % 24).padStart(2, '0')}:00`
                             const rEndTime = r.endTime || ''
                             const [h, m] = rStartTime.split(':').map(Number)
                             const actualH = h < startHour ? h + 24 : h
                             const totalMins = (actualH - startHour) * 60 + m
                             const startPos = Math.max(0, (totalMins / totalMinutesSpan) * 100)
                             
                             let durationMins = 90
                             if (rEndTime) {
                               let [eh, em] = rEndTime.split(':').map(Number)
                               if (eh < actualH || (eh === actualH && em < m)) eh += 24
                               durationMins = (eh * 60 + em) - (actualH * 60 + m)
                             }
                             const width = (durationMins / totalMinutesSpan) * 100
                             
                             return (
                                <div 
                                  key={r.id}
                                  onClick={() => setSelectedBooking(r)}
                                  style={{ 
                                    position: 'absolute', 
                                    left: `${startPos}%`, 
                                    width: `${width}%`, 
                                    minWidth: '44px',
                                    top: `${14 + (rIdx * 36)}px`, 
                                    height: '32px',
                                    backgroundColor: 'var(--bg-card)', 
                                    border: `1px solid var(--border-secondary)`, 
                                    color: 'var(--text-primary)',
                                    borderRadius: '10px', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    cursor: 'pointer', 
                                    overflow: 'hidden', 
                                    zIndex: 10 + rIdx,
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                    padding: '0 6px'
                                  }}>
                                  <div style={{ 
                                    width: '24px', 
                                    height: '24px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    backgroundColor: 'var(--bg-tertiary)', 
                                    fontSize: '0.75rem', 
                                    fontWeight: 800,
                                    borderRadius: '6px',
                                    flexShrink: 0,
                                    marginRight: '8px',
                                    border: `1px solid var(--border-primary)`
                                  }}>
                                    {r.partySize}
                                  </div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                    {guestDisplayName(r)}
                                  </div>
                                </div>
                             )
                          })}
                       </div>
                       {/* Right spacer for scroll breathing room */}
                       <div style={{ minWidth: '32px', flexShrink: 0, backgroundColor: 'var(--bg-tertiary)' }}></div>
                    </div>
                  )}
                </div>
              </div>
              )
              })()}
            
            {activeTab === 'Calendar View' && (
              <div style={{ padding: '32px' }}>
                <div style={{ 
                  backgroundColor: 'var(--bg-card)', 
                  borderRadius: '24px', 
                  padding: '32px',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-primary)'
                }}>
                  {/* Calendar Header Nav */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {calendarMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                        style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      ><ChevronLeft size={20} /></button>
                      <button 
                        onClick={() => { setCalendarMonth(new Date()); setSelectedDate(getLocalISODate()); }}
                        style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer' }}
                      >Today</button>
                      <button 
                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                        style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-secondary)', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      ><ChevronRight size={20} /></button>
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem', paddingBottom: '12px' }}>
                        {day}
                      </div>
                    ))}
                    
                    {(() => {
                      const year = calendarMonth.getFullYear();
                      const month = calendarMonth.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      
                      const cells = [];
                      for (let i = 0; i < firstDay; i++) {
                        cells.push(<div key={`empty-${i}`} style={{ opacity: 0.3 }} />);
                      }
                      
                      for (let d = 1; d <= daysInMonth; d++) {
                        const dateStr = new Date(year, month, d).toLocaleDateString('en-CA'); // YYYY-MM-DD local format
                        const isSelected = selectedDate === dateStr;
                        const isToday = new Date().toLocaleDateString('en-CA') === dateStr;
                        
                        cells.push(
                          <div 
                            key={d} 
                            onClick={() => {
                              setSelectedDate(dateStr);
                              setActiveTab('Day View');
                            }}
                            style={{ 
                              aspectRatio: '1', 
                              backgroundColor: isSelected ? (isDark ? '#C99C63' : '#C99C63') : 'var(--bg-tertiary)',
                              border: `1px solid ${isSelected ? 'transparent' : 'var(--border-secondary)'}`,
                              borderRadius: '16px',
                              display: 'flex',
                              flexDirection: 'column',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.2s',
                              overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) e.currentTarget.style.borderColor = isDark ? '#C99C63' : '#C99C63';
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) e.currentTarget.style.borderColor = 'var(--border-secondary)';
                            }}
                          >
                            <span style={{ 
                              position: 'absolute', 
                              top: '8px', 
                              left: '12px', 
                              fontSize: '1.1rem', 
                              fontWeight: 700,
                              color: isSelected ? '#ffffff' : (isToday ? (isDark ? '#C99C63' : '#C99C63') : 'var(--text-primary)')
                            }}>
                              {d}
                            </span>
                            {/* Reservation count badge */}
                            {monthlyResCounts[dateStr] && (
                              <div style={{
                                position: 'absolute',
                                bottom: '8px',
                                left: '12px',
                                right: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}>
                                <div style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: isSelected ? '#ffffff' : '#C99C63',
                                  flexShrink: 0,
                                }} />
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  color: isSelected ? 'rgba(255,255,255,0.85)' : 'var(--text-secondary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}>
                                  {monthlyResCounts[dateStr]} res
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reservation Detail Modal */}
      {(selectedBooking || selectedTable) && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'var(--modal-backdrop)' }}>
          <div style={{ backgroundColor: 'var(--bg-modal)', borderRadius: '32px', width: '100%', maxWidth: '440px', padding: '40px', position: 'relative', boxShadow: 'var(--shadow-lg)', border: `1px solid var(--border-primary)` }}>
            <button
              onClick={() => { setSelectedBooking(null); setSelectedTable(null); setEditingBooking(false); setEditFields(null); }}
              style={{ position: 'absolute', top: '32px', right: '32px', background: 'var(--bg-tertiary)', border: 'none', cursor: 'pointer', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{selectedTable ? `Table ${selectedTable.name || selectedTable.tableNumber}` : `Reservation`}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '24px' }}>
              {selectedTable ? `${selectedTable.capacity} Seats • Schedule for ${selectedDate}` : `${selectedBooking.partySize} Guests • ${selectedBooking.status.toUpperCase()}`}
            </p>

            {selectedTable && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', maxHeight: '400px', overflowY: 'auto' }}>
                {(() => {
                  const tableReservations = dbReservations.filter(r => r.table?.id === selectedTable.id && !['cancelled', 'no_show', 'completed'].includes(r.status)).sort((a,b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'))
                  
                  if (tableReservations.length === 0) {
                    return (
                      <div style={{ padding: '24px', textAlign: 'center', backgroundColor: 'var(--bg-tertiary)', borderRadius: '16px', color: 'var(--text-secondary)' }}>
                        No reservations for this table today.
                      </div>
                    )
                  }

                  return tableReservations.map(res => (
                    <div key={res.id} style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '16px', padding: '20px', border: `1px solid var(--border-primary)` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{guestDisplayName(res)}</span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#C99C63', fontWeight: 800 }}>
                            {res.startTime?.slice(0, 5)}{res.endTime && ` – ${res.endTime.slice(0, 5)}`}
                          </div>
                          {res.startTime && res.endTime && formatDuration(res.startTime, res.endTime) && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                              {formatDuration(res.startTime, res.endTime)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{res.partySize} Guests</p>
                        <span style={{ fontSize: '0.625rem', fontWeight: 800, color: getStatusStyle(res.status).color, backgroundColor: getStatusStyle(res.status).bg, padding: '2px 8px', borderRadius: '100px', textTransform: 'uppercase' }}>{res.status}</span>
                      </div>
                      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Update status</label>
                        <select
                          key={`${res.id}-${res.status}`}
                          defaultValue=""
                          onChange={async (e) => {
                            const v = e.target.value
                            e.target.selectedIndex = 0
                            if (!v) return
                            if (v === '__clear_seat') await handleClearSeatKeepBooking(res.id)
                            else await handleStatusUpdate(res.id, v)
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-primary)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          <option value="" disabled>Choose an action…</option>
                          {['pending', 'confirmed'].includes(res.status) && (
                            <>
                              <option value="arriving">Mark arriving</option>
                              <option value="no_show">No-show</option>
                            </>
                          )}
                          {res.status === 'arriving' && (
                            <>
                              <option value="seated">Seat guests</option>
                              <option value="__clear_seat">Clear seat (unassign table)</option>
                              <option value="no_show">No-show</option>
                            </>
                          )}
                          {res.status === 'seated' && (
                            <>
                              <option value="" disabled>Current: seated</option>
                              <option value="completed">Clear table — mark complete</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            )}

            {selectedBooking && (!selectedTable || selectedTable.id !== (selectedBooking.table?.id || selectedBooking.tableId)) && (
              editingBooking && editFields ? (
                /* ── Edit Mode ─────────────────────────────────────────────── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {/* Guest info row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>First Name</label>
                        <input
                          value={editFields.guestFirstName}
                          onChange={e => setEditFields({ ...editFields, guestFirstName: e.target.value })}
                          placeholder="Guest"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last Name</label>
                        <input
                          value={editFields.guestLastName}
                          onChange={e => setEditFields({ ...editFields, guestLastName: e.target.value })}
                          placeholder=""
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone</label>
                      <input
                        type="tel"
                        value={editFields.guestPhone}
                        onChange={e => setEditFields({ ...editFields, guestPhone: e.target.value })}
                        placeholder="+44..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email</label>
                      <input
                        type="email"
                        value={editFields.guestEmail}
                        onChange={e => setEditFields({ ...editFields, guestEmail: e.target.value })}
                        placeholder="guest@example.com"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</label>
                      <input
                        type="date"
                        value={editFields.reservationDate}
                        onChange={e => setEditFields({ ...editFields, reservationDate: e.target.value })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                      />
                    </div>

                    {/* Start Time / End Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Start Time</label>
                        <input
                          type="time"
                          value={editFields.startTime}
                          onChange={e => setEditFields({ ...editFields, startTime: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>End Time</label>
                        <input
                          type="time"
                          value={editFields.endTime}
                          onChange={e => setEditFields({ ...editFields, endTime: e.target.value })}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Party Size</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={editFields.partySize}
                        onChange={e => setEditFields({ ...editFields, partySize: parseInt(e.target.value) || 1 })}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Special Requests</label>
                      <textarea
                        value={editFields.specialRequests}
                        onChange={e => setEditFields({ ...editFields, specialRequests: e.target.value })}
                        rows={2}
                        placeholder="Allergies, seating preferences..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none', resize: 'vertical' as const }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Internal Notes (staff only)</label>
                      <textarea
                        value={editFields.internalNotes}
                        onChange={e => setEditFields({ ...editFields, internalNotes: e.target.value })}
                        rows={2}
                        placeholder="Notes not visible to the guest..."
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' as const, outline: 'none', resize: 'vertical' as const }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => { setEditingBooking(false); setEditFields(null) }}
                      disabled={savingEdit}
                      style={{ flex: 1, padding: '13px', borderRadius: '14px', backgroundColor: 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={savingEdit}
                      style={{ flex: 2, padding: '13px', borderRadius: '14px', backgroundColor: '#C99C63', color: '#ffffff', border: 'none', fontWeight: 700, cursor: savingEdit ? 'wait' : 'pointer', fontSize: '0.875rem', opacity: savingEdit ? 0.7 : 1 }}
                    >
                      {savingEdit ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Read Mode ─────────────────────────────────────────────── */
                <div style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: '24px', padding: '24px', marginBottom: '32px', border: `1px solid var(--border-primary)`, boxSizing: 'border-box' as const, maxWidth: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{guestDisplayName(selectedBooking)}</span>
                      <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {selectedBooking.partySize} Guests • {selectedBooking.table?.name || selectedBooking.table?.tableNumber ? `Table ${selectedBooking.table.name || selectedBooking.table.tableNumber}` : 'Unassigned'}
                      </p>
                      {selectedBooking.guestPhone && (
                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{selectedBooking.guestPhone}</p>
                      )}
                      {selectedBooking.guestEmail && (
                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{selectedBooking.guestEmail}</p>
                      )}
                      {selectedBooking.specialRequests && (
                        <p style={{ margin: '6px 0 0 0', color: 'var(--text-tertiary)', fontSize: '0.8rem', fontStyle: 'italic' }}>"{selectedBooking.specialRequests}"</p>
                      )}
                      {selectedBooking.internalNotes && (
                        <p style={{ margin: '4px 0 0 0', color: '#C99C63', fontSize: '0.8rem' }}>Note: {selectedBooking.internalNotes}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ color: '#C99C63', fontWeight: 800 }}>
                        {selectedBooking.startTime?.slice(0, 5)}
                        {selectedBooking.endTime && ` – ${selectedBooking.endTime.slice(0, 5)}`}
                      </span>
                      {selectedBooking.startTime && selectedBooking.endTime && formatDuration(selectedBooking.startTime, selectedBooking.endTime) && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                          {formatDuration(selectedBooking.startTime, selectedBooking.endTime)}
                        </span>
                      )}
                      {!['completed', 'cancelled', 'no_show'].includes(selectedBooking.status) && (
                        <button
                          onClick={() => {
                            setEditingBooking(true)
                            setEditFields({
                              guestFirstName: selectedBooking.guestFirstName || '',
                              guestLastName: selectedBooking.guestLastName || '',
                              guestEmail: selectedBooking.guestEmail || '',
                              guestPhone: selectedBooking.guestPhone || '',
                              reservationDate: selectedBooking.reservationDate || selectedBooking.date || selectedDate,
                              startTime: selectedBooking.startTime?.slice(0, 5) || '',
                              endTime: selectedBooking.endTime?.slice(0, 5) || '',
                              partySize: selectedBooking.partySize || 2,
                              specialRequests: selectedBooking.specialRequests || '',
                              internalNotes: selectedBooking.internalNotes || '',
                            })
                          }}
                          style={{ padding: '6px 14px', borderRadius: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Table Re-assignment — hide for finished / cancelled bookings */}
                  {!['completed', 'cancelled', 'no_show'].includes(selectedBooking.status) && (
                  <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-secondary)', maxWidth: '100%', boxSizing: 'border-box' as const }}>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                      Assign to Table
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', minWidth: 0 }}>
                      <select
                        id="reassign-table-select"
                        defaultValue={selectedBooking.table?.id || selectedBooking.tableId || ""}
                        style={{
                          width: '100%',
                          minWidth: 0,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-primary)',
                          color: 'var(--text-primary)',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box' as const,
                        }}
                      >
                        <option value="" disabled>Select a table...</option>
                        {dbTables
                          .filter((t: any) => t.capacity >= (selectedBooking.partySize || 1))
                          .map((t: any) => (
                            <option key={t.id} value={t.id}>
                              {t.name || `Table #${t.tableNumber}`} (capacity: {t.capacity})
                            </option>
                          ))
                        }
                      </select>
                      <button
                        onClick={async () => {
                          const selectEl = document.getElementById('reassign-table-select') as HTMLSelectElement
                          const tableId = selectEl?.value
                          if (!tableId || !restaurantId) return
                          try {
                            await api.put(`/organizations/${restaurantId}/reservations/${selectedBooking.id}`, { tableId })
                            toast.success('Reservation assigned to table')
                            fetchData(selectedDate, restaurantId)
                            setSelectedBooking(null)
                          } catch (err: any) {
                            toast.error(err?.response?.data?.message || 'Failed to assign table')
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          backgroundColor: '#C99C63',
                          color: '#ffffff',
                          border: 'none',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          boxSizing: 'border-box' as const,
                        }}
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                  )}

                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                     {['pending', 'confirmed'].includes(selectedBooking.status) && (
                       <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                         <button onClick={() => handleStatusUpdate(selectedBooking.id, 'arriving')} style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', backgroundColor: isDark ? '#5EEA7A' : '#111827', color: isDark ? '#0B1517' : '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Mark Arriving</button>
                         <button onClick={() => handleStatusUpdate(selectedBooking.id, 'no_show')} style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', backgroundColor: 'transparent', color: '#E05D5D', border: '1px solid #E05D5D', fontWeight: 600, cursor: 'pointer' }}>No-Show</button>
                       </div>
                     )}
                     {selectedBooking.status === 'arriving' && (
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                           <button onClick={() => handleStatusUpdate(selectedBooking.id, 'seated')} style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', backgroundColor: '#6B9E78', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Seat Guests</button>
                           <button onClick={() => handleStatusUpdate(selectedBooking.id, 'no_show')} style={{ flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', backgroundColor: 'transparent', color: '#E05D5D', border: '1px solid #E05D5D', fontWeight: 600, cursor: 'pointer' }}>No-Show</button>
                         </div>
                         <button
                           type="button"
                           onClick={() => handleClearSeatKeepBooking(selectedBooking.id)}
                           style={{ width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: 'transparent', color: '#C99C63', border: '1px solid rgba(201,156,99,0.45)', fontWeight: 600, cursor: 'pointer' }}
                         >
                           Clear seat — free table (keep booking as confirmed)
                         </button>
                       </div>
                     )}
                     {selectedBooking.status === 'seated' && (
                       <button onClick={() => handleStatusUpdate(selectedBooking.id, 'completed')} style={{ width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: isDark ? '#5EEA7A' : '#111827', color: isDark ? '#0B1517' : '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                         Clear Table — Mark Complete
                       </button>
                     )}
                  </div>
                </div>
              )
            )}

            {selectedTable && selectedTable.isMerged && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ padding: '14px 16px', backgroundColor: isDark ? 'rgba(56,189,248,0.08)' : 'rgba(56,189,248,0.05)', borderRadius: '12px', border: '1px solid rgba(56,189,248,0.22)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link2 size={15} color="#38bdf8" style={{ flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>This is a temporary merged table. Restore the individual tables once the party leaves.</p>
                </div>
                <button
                  onClick={() => handleUnmerge(selectedTable.id)}
                  style={{ width: '100%', padding: '13px', borderRadius: '14px', backgroundColor: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.28)', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}
                >
                  <Unlink size={16} />
                  Unmerge &amp; Restore Tables
                </button>
              </div>
            )}
            {selectedTable && (
              <button
                onClick={() => {
                  setWizardPreset({
                    table: {
                      id: selectedTable.id,
                      name: selectedTable.name || null,
                      tableNumber: selectedTable.tableNumber || selectedTable.table_number || null,
                      capacity: selectedTable.capacity || null,
                      areaName: selectedTable.floor_areas?.name || selectedTable.area?.name || null,
                    },
                    date: selectedDate,
                  })
                  setShowCreateModal(true)
                }}
                style={{ width: '100%', padding: '16px', borderRadius: '16px', backgroundColor: isDark ? '#5EEA7A' : '#111827', color: isDark ? '#0B1517' : '#ffffff', border: 'none', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                New Reservation for Table
              </button>
            )}
          </div>
        </div>
      )}
      {/* Merge Confirmation Modal */}
      {showMergeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: isDark ? '#101A1C' : '#ffffff', border: `1px solid ${isDark ? '#2a3a3e' : '#e5e7eb'}`, borderRadius: '20px', padding: '36px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 48px rgba(0,0,0,0.4)' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: 'rgba(201,156,99,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Link2 size={22} color="#C99C63" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>Merge {selectedTableIds.size} Tables</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Create a temporary combined table for a large party</p>
              </div>
            </div>
            {/* Table chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              {dbTables.filter(t => selectedTableIds.has(t.id)).map(t => (
                <span key={t.id} style={{ padding: '6px 14px', borderRadius: '100px', backgroundColor: isDark ? '#1a2d3a' : '#f0f9ff', border: '1px solid rgba(56,189,248,0.3)', color: '#38bdf8', fontSize: '0.8rem', fontWeight: 600 }}>
                  {t.name || `T-${t.tableNumber}`}
                </span>
              ))}
            </div>
            {/* Capacity badge */}
            <div style={{ padding: '13px 16px', backgroundColor: isDark ? 'rgba(107,158,120,0.1)' : 'rgba(107,158,120,0.06)', borderRadius: '12px', border: '1px solid rgba(107,158,120,0.2)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={16} color="#6B9E78" />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#d1fae5' : '#065f46' }}>
                Combined capacity: {dbTables.filter(t => selectedTableIds.has(t.id)).reduce((s, t) => s + (t.capacity || 0), 0)} guests
              </span>
            </div>
            {/* Name input */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: isDark ? '#d1d5db' : '#374151', marginBottom: '8px' }}>Label for merged table</label>
              <input
                type="text"
                value={mergedTableName}
                onChange={(e) => setMergedTableName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && selectedTableIds.size >= 2) handleConfirmMerge() }}
                placeholder="e.g. Large Party Table"
                autoFocus
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`, backgroundColor: isDark ? '#161B22' : '#f9fafb', color: isDark ? '#ffffff' : '#111827', fontSize: '0.875rem', boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
            {/* Warning */}
            <div style={{ padding: '12px 14px', backgroundColor: isDark ? 'rgba(251,191,36,0.07)' : 'rgba(251,191,36,0.06)', borderRadius: '10px', border: '1px solid rgba(251,191,36,0.2)', marginBottom: '24px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
              <p style={{ margin: 0, fontSize: '0.8rem', color: isDark ? 'rgba(251,191,36,0.85)' : '#92400e', lineHeight: 1.5 }}>
                {selectedDate > getLocalISODate() ? (
                  <>This merge takes effect on <strong>{selectedDate}</strong>. Until then, each table stays available on its own. On that date the floor shows one combined table until you Unmerge.</>
                ) : (
                  <>The separate tables are combined for <strong>today</strong>. Use Unmerge when the party is finished to restore them for normal service.</>
                )}
              </p>
            </div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setShowMergeModal(false); setMergedTableName('') }} disabled={isMerging} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: 'transparent', border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`, color: isDark ? '#e6edf3' : '#374151', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleConfirmMerge} disabled={isMerging} style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: isMerging ? '#9ca3af' : '#C99C63', color: '#0B1517', border: 'none', fontWeight: 700, cursor: isMerging ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isMerging ? 'Merging...' : (<><Link2 size={16} /> Confirm Merge</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Walk-in Modal */}
      {showWalkInModal && restaurantId && (
        <WalkInModal
          restaurantId={restaurantId}
          isDark={isDark}
          onClose={() => setShowWalkInModal(false)}
          onSuccess={() => fetchData(selectedDate, restaurantId)}
        />
      )}

      {/* Analytics Report Modal */}
      {showAnalyticsModal && restaurantId && (
        <AnalyticsReportModal
          restaurantId={restaurantId}
          restaurantName={orgData?.name || 'Restaurant'}
          onClose={() => setShowAnalyticsModal(false)}
          isDark={isDark}
        />
      )}

      {/* POS Create Modal */}
      {showCreateModal && restaurantId && (
        <StaffReservationWizard
          restaurantId={restaurantId}
          preselectedTable={wizardPreset?.table}
          initialDate={selectedDate}
          initialTime={wizardPreset?.time}
          weeklyHours={orgData?.weeklyHours}
          onClose={() => { setShowCreateModal(false); setWizardPreset(null) }}
          onSuccess={() => {
            setShowCreateModal(false)
            setWizardPreset(null)
            fetchData(selectedDate, restaurantId)
          }}
        />
      )}

      {/* CSV Import Modal */}
      {showImportModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }}>
          <div style={{
            backgroundColor: isDark ? '#101A1C' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '16px',
            padding: '32px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: isDark ? '#ffffff' : '#111827' }}>
                Import Reservations
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                style={{ background: 'none', border: 'none', color: isDark ? '#8b949e' : '#6b7280', cursor: 'pointer', fontSize: '1.25rem', padding: '4px' }}
              >✕</button>
            </div>

            {/* Template Download + Guide */}
            <div style={{
              padding: '16px',
              backgroundColor: isDark ? 'rgba(201,156,99,0.08)' : 'rgba(201,156,99,0.05)',
              border: `1px solid ${isDark ? 'rgba(201,156,99,0.2)' : 'rgba(201,156,99,0.15)'}`,
              borderRadius: '12px',
              marginBottom: '20px',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#C99C63', marginBottom: '8px' }}>CSV Template Guide</div>
              <p style={{ fontSize: '0.8rem', color: isDark ? '#d1d5db' : '#4b5563', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                Your CSV should have headers in the first row. Required columns: <strong>Date</strong>, <strong>Time</strong>, <strong>First Name</strong>. 
                Optional: Last Name, Email, Phone, Party Size, Table, Special Requests, Source.
              </p>
              <div style={{ fontSize: '0.75rem', color: isDark ? '#8b949e' : '#6b7280', marginBottom: '12px' }}>
                • Date format: YYYY-MM-DD or DD/MM/YYYY<br/>
                • Time format: HH:MM (24-hour)<br/>
                • Table: matches by table name or number
              </div>
              <button
                onClick={() => {
                  const headers = 'Date,Time,Party Size,First Name,Last Name,Email,Phone,Table,Special Requests,Source'
                  const row1 = `${new Date(Date.now() + 86400000).toISOString().split('T')[0]},19:00,4,John,Smith,john@example.com,07700900000,Table 1,Window seat preferred,phone`
                  const row2 = `${new Date(Date.now() + 172800000).toISOString().split('T')[0]},20:30,2,Jane,Doe,jane@example.com,,Table 2,Birthday celebration,website`
                  const csv = [headers, row1, row2].join('\n')
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'reservation-import-template.csv'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#C99C63',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={14} />
                Download Template
              </button>
            </div>

            {/* File Upload Area */}
            {!importResult && (
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#C99C63' }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db' }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db'
                  const file = e.dataTransfer.files[0]
                  if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
                    setImportFile(file)
                  } else {
                    toast.error('Please upload a .csv file')
                  }
                }}
                style={{
                  border: `2px dashed ${isDark ? '#30363d' : '#d1d5db'}`,
                  borderRadius: '12px',
                  padding: '32px',
                  textAlign: 'center',
                  marginBottom: '20px',
                  transition: 'border-color 0.2s',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.csv'
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) setImportFile(file)
                  }
                  input.click()
                }}
              >
                {importFile ? (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</div>
                    <div style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#1f2937', fontSize: '0.9rem' }}>{importFile.name}</div>
                    <div style={{ fontSize: '0.8rem', color: isDark ? '#8b949e' : '#6b7280', marginTop: '4px' }}>
                      {(importFile.size / 1024).toFixed(1)} KB — Click to change
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📥</div>
                    <div style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#1f2937', fontSize: '0.9rem' }}>
                      Drop your CSV file here
                    </div>
                    <div style={{ fontSize: '0.8rem', color: isDark ? '#8b949e' : '#6b7280', marginTop: '4px' }}>
                      or click to browse
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  backgroundColor: importResult.failed === 0
                    ? (isDark ? 'rgba(107,158,120,0.1)' : 'rgba(107,158,120,0.05)')
                    : (isDark ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.05)'),
                  border: `1px solid ${importResult.failed === 0 ? 'rgba(107,158,120,0.3)' : 'rgba(234,179,8,0.3)'}`,
                  marginBottom: '16px',
                }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: isDark ? '#ffffff' : '#1f2937', marginBottom: '8px' }}>
                    {importResult.failed === 0 ? '✅ Import Complete' : '⚠️ Import Completed with Errors'}
                  </div>
                  <div style={{ display: 'flex', gap: '24px', fontSize: '0.875rem' }}>
                    <div><span style={{ color: '#6B9E78', fontWeight: 700 }}>{importResult.imported}</span> <span style={{ color: isDark ? '#8b949e' : '#6b7280' }}>imported</span></div>
                    {importResult.failed > 0 && (
                      <div><span style={{ color: '#ef4444', fontWeight: 700 }}>{importResult.failed}</span> <span style={{ color: isDark ? '#8b949e' : '#6b7280' }}>failed</span></div>
                    )}
                    <div><span style={{ color: isDark ? '#d1d5db' : '#374151', fontWeight: 600 }}>{importResult.total}</span> <span style={{ color: isDark ? '#8b949e' : '#6b7280' }}>total rows</span></div>
                  </div>
                </div>

                {/* Error Details */}
                {importResult.errors.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#d1d5db' : '#374151', marginBottom: '8px' }}>Error Details</div>
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    }}>
                      <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: isDark ? '#161B22' : '#f9fafb' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}` }}>Row</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: isDark ? '#8b949e' : '#6b7280', borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}` }}>Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.errors.map((err, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}` }}>
                              <td style={{ padding: '8px 12px', color: isDark ? '#d1d5db' : '#374151', fontWeight: 600 }}>{err.row}</td>
                              <td style={{ padding: '8px 12px', color: '#ef4444' }}>{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowImportModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                  color: isDark ? '#e6edf3' : '#374151',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
              {!importResult && (
                <button
                  onClick={async () => {
                    if (!importFile || !restaurantId) return
                    setImporting(true)
                    try {
                      const formData = new FormData()
                      formData.append('file', importFile)
                      const { data: res } = await api.post(
                        `/organizations/${restaurantId}/reservations/import`,
                        formData,
                        { headers: { 'Content-Type': 'multipart/form-data' } }
                      )
                      setImportResult(res.data)
                      if (res.data?.imported > 0) {
                        toast.success(`${res.data.imported} reservation(s) imported!`)
                        fetchData(selectedDate, restaurantId)
                      }
                    } catch (err: any) {
                      const msg = err.response?.data?.error || 'Import failed'
                      toast.error(msg)
                    } finally {
                      setImporting(false)
                    }
                  }}
                  disabled={!importFile || importing}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: (!importFile || importing) ? '#9ca3af' : '#C99C63',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: (!importFile || importing) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {importing ? 'Importing...' : 'Import Reservations'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <PoweredByFooter theme={isDark ? 'dark' : 'light'} />
      
      {/* Create Area Modal */}
      {showCreateAreaModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: isDark ? '#111827' : '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '24px', borderBottom: `1px solid var(--border-primary)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Create New Area</h2>
              <button onClick={() => { setShowCreateAreaModal(false); setNewAreaName(''); }} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Area Name
              </label>
              <input
                type="text"
                value={newAreaName}
                onChange={e => setNewAreaName(e.target.value)}
                placeholder="e.g. Floor 1 - Patio"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: `1px solid var(--border-primary)`,
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem',
                  outline: 'none'
                }}
              />
              <p style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Tip: Use "Floor - Area" (e.g. "Main - Bar") to automatically group them.
              </p>
            </div>
            <div style={{ padding: '16px 24px', backgroundColor: 'var(--bg-tertiary)', borderTop: `1px solid var(--border-primary)`, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => { setShowCreateAreaModal(false); setNewAreaName(''); }}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateArea}
                disabled={isCreatingArea || !newAreaName.trim()}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#C99C63', color: '#fff', fontWeight: 600, cursor: isCreatingArea || !newAreaName.trim() ? 'not-allowed' : 'pointer', opacity: isCreatingArea || !newAreaName.trim() ? 0.7 : 1 }}
              >
                {isCreatingArea ? 'Creating...' : 'Create Area'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Table Modal */}
      {showCreateTableModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: isDark ? '#111827' : '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: '24px', borderBottom: `1px solid var(--border-primary)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add New Table</h2>
              <button onClick={() => { setShowCreateTableModal(false); setNewTableData({ name: '', capacity: 2, minCapacity: 1, areaId: '' }); }} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Table Name or Number
                </label>
                <input
                  type="text"
                  value={newTableData.name}
                  onChange={e => setNewTableData(prev => ({...prev, name: e.target.value}))}
                  placeholder="e.g. T-12 or VIP-1"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: `1px solid var(--border-primary)`,
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTableData.capacity}
                    onChange={e => setNewTableData(prev => ({...prev, capacity: parseInt(e.target.value) || 2}))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: `1px solid var(--border-primary)`,
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Min Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newTableData.minCapacity}
                    onChange={e => setNewTableData(prev => ({...prev, minCapacity: parseInt(e.target.value) || 1}))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: `1px solid var(--border-primary)`,
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ padding: '16px 24px', backgroundColor: 'var(--bg-tertiary)', borderTop: `1px solid var(--border-primary)`, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => { setShowCreateTableModal(false); setNewTableData({ name: '', capacity: 2, minCapacity: 1, areaId: '' }); }}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTable}
                disabled={isCreatingTable || !newTableData.name.trim()}
                style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', backgroundColor: '#C99C63', color: '#fff', fontWeight: 600, cursor: isCreatingTable || !newTableData.name.trim() ? 'not-allowed' : 'pointer', opacity: isCreatingTable || !newTableData.name.trim() ? 0.7 : 1 }}
              >
                {isCreatingTable ? 'Creating...' : 'Create Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
