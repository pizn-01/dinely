import { useState } from 'react'
import TableCard from '../../components/TableCard'
import type { ReservationData } from './ReservationWizard'

interface StepTableSelectProps {
  data: ReservationData
  updateData: (updates: Partial<ReservationData>) => void
}

const tables = {
  Window: [
    { id: 't1', name: 'Table 1', capacity: 2, location: 'By the window' },
    { id: 't2', name: 'Table 2', capacity: 2, location: 'Center area' },
  ],
  'Main Dining': [
    { id: 't3', name: 'Table 3', capacity: 4, location: 'Private corner' },
    { id: 't4', name: 'Table 4', capacity: 4, location: 'Near the bar' },
  ],
  Outdoor: [
    { id: 't5', name: 'Table 5', capacity: 6, location: 'By the window' },
    { id: 't6', name: 'Table 6', capacity: 6, location: 'Center area' },
  ],
}

export default function StepTableSelect({ data, updateData }: StepTableSelectProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(data.tableId)

  const handleSelect = (table: typeof tables.Window[0]) => {
    setSelectedTable(table.id)
    updateData({
      tableId: table.id,
      tableName: table.name,
      tableCapacity: table.capacity,
      tableLocation: table.location,
    })
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px', fontFamily: 'var(--font-sans)', marginTop: 0 }}>
        Choose Your Table
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '32px', fontFamily: 'var(--font-sans)', marginTop: 0 }}>
        Select from our available tables
      </p>

      {Object.entries(tables).map(([area, areaTables]) => (
        <div key={area} style={{ marginBottom: '24px' }}>
          {/* Area Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#30363d' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#C99C63', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>{area}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#30363d' }} />
          </div>

          {/* Table Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '16px'
          }}>
            {areaTables.map((table) => (
              <TableCard
                key={table.id}
                name={table.name}
                capacity={table.capacity}
                location={table.location}
                isSelected={selectedTable === table.id}
                onClick={() => handleSelect(table)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
