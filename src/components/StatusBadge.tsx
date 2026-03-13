interface StatusBadgeProps {
  status: 'confirmed' | 'seated' | 'arrived' | 'available' | 'cancelled' | 'no-show' | 'pending' | 'manager' | 'host' | 'viewer'
  label?: string
}

const statusConfig = {
  confirmed: { color: '#00B5CE', border: 'none', bg: 'rgba(0, 181, 206, 0.15)', label: 'Confirmed' },
  seated: { color: '#E5484D', border: 'none', bg: 'rgba(229, 72, 77, 0.15)', label: 'Seated' },
  arrived: { color: '#d29922', border: 'none', bg: 'rgba(210,153,34,0.15)', label: 'Arrived' },
  available: { color: '#F5D90A', border: 'none', bg: 'rgba(245, 217, 10, 0.15)', label: 'Available' },
  cancelled: { color: '#8b949e', border: 'none', bg: 'rgba(139,148,158,0.15)', label: 'Cancelled' },
  'no-show': { color: '#8b949e', border: 'none', bg: 'rgba(139,148,158,0.15)', label: 'No Show' },
  pending: { color: '#d29922', border: 'none', bg: 'rgba(210,153,34,0.15)', label: 'Pending' },
  manager: { color: '#00B5CE', border: 'none', bg: 'rgba(0, 181, 206, 0.15)', label: 'Manager' },
  host: { color: '#F5D90A', border: 'none', bg: 'rgba(245, 217, 10, 0.15)', label: 'Host' },
  viewer: { color: '#E5484D', border: 'none', bg: 'rgba(229, 72, 77, 0.15)', label: 'Viewer' },
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4px 16px', // Matches spacious pill shape
      borderRadius: '16px',
      fontSize: '0.75rem',
      fontWeight: 500,
      color: config.color,
      border: config.border,
      backgroundColor: config.bg
    }}>
      {label || config.label}
    </span>
  )
}
