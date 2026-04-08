import { useState, useEffect, useCallback } from 'react'
import { Activity, Building2, Users, FileText, ToggleLeft, ToggleRight, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'react-hot-toast'
import { useTheme } from '../../context/ThemeContext'
import Navbar from '../../components/Navbar'
import StatsCard from '../../components/StatsCard'
import PoweredByFooter from '../../components/PoweredByFooter'
import { Navigate } from 'react-router-dom'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'organizations', label: 'Organizations' },
  { id: 'users', label: 'Users' },
  { id: 'audit', label: 'Audit Log' },
]

export default function SuperAdminDashboard() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const [activeTab, setActiveTab] = useState('overview')
  
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    activeRestaurants: 0,
    totalUsers: 0,
    totalReservations: 0,
  })

  const [organizations, setOrganizations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      if (auditRes.data?.logs) {
        setAuditLogs(auditRes.data.logs)
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

  const handleToggleOrgStatus = async (orgId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/organizations/${orgId}/status`, { isActive: !currentStatus })
      setOrganizations(orgs => orgs.map(org => 
        org.id === orgId ? { ...org, is_active: !currentStatus } : org
      ))
    } catch (error) {
      console.error('Failed to toggle org status', error)
      toast.error('Failed to update organization status.')
    }
  }

  if (!user || user.role !== 'super_admin') {
    return <Navigate to="/staff-login" replace />
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1517' : '#f8fafc',
      fontFamily: 'var(--font-sans)',
      transition: 'background-color 0.3s ease',
      color: isDark ? '#ffffff' : '#1e293b'
    }}>
      <Navbar variant="admin" />

      <div className="res-admin-container" style={{ padding: '32px 48px', maxWidth: '1440px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', background: isDark ? 'linear-gradient(90deg, #fff, #a1a1aa)' : 'linear-gradient(90deg, #1e293b, #64748b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Super Admin Console
            </h1>
            <p style={{ color: isDark ? '#8b949e' : '#64748b', fontSize: '0.9375rem', margin: 0 }}>
              Manage platform-wide settings, organizations, and user accounts.
            </p>
          </div>
          <div style={{ padding: '8px 16px', backgroundColor: isDark ? 'rgba(94, 234, 122, 0.1)' : '#ecfdf5', color: isDark ? '#5EEA7A' : '#10b981', borderRadius: '100px', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} /> Platform Operational
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="res-admin-tabs" style={{
          display: 'flex', gap: '32px', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, marginBottom: '32px'
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '16px 0', fontSize: '0.9375rem', fontWeight: 600, position: 'relative', cursor: 'pointer', background: 'none', border: 'none',
                color: activeTab === tab.id ? (isDark ? '#C99C63' : '#b45309') : (isDark ? '#64748b' : '#94a3b8'),
                transition: 'color 0.2s'
              }}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: isDark ? '#C99C63' : '#b45309', borderRadius: '3px 3px 0 0' }} />
              )}
            </button>
          ))}
        </div>

        <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                <StatsCard label="Total Organizations" value={stats.totalRestaurants} icon={<Building2 size={18} />} variant={isDark ? 'dark' : 'light'} />
                <StatsCard label="Active Organizations" value={stats.activeRestaurants} icon={<CheckCircle size={18} />} variant={isDark ? 'dark' : 'light'} />
                <StatsCard label="Total Users" value={stats.totalUsers} icon={<Users size={18} />} variant={isDark ? 'dark' : 'light'} />
                <StatsCard label="Total Reservations" value={stats.totalReservations} icon={<FileText size={18} />} variant={isDark ? 'dark' : 'light'} />
              </div>
            </div>
          )}

          {activeTab === 'organizations' && (
            <div style={{ backgroundColor: isDark ? '#101A1C' : '#ffffff', borderRadius: '16px', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: isDark ? '#152326' : '#f8fafc', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Organization</th>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Contact</th>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Status</th>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map(org => (
                      <tr key={org.id} style={{ borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#1e293b', display: 'block' }}>{org.name}</span>
                          <span style={{ fontSize: '0.875rem', color: isDark ? '#64748b' : '#94a3b8' }}>Created: {new Date(org.created_at).toLocaleDateString()}</span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                           <span style={{ fontSize: '0.875rem', display: 'block' }}>{org.email || 'N/A'}</span>
                           <span style={{ fontSize: '0.75rem', color: isDark ? '#64748b' : '#94a3b8' }}>{org.phone || 'No phone'}</span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700,
                            backgroundColor: org.is_active ? (isDark ? 'rgba(94, 234, 122, 0.1)' : '#ecfdf5') : (isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2'),
                            color: org.is_active ? (isDark ? '#5EEA7A' : '#10b981') : (isDark ? '#ef4444' : '#ef4444')
                          }}>
                            {org.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <button 
                            onClick={() => handleToggleOrgStatus(org.id, org.is_active)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? '#94a3b8' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                            {org.is_active ? <ToggleRight size={24} color={isDark ? '#5EEA7A' : '#10b981'} /> : <ToggleLeft size={24} color={isDark ? '#ef4444' : '#ef4444'} />}
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{org.is_active ? 'Disable' : 'Enable'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {organizations.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8' }}>No organizations found.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div style={{ backgroundColor: isDark ? '#101A1C' : '#ffffff', borderRadius: '16px', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: isDark ? '#152326' : '#f8fafc', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>User</th>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Role</th>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ fontWeight: 600, color: isDark ? '#ffffff' : '#1e293b', display: 'block' }}>{u.first_name} {u.last_name}</span>
                          <span style={{ fontSize: '0.875rem', color: isDark ? '#64748b' : '#94a3b8' }}>{u.email}</span>
                        </td>
                        <td style={{ padding: '16px 24px' }}>
                          <span style={{ 
                            padding: '4px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                            backgroundColor: u.role === 'super_admin' ? (isDark ? 'rgba(201, 156, 99, 0.15)' : '#fef3c7') : (isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe'),
                            color: u.role === 'super_admin' ? '#C99C63' : (isDark ? '#38bdf8' : '#0284c7')
                          }}>
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8' }}>No users found.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}

          {activeTab === 'audit' && (
            <div style={{ backgroundColor: isDark ? '#101A1C' : '#ffffff', borderRadius: '16px', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
               <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: isDark ? '#152326' : '#f8fafc', borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}` }}>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Time</th>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Action</th>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>User ID</th>
                      <th style={{ padding: '16px 24px', fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#94a3b8' : '#64748b' }}>Resource Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} style={{ borderBottom: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, fontSize: '0.875rem' }}>
                        <td style={{ padding: '16px 24px', color: isDark ? '#94a3b8' : '#64748b' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ padding: '16px 24px', fontWeight: 500, color: isDark ? '#ffffff' : '#1e293b' }}>{log.action}</td>
                        <td style={{ padding: '16px 24px', fontFamily: 'monospace', color: isDark ? '#94a3b8' : '#64748b' }}>{log.user_id?.slice(0,8) || 'System'}...</td>
                        <td style={{ padding: '16px 24px', color: isDark ? '#94a3b8' : '#64748b' }}>{log.resource_type}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: isDark ? '#64748b' : '#94a3b8' }}>No audit logs found.</td></tr>
                    )}
                  </tbody>
               </table>
            </div>
          )}

        </div>
      </div>
      <PoweredByFooter theme={isDark ? 'dark' : 'light'} />
    </div>
  )
}
