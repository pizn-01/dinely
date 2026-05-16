const fs = require('fs');
let f = fs.readFileSync('src/pages/staff/StaffTableManagement.tsx', 'utf8');

// Phase 1 & 2: States
if (!f.includes('const [clearingTableId, setClearingTableId]')) {
  f = f.replace(
    '  // ── Reservation Edit State ─────────────────────────────────────────────────',
    '  // ── Clear Table Loading State ───────────────────────────────────────────────\n  const [clearingTableId, setClearingTableId] = useState<string | null>(null)\n\n  // ── Reservation Edit State ─────────────────────────────────────────────────'
  );
}

if (!f.includes('const [showNoShows, setShowNoShows]')) {
  f = f.replace(
    '  // ── Reservation Edit State ─────────────────────────────────────────────────\n  const [editingBooking, setEditingBooking] = useState(false)',
    '  // ── Reservation Edit State ─────────────────────────────────────────────────\n  const [showNoShows, setShowNoShows] = useState(false)\n  const [editingBooking, setEditingBooking] = useState(false)'
  );
}

// Phase 1: handleClearTable
if (!f.includes('const handleClearTable = async')) {
  f = f.replace(
    '  const guestDisplayName = (r: { guestFirstName?: string; guestLastName?: string }) => {',
    `  /** Clear a table: optimistic UI update, then call API to mark seated reservation as completed. */
  const handleClearTable = async (reservationId: string, tableId?: string) => {
    if (!restaurantId) return
    const previousReservations = [...dbReservations]

    // Optimistic: immediately mark as completed in local state
    setDbReservations(prev => prev.map(r =>
      r.id === reservationId ? { ...r, status: 'completed' } : r
    ))
    setClearingTableId(tableId || reservationId)

    try {
      // Try dedicated clear endpoint first, fall back to generic status update
      if (tableId) {
        await api.patch(\`/organizations/\${restaurantId}/tables/\${tableId}/clear\`)
      } else {
        await api.patch(\`/organizations/\${restaurantId}/reservations/\${reservationId}/status\`, { status: 'completed' })
      }
      toast.success('Table cleared — reservation marked complete ✓')
      setSelectedBooking(null)
      setSelectedTable(null)
      if (restaurantId) fetchData(selectedDate, restaurantId)
    } catch (error: any) {
      // Rollback optimistic update
      setDbReservations(previousReservations)
      console.error('Failed to clear table:', error)
      toast.error(error.response?.data?.error || 'Failed to clear table. Please try again.')
    } finally {
      setClearingTableId(null)
    }
  }

  const guestDisplayName = (r: { guestFirstName?: string; guestLastName?: string }) => {`
  );
}

fs.writeFileSync('src/pages/staff/StaffTableManagement.tsx', f, 'utf8');
console.log('Script ran successfully.');
