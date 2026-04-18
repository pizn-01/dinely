import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { CircleUser, LogOut, Moon, Sun, KeyRound, Shield } from 'lucide-react'

interface NavbarProps {
  variant?: 'public' | 'admin' | 'setup'
  logoUrl?: string
  onSignOut?: () => void
  userName?: string
  userEmail?: string
  userRole?: string
  orgSlug?: string
}

export default function Navbar({ variant = 'public', logoUrl, onSignOut, userName, userEmail, userRole, orgSlug }: NavbarProps) {
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()

  // Use passed props or fall back to context
  const displayName = userName || user?.name || 'User'
  const displayEmail = userEmail || user?.email || ''
  const displayRole = userRole || user?.role || ''

  const handleSignOut = () => {
    setShowAccountMenu(false)
    if (onSignOut) {
      onSignOut()
    } else {
      logout()
      navigate('/')
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getRoleBadge = (role: string) => {
    const roleLabels: Record<string, { label: string; color: string; bg: string }> = {
      admin: { label: 'Admin', color: '#C99C63', bg: 'rgba(201,156,99,0.15)' },
      restaurant_admin: { label: 'Admin', color: '#C99C63', bg: 'rgba(201,156,99,0.15)' },
      manager: { label: 'Manager', color: '#6B9E78', bg: 'rgba(107,158,120,0.15)' },
      host: { label: 'Host', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
      viewer: { label: 'Viewer', color: '#8b949e', bg: 'rgba(139,148,158,0.15)' },
      super_admin: { label: 'Super Admin', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
    }
    const r = roleLabels[role] || roleLabels['viewer']
    return (
      <span style={{
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: r.color,
        backgroundColor: r.bg,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {r.label}
      </span>
    )
  }

  const menuItemStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    borderRadius: '6px',
    color: isDark ? '#e6edf3' : '#1f2937',
    fontSize: '0.875rem',
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color 0.15s',
  }

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
          <img src={logoUrl} alt="Logo" style={{ height: '56px', maxWidth: '200px', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; if (e.currentTarget.parentNode) { const span = document.createElement('span'); span.innerText = 'Logo'; e.currentTarget.parentNode.appendChild(span); } }} />
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
          <div style={{ position: 'relative' }} ref={menuRef}>
            <button
              id="account-menu-trigger"
              onClick={() => setShowAccountMenu(!showAccountMenu)}
              style={{
                padding: '6px',
                color: showAccountMenu ? '#C99C63' : (isDark ? '#8b949e' : '#6b7280'),
                background: showAccountMenu ? (isDark ? 'rgba(201,156,99,0.1)' : 'rgba(201,156,99,0.08)') : 'none',
                border: showAccountMenu ? '1px solid rgba(201,156,99,0.3)' : '1px solid transparent',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => { if (!showAccountMenu) e.currentTarget.style.color = isDark ? '#ffffff' : '#1f2937' }}
              onMouseOut={(e) => { if (!showAccountMenu) e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280' }}
            >
              <CircleUser size={26} />
            </button>

            {/* Account Dropdown */}
            {showAccountMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                backgroundColor: isDark ? '#161B22' : '#ffffff',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '12px',
                padding: '6px',
                minWidth: '260px',
                boxShadow: isDark
                  ? '0 8px 24px rgba(0,0,0,0.4)'
                  : '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 50,
                animation: 'fadeInUp 0.15s ease-out',
              }}>
                {/* User Info Section */}
                <div style={{
                  padding: '14px',
                  borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  marginBottom: '4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #C99C63, #b58b57)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '1rem',
                      flexShrink: 0,
                    }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: isDark ? '#ffffff' : '#1f2937',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {displayName}
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: isDark ? '#8b949e' : '#6b7280',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginTop: '2px',
                      }}>
                        {displayEmail}
                      </div>
                      {displayRole && (
                        <div style={{ marginTop: '6px' }}>
                          {getRoleBadge(displayRole)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <button
                  onClick={() => {
                    toggleTheme()
                    setShowAccountMenu(false)
                  }}
                  style={menuItemStyle}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#30363d' : '#f3f4f6'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {isDark ? <Sun size={16} /> : <Moon size={16} />}
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </button>

                <button
                  onClick={() => {
                    setShowAccountMenu(false)
                    // Determine which password reset flow to use
                    const isStaff = displayRole === 'manager' || displayRole === 'host' || displayRole === 'viewer'
                    if (isStaff) {
                      navigate(orgSlug ? `/staff-forgot-password/${orgSlug}` : '/staff-forgot-password')
                    } else {
                      navigate(orgSlug ? `/forgot-password/${orgSlug}` : '/forgot-password')
                    }
                  }}
                  style={menuItemStyle}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#30363d' : '#f3f4f6'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <KeyRound size={16} />
                  Reset Password
                </button>

                {/* Divider */}
                <div style={{
                  height: '1px',
                  backgroundColor: isDark ? '#30363d' : '#e5e7eb',
                  margin: '4px 0',
                }} />

                <button
                  onClick={handleSignOut}
                  style={{
                    ...menuItemStyle,
                    color: '#ef4444',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
