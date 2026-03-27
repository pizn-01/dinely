import React from 'react'
import blackstoneLogo from '../assets/blackstone_logo.png'

interface PoweredByFooterProps {
  theme?: 'dark' | 'light'
}

export default function PoweredByFooter({ theme = 'light' }: PoweredByFooterProps) {
  const isDark = theme === 'dark'

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '24px',
        marginTop: 'auto', // Pushes to bottom in flex-col layouts
        opacity: 0.95,
        transition: 'opacity 0.2s ease',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.95'}
      onClick={() => window.open('https://blackstonesoftwares.com', '_blank')}
    >
      <span style={{
        fontSize: '0.9rem',
        fontWeight: 500,
        color: isDark ? '#D1D5DB' : '#4B5563',
        fontFamily: 'Inter, system-ui, sans-serif',
        marginTop: '2px' // visually align better
      }}>
        Powered by
      </span>
      <img 
        src={blackstoneLogo} 
        alt="Blackstone Softwares and Solutions" 
        style={{ height: '40px', objectFit: 'contain' }} 
      />
    </div>
  )
}
