import { Search, MoreVertical } from 'lucide-react'
import StatusBadge from '../../../components/StatusBadge'

interface StaffManagementTabProps {
  theme: 'dark' | 'light'
}

const staff = [
  { id: 1, name: 'Sarah Chen', email: 'sarahchen@example.com', lastActive: '2 min ago', status: 'manager' as const },
  { id: 2, name: 'James Wilson', email: 'jameswilson@example.com', lastActive: '5 min ago', status: 'manager' as const },
  { id: 3, name: 'Maria Garcia', email: 'mariagarcia@example.com', lastActive: '3 min ago', status: 'host' as const },
  { id: 4, name: 'Robert Kim', email: 'robertkim@example.com', lastActive: '10 min ago', status: 'manager' as const },
  { id: 5, name: 'Emily Davis', email: 'emilydavis@example.com', lastActive: '15 min ago', status: 'host' as const },
  { id: 6, name: 'Tom Miller', email: 'tommiller@example.com', lastActive: '2 min ago', status: 'viewer' as const },
  { id: 7, name: 'Tom Miller', email: 'tommiller@example.com', lastActive: '2 min ago', status: 'viewer' as const },
]

export default function StaffManagementTab({ theme }: StaffManagementTabProps) {
  const isDark = theme === 'dark'

  return (
    <div>
      {/* Top Control Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ position: 'relative', width: '400px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: isDark ? '#8b949e' : '#6b7280' }} />
          <input
            type="text"
            placeholder="Search name, phone, email or skills"
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              backgroundColor: isDark ? '#161B22' : '#ffffff',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: isDark ? '#ffffff' : '#1f2937',
              fontSize: '0.875rem'
            }}
          />
        </div>
        <select style={{
          padding: '10px 16px',
          backgroundColor: isDark ? '#161B22' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '8px',
          color: isDark ? '#ffffff' : '#1f2937',
          fontSize: '0.875rem',
          cursor: 'pointer',
          appearance: 'none', // to allow custom styling if needed, though simple select is fine for MVP
          minWidth: '150px'
        }}>
          <option>All Roles</option>
          <option>Manager</option>
          <option>Host</option>
          <option>Viewer</option>
        </select>
      </div>

      {/* Table Container */}
      <div style={{
        borderRadius: '12px',
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        backgroundColor: 'transparent',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                backgroundColor: isDark ? '#101A1C' : '#f9fafb'
              }}>
                {['Name', 'Email', 'Last Active', 'Status', ''].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left',
                    padding: '16px 24px',
                    fontWeight: 500,
                    color: isDark ? '#ffffff' : '#4b5563' // Bright header text as per design
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr
                  key={member.id}
                  style={{
                    borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#161B22' : '#f9fafb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#1f2937' }}>
                    {member.name}
                  </td>
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#4b5563' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#4b5563' }}>
                    {member.lastActive}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <StatusBadge status={member.status} />
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button style={{
                      background: 'none',
                      border: 'none',
                      color: isDark ? '#8b949e' : '#6b7280',
                      cursor: 'pointer',
                      padding: '4px'
                    }}>
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
