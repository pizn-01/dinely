import { useState, useEffect, useCallback } from 'react'
import { Calendar, Users, Building2, CheckCircle, CreditCard, Clock, Map, Star, Activity, Plus, ShieldAlert, LogOut, ArrowUpRight, TrendingUp, FileText, ToggleLeft, ToggleRight, XCircle, AlertTriangle, DollarSign, ExternalLink } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-hot-toast'
import { useTheme } from '../../context/ThemeContext'
import Navbar from '../../components/Navbar'
import StatsCard from '../../components/StatsCard'
import PoweredByFooter from '../../components/PoweredByFooter'
import { Navigate } from 'react-router-dom'
import dinelyLogo from '../../assets/dinely-logo.png'

const tabs = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'support', label: 'Support Tickets', icon: AlertTriangle },
  { id: 'broadcasts', label: 'Broadcasts', icon: Activity },
  { id: 'audit', label: 'Audit Log', icon: Clock },
]

// ─── Helpers ──────────────────────────────────────────────────
function getPlanBadge(plan: string, isDark: boolean) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    professional: { bg: isDark ? 'rgba(201, 156, 99, 0.15)' : '#fef3c7', color: '#C99C63', label: 'Professional' },
    starter: { bg: isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe', color: isDark ? '#38bdf8' : '#0284c7', label: 'Starter' },
    free: { bg: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', label: 'Free' },
  }
  const s = styles[plan] || styles.free
  return (
    <span style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: s.bg, color: s.color, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
      {s.label}
    </span>
  )
}

