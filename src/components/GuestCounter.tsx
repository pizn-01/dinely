import { Minus, Plus, User } from 'lucide-react'

interface GuestCounterProps {
  count: number
  onChange: (count: number) => void
  presets?: number[]
}

export default function GuestCounter({ count, onChange, presets = [2, 4, 6, 8] }: GuestCounterProps) {
  return (
    <div style={{ marginTop: '24px' }}>
      <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#eab308', marginBottom: '16px', fontFamily: 'var(--font-sans)' }}>
        How many people will be dining?
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <User size={32} style={{ color: '#8b949e' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => onChange(Math.max(1, count - 1))}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              backgroundColor: 'rgba(74, 222, 128, 0.2)', // green-primary transparent
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <Minus size={18} />
          </button>
          <div style={{
            width: '96px',
            height: '40px',
            border: '1px solid #30363d',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '1rem',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)'
          }}>
            {count}
          </div>
          <button
            onClick={() => onChange(Math.min(20, count + 1))}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '9999px',
              backgroundColor: '#4ade80', // green-primary
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            <Plus size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
          {presets.map((preset) => {
             const isSelected = count === preset;
             return (
              <button
                key={preset}
                onClick={() => onChange(preset)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  border: isSelected ? '1px solid #4ade80' : '1px solid #30363d',
                  backgroundColor: isSelected ? '#4ade80' : 'transparent',
                  color: isSelected ? '#ffffff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontFamily: 'var(--font-sans)'
                }}
              >
                {preset}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
