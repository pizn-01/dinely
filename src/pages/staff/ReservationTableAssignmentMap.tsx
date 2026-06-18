import { useEffect, useMemo, useState } from 'react'
import { Check, ZoomIn, ZoomOut } from 'lucide-react'

type AssignmentMode = 'single' | 'merge'

type Props = {
  tables: any[]
  partySize: number
  initialTableId?: string | null
  initialMergeTableIds?: string[]
  loading?: boolean
  error?: string | null
  onSelectionChange: (selection: { mode: AssignmentMode; tableId: string | null; mergeTableIds: string[] }) => void
}

const floorNameFromArea = (areaName?: string | null) => {
  const name = areaName || 'Main Area'
  return name.includes(' - ') ? name.split(' - ')[0].trim() : name
}

export default function ReservationTableAssignmentMap({
  tables,
  partySize,
  initialTableId,
  initialMergeTableIds = [],
  loading,
  error,
  onSelectionChange,
}: Props) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(initialTableId || null)
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>(initialMergeTableIds)
  const [selectedFloor, setSelectedFloor] = useState('')
  const [zoom, setZoom] = useState(1)
  const [selectionTouched, setSelectionTouched] = useState(false)

  useEffect(() => {
    setSelectedTableId(initialTableId || null)
    setSelectedMergeIds(initialMergeTableIds)
    setSelectionTouched(false)
    onSelectionChange({
      mode: initialMergeTableIds.length > 1 ? 'merge' : 'single',
      tableId: initialMergeTableIds.length > 1 ? null : initialTableId || null,
      mergeTableIds: initialMergeTableIds,
    })
  }, [initialTableId, initialMergeTableIds.join(',')])

  const displayTables = useMemo(() => tables.filter((table) => !table.isMerged), [tables])

  const tablesByFloor = useMemo(() => displayTables.reduce((acc, table) => {
    const floor = floorNameFromArea(table.area?.name || table.area)
    if (!acc[floor]) acc[floor] = []
    acc[floor].push(table)
    return acc
  }, {} as Record<string, any[]>), [displayTables])

  const floors = Object.keys(tablesByFloor)
  const activeFloor = selectedFloor && tablesByFloor[selectedFloor] ? selectedFloor : floors[0] || ''
  const visibleTables = activeFloor ? tablesByFloor[activeFloor] : displayTables

  useEffect(() => {
    if (!activeFloor && floors[0]) setSelectedFloor(floors[0])
  }, [activeFloor, floors.join('|')])

  const positionedTables = visibleTables.map((table: any, index: number) => ({
    table,
    x: table.positionX ?? ((index % 6) * 135 + 28),
    y: table.positionY ?? (Math.floor(index / 6) * 112 + 28),
  }))
  const mapWidth = Math.max(760, ...positionedTables.map((item: { x: number }) => item.x + 170))
  const mapHeight = Math.max(390, ...positionedTables.map((item: { y: number }) => item.y + 130))
  const selectedMergeTables = displayTables.filter((table) => selectedMergeIds.includes(table.id))
  const selectedMergeCapacity = selectedMergeTables.reduce((sum, table) => sum + (Number(table.capacity) || 0), 0)

  const emitSelection = (tableId: string | null, mergeIds: string[]) => {
    onSelectionChange({
      mode: mergeIds.length > 1 ? 'merge' : 'single',
      tableId: mergeIds.length > 1 ? null : tableId,
      mergeTableIds: mergeIds,
    })
  }

  const handleTableClick = (table: any) => {
    setSelectionTouched(true)
    if (table.isMergeable && !table.isMerged) {
      const nextIds = selectedMergeIds.includes(table.id)
        ? selectedMergeIds.filter((id) => id !== table.id)
        : [...selectedMergeIds, table.id]
      setSelectedMergeIds(nextIds)
      const nextSingleId = nextIds.length === 1 ? nextIds[0] : null
      setSelectedTableId(nextSingleId)
      emitSelection(nextSingleId, nextIds)
      return
    }

    setSelectedTableId(table.id)
    setSelectedMergeIds([])
    emitSelection(table.id, [])
  }

  if (loading) {
    return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading available tables...</div>
  }

  if (error) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--accent-red)' }}>{error}</div>
  }

  if (displayTables.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>No tables are available for this time slot.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

      {selectedMergeIds.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 700 }}>
            {selectedMergeTables.map((table) => table.name || `Table ${table.tableNumber}`).join(' + ')} ({selectedMergeCapacity} seats)
          </div>
        </div>
      )}

      {floors.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-secondary)', overflowX: 'auto' }}>
          {floors.map((floor) => {
            const active = activeFloor === floor
            return (
              <button
                key={floor}
                type="button"
                onClick={() => setSelectedFloor(floor)}
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
          style={{ height: '360px', overflow: 'auto', borderRadius: '10px', position: 'relative' }}
        >
          <div style={{ width: `${mapWidth * zoom}px`, height: `${mapHeight * zoom}px`, position: 'relative' }}>
            <div style={{ width: `${mapWidth}px`, height: `${mapHeight}px`, position: 'relative', transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
              {positionedTables.map(({ table, x, y }: any) => {
                const isMergeSelected = selectedMergeIds.includes(table.id)
                const isSingleSelected = selectedTableId === table.id
                const isAssigned = !selectionTouched && (initialTableId === table.id || initialMergeTableIds.includes(table.id))
                const canMerge = table.isMergeable && !table.isMerged
                const shape = String(table.shape || 'rectangle').toLowerCase()
                const isRound = shape === 'circle' || shape === 'round'
                const isVip = table.isPremium || String(table.type || '').toLowerCase().includes('vip')
                const tableWidth = isRound ? 82 : isVip ? 138 : 120
                const tableHeight = isRound ? 82 : 82

                return (
                  <button
                    key={table.id}
                    type="button"
                    className={`reservation-floor-table ${isSingleSelected || isMergeSelected || isAssigned ? 'reservation-floor-table-selected' : ''}`}
                    onClick={() => handleTableClick(table)}
                    title={table.name || `Table ${table.tableNumber}`}
                    style={{
                      position: 'absolute',
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${tableWidth}px`,
                      height: `${tableHeight}px`,
                      borderRadius: isRound ? '999px' : '8px',
                      cursor: 'pointer',
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
                    {(isSingleSelected || isMergeSelected || isAssigned) && (
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
                    <span style={{ fontSize: '0.58rem', color: canMerge ? '#60A5FA' : 'var(--text-secondary)', fontWeight: 800, marginTop: '4px', textTransform: 'uppercase', lineHeight: 1.1 }}>
                      {isAssigned ? 'Assigned' : canMerge ? 'Mergeable' : 'Assign'}
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
            onClick={() => setZoom(prev => Math.max(0.3, Number((prev - 0.1).toFixed(2))))}
            aria-label="Zoom out floor map"
            title="Zoom out"
            style={{ width: '28px', height: '28px', borderRadius: '999px', border: 'none', backgroundColor: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ZoomOut size={18} strokeWidth={2.8} />
          </button>
          <span style={{ minWidth: '48px', textAlign: 'center', fontSize: '1rem', lineHeight: 1, fontWeight: 800 }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(1.8, Number((prev + 0.1).toFixed(2))))}
            aria-label="Zoom in floor map"
            title="Zoom in"
            style={{ width: '28px', height: '28px', borderRadius: '999px', border: 'none', backgroundColor: 'transparent', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ZoomIn size={18} strokeWidth={2.8} />
          </button>
        </div>
      </div>
      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
        Party size: {partySize} guests
      </div>
    </div>
  )
}
