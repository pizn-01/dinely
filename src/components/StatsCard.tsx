import { type ReactNode } from 'react'

interface StatsCardProps {
  label: string
  value: number | string
  icon: ReactNode
  variant?: 'dark' | 'light'
}

export default function StatsCard({ label, value, icon, variant = 'dark' }: StatsCardProps) {
  const isDark = variant === 'dark'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '12px',
        padding: '16px 24px', // Increased padding
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        backgroundColor: isDark ? '#101A1C' : '#ffffff',
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <div>
        <p style={{
          fontSize: '0.875rem',
          color: isDark ? '#8b949e' : '#6b7280',
          margin: 0
        }}>
          {label}
        </p>
        <p style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginTop: '4px',
          marginBottom: 0,
          color: isDark ? '#ffffff' : '#1f2937'
        }}>
          {value}
        </p>
      </div>
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#161B22' : '#f3f4f6',
          color: isDark ? '#8b949e' : '#9ca3af'
        }}
      >
        {icon}
      </div>
    </div>
  )
}
