import { Download } from 'lucide-react'
import StatusBadge from '../../../components/StatusBadge'

interface ReservationTabProps {
  theme: 'dark' | 'light'
}

const reservations = [
  { id: 1, guest: 'Amy Dogan', table: 'Table 3', time: '17:00', party: 4, status: 'confirmed' as const },
  { id: 2, guest: 'Jon Lane', table: 'Table 7', time: '17:30', party: 4, status: 'seated' as const },
  { id: 3, guest: 'Mike Porter', table: 'Table 1', time: '18:00', party: 6, status: 'arrived' as const },
  { id: 4, guest: 'Susan Reach', table: 'Table 3', time: '18:30', party: 4, status: 'confirmed' as const },
  { id: 5, guest: 'Beth Rose', table: 'Table 1', time: '19:00', party: 6, status: 'confirmed' as const },
  { id: 6, guest: 'Maggie Slate', table: 'Table 7', time: '19:30', party: 4, status: 'confirmed' as const },
  { id: 7, guest: 'Tonny Timber', table: 'Table 9', time: '20:00', party: 8, status: 'confirmed' as const },
  { id: 8, guest: 'Uston &Co', table: 'Table 1', time: '17:00', party: 8, status: 'seated' as const },
]

export default function ReservationTab({ theme }: ReservationTabProps) {
  const isDark = theme === 'dark'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: isDark ? '#ffffff' : '#1f2937' }}>
          Today's Reservations
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
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}` }}>
              {['Guest', 'Table', 'Time', 'Party Size', 'Status'].map((h) => (
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
            {reservations.map((res) => (
              <tr
                key={res.id}
                style={{
                  borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#161B22' : '#f9fafb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <td style={{ padding: '16px', fontWeight: 600, color: isDark ? '#ffffff' : '#1f2937' }}>
                  {res.guest}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {res.table}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {res.time}
                </td>
                <td style={{ padding: '16px', color: isDark ? '#8b949e' : '#6b7280' }}>
                  {res.party}
                </td>
                <td style={{ padding: '16px' }}>
                  <StatusBadge status={res.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
