import { Users, MapPin } from 'lucide-react'

interface TableCardProps {
  name: string
  capacity: number
  location: string
  icon?: React.ReactNode
  isSelected?: boolean
  badge?: 'Premium' | 'VIP' | 'Exclusive'
  status?: 'available' | 'reserved' | 'occupied'
  onClick?: () => void
}

export default function TableCard({
  name,
  capacity,
  location,
  isSelected = false,
  badge,
  onClick,
}: TableCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '20px',
        borderRadius: '12px',
        border: isSelected ? '1px solid #5E8B6A' : '1px solid #e5e7eb',
        backgroundColor: isSelected ? 'rgba(94, 139, 106, 0.1)' : '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.2s',
        display: 'block',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      }}
      onMouseOver={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = '#d1d5db';
      }}
      onMouseOut={(e) => {
        if (!isSelected) e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '9999px',
          backgroundColor: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="20" height="13" viewBox="0 0 30 19" fill="none" style={{ color: '#6b7280' }} xmlns="http://www.w3.org/2000/svg">
            <path d="M0.417699 18.0133C0.187364 18.0133 0 17.8269 0 17.5968V0.416586C0 0.186409 0.18768 0 0.417699 0C0.649613 0 0.835713 0.186094 0.835713 0.416586V17.5964C0.836029 17.8269 0.649613 18.0133 0.417699 18.0133Z" fill="currentColor"/>
            <path d="M9.39158 12.1691H0.417699C0.187364 12.1691 0 11.983 0 11.7525V9.00709C0 8.77691 0.18768 8.59082 0.417699 8.59082H9.39127C9.62318 8.59082 9.80897 8.77691 9.80897 9.00709V11.7522C9.80928 11.983 9.6235 12.1691 9.39158 12.1691ZM0.836029 11.3359H8.9742V9.42336H0.836029V11.3359Z" fill="currentColor"/>
            <path d="M9.39199 18.0141C9.16166 18.0141 8.97461 17.8277 8.97461 17.5975V10.3792C8.97461 10.1493 9.16197 9.96289 9.39199 9.96289C9.62391 9.96289 9.80969 10.1493 9.80969 10.3792V17.5972C9.80969 17.8277 9.62391 18.0141 9.39199 18.0141Z" fill="currentColor"/>
            <path d="M29.5816 18.0133C29.3516 18.0133 29.1639 17.8269 29.1639 17.5968V0.416586C29.1639 0.186409 29.3519 0 29.5816 0C29.8139 0 29.9997 0.186094 29.9997 0.416586V17.5964C29.9997 17.8269 29.8142 18.0133 29.5816 18.0133Z" fill="currentColor"/>
            <path d="M29.5817 12.1691H20.6081C20.3781 12.1691 20.1904 11.983 20.1904 11.7525V9.00709C20.1904 8.77691 20.3784 8.59082 20.6081 8.59082H29.5817C29.8139 8.59082 29.9997 8.77691 29.9997 9.00709V11.7522C29.9997 11.983 29.8142 12.1691 29.5817 12.1691ZM21.0258 11.3359H29.164V9.42336H21.0258V11.3359Z" fill="currentColor"/>
            <path d="M20.6081 18.0141C20.3781 18.0141 20.1904 17.8277 20.1904 17.5975V10.3792C20.1904 10.1493 20.3784 9.96289 20.6081 9.96289C20.8404 9.96289 21.0258 10.1493 21.0258 10.3792V17.5972C21.0258 17.8277 20.8404 18.0141 20.6081 18.0141Z" fill="currentColor"/>
            <path d="M22.8243 7.16753H7.002C6.7704 7.16753 6.58398 6.98144 6.58398 6.75095V4.691C6.58398 4.46082 6.7704 4.27441 7.002 4.27441H22.824C23.054 4.27441 23.2417 4.46082 23.2417 4.691V6.75095C23.242 6.98112 23.054 7.16753 22.8243 7.16753ZM7.42001 6.33436H22.406V5.10759H7.42001V6.33436Z" fill="currentColor"/>
            <path d="M14.9125 17.5811H14.91C14.6796 17.5795 14.4939 17.3919 14.4951 17.162C14.5166 13.2059 14.5375 7.18377 14.5018 6.81285L14.9128 6.75081L15.2101 6.45703C15.3801 6.6277 15.3896 6.6384 15.3308 17.1667C15.3293 17.3966 15.1416 17.5811 14.9125 17.5811Z" fill="currentColor"/>
            <path d="M18.16 17.5803H11.6661C11.4338 17.5803 11.248 17.394 11.248 17.164C11.248 16.9343 11.4338 16.748 11.6661 16.748H18.16C18.3903 16.748 18.5774 16.9343 18.5774 17.164C18.5774 17.3943 18.3903 17.5803 18.16 17.5803Z" fill="currentColor"/>
            <path d="M1.13651 6.95836C0.509643 6.95836 0 6.45045 0 5.82573V2.57208C0 1.94735 0.509327 1.43945 1.13651 1.43945C1.76305 1.43945 2.27238 1.94704 2.27238 2.57208V5.82573C2.27238 6.45045 1.76305 6.95836 1.13651 6.95836ZM1.13651 2.27263C0.971576 2.27263 0.836029 2.40708 0.836029 2.57208V5.82573C0.836029 5.99073 0.971576 6.12518 1.13651 6.12518C1.30302 6.12518 1.43667 5.99073 1.43667 5.82573V2.57208C1.43667 2.40708 1.30302 2.27263 1.13651 2.27263Z" fill="currentColor"/>
            <path d="M28.8634 6.95836C28.2366 6.95836 27.7275 6.45045 27.7275 5.82573V2.57208C27.7275 1.94735 28.2362 1.43945 28.8634 1.43945C29.4906 1.43945 29.9999 1.94704 29.9999 2.57208V5.82573C29.9996 6.45045 29.4903 6.95836 28.8634 6.95836ZM28.8634 2.27263C28.6988 2.27263 28.5636 2.40708 28.5636 2.57208V5.82573C28.5636 5.99073 28.6988 6.12518 28.8634 6.12518C29.0299 6.12518 29.1639 5.99073 29.1639 5.82573V2.57208C29.1639 2.40708 29.0299 2.27263 28.8634 2.27263Z" fill="currentColor"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontWeight: 600, color: '#111827', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', margin: 0 }}>
              {name}
            </h3>
            {badge && (
              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: badge === 'Premium' ? 'rgba(234, 179, 8, 0.2)' : badge === 'VIP' ? 'rgba(74, 222, 128, 0.2)' : 'rgba(168, 85, 247, 0.2)',
                color: badge === 'Premium' ? '#eab308' : badge === 'VIP' ? '#4ade80' : '#c084fc',
                fontFamily: 'var(--font-sans)'
              }}>
                {badge}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', fontSize: '0.75rem', color: '#6b7280', fontFamily: 'var(--font-sans)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} />
              Capacity: {capacity} seats
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={13} />
              {location}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
