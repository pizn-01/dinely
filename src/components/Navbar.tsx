import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Settings, LogOut, Moon, Sun } from 'lucide-react'

interface NavbarProps {
  variant?: 'public' | 'admin' | 'setup'
  logoUrl?: string
  onSignOut?: () => void
}

export default function Navbar({ variant = 'public', logoUrl, onSignOut }: NavbarProps) {
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut()
    } else {
      logout()
      navigate('/login')
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <nav
      className="res-navbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 48px',
      }}
    >
      <Link
        to="/"
        className="res-nav-logo"
        style={{
          fontSize: '1.35rem',
          fontWeight: 700,
          color: isDark ? '#ffffff' : '#1f2937',
          textDecoration: 'none',
          letterSpacing: '-0.02em',
          fontFamily: 'var(--font-sans)',
          transition: 'color 0.2s',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" style={{ height: '36px', maxWidth: '140px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; const span = document.createElement('span'); span.innerText = 'Logo'; e.currentTarget.parentNode?.appendChild(span); }} />
        ) : (
          'Logo'
        )}
      </Link>

      <div className="res-nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {variant === 'public' && (
          <Link
            to="/login"
            className="btn-gold"
            style={{
              fontSize: '0.875rem',
              padding: '10px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Login
          </Link>
        )}
        {(variant === 'admin' || variant === 'setup') && (
          <>
            <div style={{ position: 'relative' }} ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                style={{
                  padding: '8px',
                  color: isDark ? '#8b949e' : '#6b7280',
                  background: showSettings ? (isDark ? '#161B22' : '#f3f4f6') : 'none',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background-color 0.2s'
                }}
              >
                <Settings size={20} />
              </button>

              {/* Settings Dropdown */}
              {showSettings && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: isDark ? '#161B22' : '#ffffff',
                  border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  padding: '8px',
                  minWidth: '150px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 50
                }}>
                  <button
                    onClick={() => {
                      toggleTheme()
                      setShowSettings(false)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: 'none',
                      border: 'none',
                      borderRadius: '4px',
                      color: isDark ? '#ffffff' : '#1f2937',
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#30363d' : '#f3f4f6'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {isDark ? <Sun size={16} /> : <Moon size={16} />}
                    {isDark ? 'Light mode' : 'Dark mode'}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              style={{
                padding: '8px',
                color: '#8b949e',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = '#ff6b6b'}
              onMouseOut={(e) => e.currentTarget.style.color = '#8b949e'}
            >
              <LogOut size={20} />
            </button>
          </>
        )}
      </div>
    </nav>
  )
}