function getStatusBadge(status: string, isDark: boolean) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', color: isDark ? '#34d399' : '#059669', label: 'Active' },
    trialing: { bg: isDark ? 'rgba(139, 92, 246, 0.1)' : '#ede9fe', color: isDark ? '#a78bfa' : '#7c3aed', label: 'Trialing' },
    past_due: { bg: isDark ? 'rgba(245, 158, 11, 0.1)' : '#fffbeb', color: isDark ? '#fbbf24' : '#d97706', label: 'Past Due' },
    canceled: { bg: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2', color: isDark ? '#f87171' : '#dc2626', label: 'Canceled' },
    none: { bg: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', label: 'No Subscription' },
  }
  const s = styles[status] || styles.none
  return (
    <span style={{ padding: '4px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const { user, isLoading } = useAuth()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState(tabs[0].id)
  
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    activeRestaurants: 0,
    totalUsers: 0,
    totalReservations: 0,
    financials: { mrr: 0, arpu: 0, churnRate: 0 },
  })

  const [organizations, setOrganizations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [supportTickets, setSupportTickets] = useState<any[]>([])
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Broadcast creation state
  const [bcTitle, setBcTitle] = useState('')
  const [bcMessage, setBcMessage] = useState('')
  const [bcType, setBcType] = useState('info')

  const fetchData = useCallback(async () => {
    if (user?.role !== 'super_admin') return
    try {
      setLoading(true)
      const statsRes = await api.get('/admin/stats')
      if (statsRes.data?.data) {
        setStats(statsRes.data.data)
      }
      
      const orgsRes = await api.get('/admin/organizations?limit=100')
      if (orgsRes.data?.organizations) {
        setOrganizations(orgsRes.data.organizations)
      }

      const usersRes = await api.get('/admin/users?limit=100')
      if (usersRes.data?.users) {
        setUsers(usersRes.data.users)
      }

      const auditRes = await api.get('/admin/audit-log?limit=50')
      if (auditRes.data?.entries) {
        setAuditLogs(auditRes.data.entries)
      }

      const supportRes = await api.get('/admin/support-tickets?limit=50')
      if (supportRes.data?.tickets) {
        setSupportTickets(supportRes.data.tickets)
      }

      const bcRes = await api.get('/admin/broadcasts?limit=50')
      if (bcRes.data?.broadcasts) {
        setBroadcasts(bcRes.data.broadcasts)
      }
    } catch (error) {
      console.error('Failed to load super admin data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleResolveTicket = async (ticketId: string) => {
    try {
      await api.patch(`/admin/support-tickets/${ticketId}/status`, { status: 'resolved' })
      setSupportTickets(tickets => tickets.map(t => t.id === ticketId ? { ...t, status: 'resolved' } : t))
      toast.success('Ticket marked as resolved.')
    } catch (error) {
      console.error('Failed to resolve ticket', error)
      toast.error('Failed to update ticket status.')
    }
  }

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bcTitle.trim() || !bcMessage.trim()) return
    try {
      const res = await api.post('/admin/broadcasts', { title: bcTitle, message: bcMessage, type: bcType, isActive: true })
      if (res.data?.data) {
        setBroadcasts([res.data.data, ...broadcasts])
        setBcTitle('')
        setBcMessage('')
        toast.success('Broadcast dispatched successfully.')
      }
    } catch (error) {
      console.error('Failed to dispatch broadcast', error)
      toast.error('Failed to create broadcast.')
    }
  }

  const handleToggleBroadcast = async (bcId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/broadcasts/${bcId}/toggle`, { isActive: !currentStatus })
      setBroadcasts(list => list.map(b => b.id === bcId ? { ...b, is_active: !currentStatus } : b))
      toast.success(currentStatus ? 'Broadcast deactivated.' : 'Broadcast activated.')
    } catch (error) {
      console.error('Failed to toggle broadcast', error)
      toast.error('Failed to update broadcast status.')
    }
  }

  const handleToggleOrgStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/organizations/${orgId}/status`, { isActive: !currentStatus })
      setOrganizations(orgs => orgs.map(org => 
        org.id === orgId ? { ...org, isActive: !currentStatus } : org
      ))
      toast.success(`Organization ${!currentStatus ? 'activated' : 'deactivated'} successfully.`)
    } catch (error) {
      console.error('Failed to toggle org status', error)
      toast.error('Failed to update organization status.')
    }
  }

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1517' : '#f8fafc' }}>Loading...</div>
  }

  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/staff-login" replace />
  }

  // ─── Subscription Stats ───────────────
  const subStats = {
    totalPaying: organizations.filter(o => o.subscriptionPlan && o.subscriptionPlan !== 'free').length,
    trialing: organizations.filter(o => o.subscriptionStatus === 'trialing').length,
    pastDue: organizations.filter(o => o.subscriptionStatus === 'past_due').length,
    professional: organizations.filter(o => o.subscriptionPlan === 'professional').length,
    starter: organizations.filter(o => o.subscriptionPlan === 'starter').length,
  }

  // ─── Shared Styles ───────────────
  const cardBg = isDark ? '#101A1C' : '#ffffff'
  const borderColor = isDark ? '#1e293b' : '#e2e8f0'
  const textPrimary = isDark ? '#ffffff' : '#1e293b'
  const textSecondary = isDark ? '#94a3b8' : '#64748b'
  const textMuted = isDark ? '#64748b' : '#94a3b8'
  const gold = '#C99C63'
  const headerBg = isDark ? '#152326' : '#f8fafc'

  const tableStyle = {
    width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const,
  }
  const thStyle = {
    padding: '16px 24px', fontWeight: 600 as const, fontSize: '0.8rem', color: textSecondary, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  }
  const tdStyle = {
    padding: '16px 24px',
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1517' : '#f8fafc',
      fontFamily: 'var(--font-sans)',
      transition: 'background-color 0.3s ease',
      color: textPrimary
    }}>
      <Navbar variant="admin" logoUrl={dinelyLogo} />

      <div className="res-admin-container" style={{ padding: '32px 48px', maxWidth: '1440px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <img src={dinelyLogo} alt="Dinely" style={{ height: '28px', objectFit: 'contain', filter: isDark ? 'brightness(0) invert(1)' : 'none' }} />
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 4px 0', letterSpacing: '-0.02em', background: isDark ? 'linear-gradient(90deg, #fff, #a1a1aa)' : 'linear-gradient(90deg, #1e293b, #64748b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Super Admin Console
              </h1>
              <p style={{ color: textSecondary, fontSize: '0.9375rem', margin: 0 }}>
                Manage platform-wide settings, organizations, and subscriptions.
              </p>
            </div>
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: isDark ? 'rgba(94, 234, 122, 0.1)' : '#ecfdf5', color: isDark ? '#5EEA7A' : '#10b981', borderRadius: '100px', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} /> Platform Operational
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="res-admin-tabs" style={{
          display: 'flex', gap: '8px', borderBottom: `1px solid ${borderColor}`, marginBottom: '32px', overflowX: 'auto'
        }}>
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '14px 20px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  position: 'relative',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: isActive ? gold : textSecondary,
                  transition: 'color 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} />
                {tab.label}
                {tab.id === 'subscriptions' && subStats.pastDue > 0 && (
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} />
                )}
                {isActive && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: gold, borderRadius: '3px 3px 0 0' }} />
                )}
              </button>
            )
          })}
        </div>

        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>

          {/* ═══════════════════════════════════════════════ */}
          {/* OVERVIEW TAB                                    */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div className="res-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
                <StatsCard label="Total Organizations" value={stats.totalRestaurants} icon={<Building2 size={18} />} variant={isDark ? 'dark' : 'light'} />
                <StatsCard label="Active Organizations" value={stats.activeRestaurants} icon={<CheckCircle size={18} />} variant={isDark ? 'dark' : 'light'} />
                <StatsCard label="Paying Subscribers" value={subStats.totalPaying} icon={<CreditCard size={18} />} variant={isDark ? 'dark' : 'light'} />
                <StatsCard label="Total Users" value={stats.totalUsers} icon={<Users size={18} />} variant={isDark ? 'dark' : 'light'} />
                <StatsCard label="Total Reservations" value={stats.totalReservations} icon={<FileText size={18} />} variant={isDark ? 'dark' : 'light'} />
              </div>

              {/* Financial Analytics */}
              <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, padding: '28px 32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={18} style={{ color: '#22c55e' }} /> Financial Analytics (SaaS)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div style={{ backgroundColor: isDark ? '#152326' : '#f9fafb', borderRadius: '12px', padding: '20px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', marginBottom: '4px' }}>£{stats.financials?.mrr || 0}</div>
                    <div style={{ fontSize: '0.85rem', color: textSecondary, fontWeight: 500 }}>Monthly Recurring Revenue</div>
                  </div>
                  <div style={{ backgroundColor: isDark ? '#152326' : '#f9fafb', borderRadius: '12px', padding: '20px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: gold, marginBottom: '4px' }}>£{stats.financials?.arpu || 0}</div>
                    <div style={{ fontSize: '0.85rem', color: textSecondary, fontWeight: 500 }}>Avg. Rev. Per User (ARPU)</div>
                  </div>
                  <div style={{ backgroundColor: isDark ? '#152326' : '#f9fafb', borderRadius: '12px', padding: '20px', border: `1px solid ${borderColor}` }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>{stats.financials?.churnRate || 0}%</div>
                    <div style={{ fontSize: '0.85rem', color: textSecondary, fontWeight: 500 }}>Churn Rate</div>
                  </div>
                </div>
              </div>

              {/* Quick subscription breakdown */}
              <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, padding: '28px 32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CreditCard size={18} style={{ color: gold }} /> Subscription Overview
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  {[
                    { label: 'Professional', value: subStats.professional, color: gold },
                    { label: 'Starter', value: subStats.starter, color: isDark ? '#38bdf8' : '#0284c7' },
                    { label: 'Free Tier', value: organizations.length - subStats.totalPaying, color: textMuted },
                    { label: 'Trialing', value: subStats.trialing, color: isDark ? '#a78bfa' : '#7c3aed' },
                    { label: 'Past Due', value: subStats.pastDue, color: '#ef4444' },
                  ].map(item => (
                    <div key={item.label} style={{ backgroundColor: isDark ? '#152326' : '#f9fafb', borderRadius: '12px', padding: '20px', border: `1px solid ${borderColor}` }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: item.color, marginBottom: '4px' }}>{item.value}</div>
                      <div style={{ fontSize: '0.85rem', color: textSecondary, fontWeight: 500 }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* SUBSCRIPTIONS TAB                               */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'subscriptions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Past Due Alert */}
              {subStats.pastDue > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.08)' : '#fffbeb', borderRadius: '12px', border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.2)' : '#fcd34d'}` }}>
                  <AlertTriangle size={20} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isDark ? '#fbbf24' : '#92400e' }}>{subStats.pastDue} organization{subStats.pastDue > 1 ? 's' : ''} with past due payments</div>
                    <div style={{ fontSize: '0.825rem', color: isDark ? '#a1a1aa' : '#78716c' }}>These accounts have failed payments and may need attention in the Stripe dashboard.</div>
                  </div>
                </div>
              )}

              {/* Subscription Table */}
              <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <div style={{ padding: '20px 24px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={16} style={{ color: gold }} /> All Organization Subscriptions
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: textMuted, fontWeight: 500 }}>{organizations.length} total</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}` }}>
                        <th style={thStyle}>Organization</th>
                        <th style={thStyle}>Plan</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Created</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {organizations.map(org => (
                        <tr key={org.id} style={{ borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.15s' }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#152326' : '#f9fafb')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: isDark ? '#1e293b' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: gold, fontSize: '0.9rem' }}>
                                {(org.name || 'R')[0].toUpperCase()}
                              </div>
                              <div>
                                <span style={{ fontWeight: 600, color: textPrimary, display: 'block', fontSize: '0.9rem' }}>{org.name}</span>
                                <span style={{ fontSize: '0.8rem', color: textMuted }}>{org.slug || 'no-slug'}</span>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>{getPlanBadge(org.subscriptionPlan || 'free', isDark)}</td>
                          <td style={tdStyle}>{getStatusBadge(org.subscriptionStatus || 'none', isDark)}</td>
                          <td style={{ ...tdStyle, fontSize: '0.85rem', color: textMuted }}>{new Date(org.createdAt).toLocaleDateString()}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                window.open('https://dashboard.stripe.com', '_blank')
                              }}
                              style={{
                                background: 'none', border: `1px solid ${borderColor}`, cursor: 'pointer', color: textSecondary,
                                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px',
                                fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.15s',
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.borderColor = gold; e.currentTarget.style.color = gold }}
                              onMouseOut={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.color = textSecondary }}
                            >
                              <ExternalLink size={14} /> Stripe
                            </button>
                          </td>
                        </tr>
                      ))}
                      {organizations.length === 0 && (
                        <tr><td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>No organizations found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* ORGANIZATIONS TAB                               */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'organizations' && (
            <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}` }}>
                      <th style={thStyle}>Organization</th>
                      <th style={thStyle}>Contact</th>
                      <th style={thStyle}>Plan</th>
                      <th style={thStyle}>Status</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map(org => (
                      <tr key={org.id} style={{ borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.15s' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#152326' : '#f9fafb')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 600, color: textPrimary, display: 'block' }}>{org.name}</span>
                          <span style={{ fontSize: '0.8rem', color: textMuted }}>Created: {new Date(org.createdAt).toLocaleDateString()}</span>
                        </td>
                        <td style={tdStyle}>
                           <span style={{ fontSize: '0.875rem', display: 'block' }}>{org.email || 'N/A'}</span>
                           <span style={{ fontSize: '0.75rem', color: textMuted }}>{org.phone || 'No phone'}</span>
                        </td>
                        <td style={tdStyle}>{getPlanBadge(org.subscriptionPlan || 'free', isDark)}</td>
                        <td style={tdStyle}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: org.isActive ? (isDark ? 'rgba(94, 234, 122, 0.1)' : '#ecfdf5') : (isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'),
                            color: org.isActive ? (isDark ? '#5EEA7A' : '#10b981') : '#ef4444'
                          }}>
                            {org.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          <button 
                            onClick={() => handleToggleOrgStatus(org.id, org.isActive)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                            {org.isActive ? <ToggleRight size={24} color={isDark ? '#5EEA7A' : '#10b981'} /> : <ToggleLeft size={24} color="#ef4444" />}
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{org.isActive ? 'Disable' : 'Enable'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {organizations.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>No organizations found.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* USERS TAB                                       */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}` }}>
                      <th style={thStyle}>User</th>
                      <th style={thStyle}>Organization</th>
                      <th style={thStyle}>Role</th>
                      <th style={thStyle}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.15s' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#152326' : '#f9fafb')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 600, color: textPrimary, display: 'block' }}>{u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'N/A'}</span>
                          <span style={{ fontSize: '0.8rem', color: textMuted }}>{u.email}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.85rem', color: textSecondary }}>{u.restaurant?.name || 'N/A'}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                            backgroundColor: u.role === 'super_admin' ? (isDark ? 'rgba(201, 156, 99, 0.15)' : '#fef3c7') : (isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe'),
                            color: u.role === 'super_admin' ? gold : (isDark ? '#38bdf8' : '#0284c7')
                          }}>
                            {(u.role || '').replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.85rem', color: textMuted }}>
                          {new Date(u.createdAt || u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>No users found.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* AUDIT LOG TAB                                   */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'audit' && (
            <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}` }}>
                      <th style={thStyle}>Time</th>
                      <th style={thStyle}>Action</th>
                      <th style={thStyle}>User ID</th>
                      <th style={thStyle}>Resource Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: `1px solid ${borderColor}`, fontSize: '0.875rem', transition: 'background-color 0.15s' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#152326' : '#f9fafb')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <td style={tdStyle}>{new Date(log.createdAt).toLocaleString()}</td>
                        <td style={{ ...tdStyle, fontWeight: 500, color: textPrimary }}>{log.action}</td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: textMuted }}>{log.userId?.slice(0,8) || 'System'}...</td>
                        <td style={{ ...tdStyle, color: textMuted }}>{log.entityType}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>No audit logs found.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* SUPPORT TICKETS TAB                             */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'support' && (
            <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               <table style={tableStyle}>
                  <thead>
                    <tr style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}` }}>
                      <th style={thStyle}>Ticket details</th>
                      <th style={thStyle}>Restaurant</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Submitted</th>
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supportTickets.map(ticket => (
                      <tr key={ticket.id} style={{ borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.15s' }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = isDark ? '#152326' : '#f9fafb')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 600, color: textPrimary, display: 'block' }}>{ticket.subject}</span>
                          <span style={{ fontSize: '0.8rem', color: textMuted, whiteSpace: 'pre-wrap', display: 'block', maxWidth: '300px' }}>{ticket.message}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: '0.85rem', color: textSecondary, display: 'block' }}>{ticket.restaurantName || 'Unknown'}</span>
                          <span style={{ fontSize: '0.75rem', color: textMuted, display: 'block' }}>{ticket.restaurantEmail || ''}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                            backgroundColor: ticket.status === 'open' ? 'rgba(250, 204, 21, 0.1)' : ticket.status === 'resolved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                            color: ticket.status === 'open' ? '#facc15' : ticket.status === 'resolved' ? '#22c55e' : '#38bdf8'
                          }}>
                            {ticket.status}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: '0.85rem', color: textMuted }}>
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {ticket.status === 'open' && (
                            <button 
                              onClick={() => handleResolveTicket(ticket.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                              <CheckCircle size={18} />
                              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Mark as resolved</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {supportTickets.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>No support tickets found.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* BROADCASTS TAB                                */}
          {/* ═══════════════════════════════════════════════ */}
          {activeTab === 'broadcasts' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
              <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', color: textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity color={gold} size={20} /> Create Global Broadcast
                </h3>
                <form onSubmit={handleCreateBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: textMuted, marginBottom: '8px' }}>Title</label>
                    <input type="text" value={bcTitle} onChange={(e) => setBcTitle(e.target.value)} required placeholder="e.g. Scheduled Maintenance" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: isDark ? '#0d1117' : '#fff', color: textPrimary, outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: textMuted, marginBottom: '8px' }}>Message</label>
                    <textarea value={bcMessage} onChange={(e) => setBcMessage(e.target.value)} required rows={4} placeholder="Describe the announcement..." style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: isDark ? '#0d1117' : '#fff', color: textPrimary, outline: 'none', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: textMuted, marginBottom: '8px' }}>Type</label>
                    <select value={bcType} onChange={(e) => setBcType(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${borderColor}`, backgroundColor: isDark ? '#0d1117' : '#fff', color: textPrimary, outline: 'none' }}>
                      <option value="info">Info (Blue)</option>
                      <option value="warning">Warning (Yellow)</option>
                    </select>
                  </div>
                  <button type="submit" style={{ padding: '12px', borderRadius: '8px', backgroundColor: gold, color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>
                    Dispatch Broadcast
                  </button>
                </form>
              </div>

              <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                 <table style={tableStyle}>
                    <thead>
                      <tr style={{ backgroundColor: headerBg, borderBottom: `1px solid ${borderColor}` }}>
                        <th style={thStyle}>Broadcast</th>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {broadcasts.map(b => (
                        <tr key={b.id} style={{ borderBottom: `1px solid ${borderColor}`, transition: 'background-color 0.15s' }}>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 600, color: textPrimary, display: 'block' }}>{b.title}</span>
                            <span style={{ fontSize: '0.8rem', color: textMuted }}>{b.message}</span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ 
                              padding: '2px 8px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                              backgroundColor: b.type === 'warning' ? 'rgba(250, 204, 21, 0.1)' : 'rgba(56, 189, 248, 0.1)',
                              color: b.type === 'warning' ? '#facc15' : '#38bdf8'
                            }}>
                              {b.type}
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: '0.85rem', color: textMuted }}>{new Date(b.created_at).toLocaleDateString()}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <button 
                              onClick={() => handleToggleBroadcast(b.id, b.is_active)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                              {b.is_active ? <ToggleRight size={24} color={isDark ? '#5EEA7A' : '#10b981'} /> : <ToggleLeft size={24} color="#ef4444" />}
                              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{b.is_active ? 'Active' : 'Inactive'}</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {broadcasts.length === 0 && (
                        <tr><td colSpan={4} style={{ padding: '48px 24px', textAlign: 'center', color: textMuted }}>No broadcasts found.</td></tr>
                      )}
                    </tbody>
                 </table>
              </div>
            </div>
          )}

        </div>
      </div>
      <PoweredByFooter theme={isDark ? 'dark' : 'light'} />
    </div>
  )
}
