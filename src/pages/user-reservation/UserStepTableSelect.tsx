import { useState } from 'react'
import { Users, MapPin } from 'lucide-react'
import type { ReservationData } from './UserReservationWizard'

interface UserStepTableSelectProps {
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

export default function UserStepTableSelect({ data, updateData }: UserStepTableSelectProps) {
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
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px', marginTop: 0 }}>
        Choose Your Table
      </h2>
      <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '32px', marginTop: 0 }}>
        Select from our available tables
      </p>

      {Object.entries(tables).map(([area, areaTables]) => (
        <div key={area} style={{ marginBottom: '24px' }}>
          {/* Area Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#30363d' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#C99C63' }}>{area}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#30363d' }} />
          </div>

          {/* Table Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '16px'
          }}>
            {areaTables.map((table) => {
              const isSelected = selectedTable === table.id
              return (
                <button
                  key={table.id}
                  onClick={() => handleSelect(table)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '20px',
                    borderRadius: '12px',
                    border: isSelected ? '1px solid #5E8B6A' : '1px solid #30363d',
                    backgroundColor: isSelected ? 'rgba(94, 139, 106, 0.15)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'block',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '9999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <img src="/Group 1597888803.svg" alt="Table" width={20} height={13} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem', margin: 0 }}>
                        {table.name}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '0.75rem', color: '#8b949e' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} />
                          Capacity: {table.capacity} seats
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={13} />
                          {table.location}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
