import { Plus, Edit } from 'lucide-react'
import StatusBadge from '../../../components/StatusBadge'

interface TablesManagementTabProps {
  theme: 'dark' | 'light'
}

const tables = [
  { id: 1, name: '#1', area: 'Window', capacity: 2, type: 'Window', shape: 'Rectangle', status: 'seated' as const },
  { id: 2, name: '#2', area: 'Main Dining', capacity: 2, type: 'Main Dining', shape: 'Round', status: 'confirmed' as const },
  { id: 3, name: '#3', area: 'Outdoor', capacity: 4, type: 'Outdoor', shape: 'Rectangle', status: 'available' as const },
  { id: 4, name: '#4', area: 'Window', capacity: 4, type: 'Window', shape: 'Rectangle', status: 'confirmed' as const },
  { id: 5, name: '#5', area: 'Main Dining', capacity: 2, type: 'Main Dining', shape: 'Round', status: 'available' as const },
  { id: 6, name: '#6', area: 'Outdoor', capacity: 6, type: 'Outdoor', shape: 'Rectangle', status: 'seated' as const },
]

export default function TablesManagementTab({ theme }: TablesManagementTabProps) {
  const isDark = theme === 'dark'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: isDark ? '#ffffff' : '#1f2937' }}>
          All Tables
        </h3>
        <button style={{
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
                  padding: '16px', // spacious header padding
                  fontWeight: 500,
                  color: isDark ? '#8b949e' : '#6b7280'
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
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
                  {table.name}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {table.area}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {table.capacity}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {table.type}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {table.shape}
                </td>
                <td style={{ padding: '16px' }}>
                  <StatusBadge status={table.status} />
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <button style={{
                    background: 'none',
                    border: 'none',
                    color: isDark ? '#8b949e' : '#6b7280',
                    cursor: 'pointer',
                    padding: '4px'
                  }}>
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
