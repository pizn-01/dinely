import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Calendar, CreditCard, Activity, Users, Map, Star, Clock, AlertTriangle, FileText, Globe, Mail, Phone, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Navbar from '../../components/Navbar'
import StatsCard from '../../components/StatsCard'
import PoweredByFooter from '../../components/PoweredByFooter'
import dinelyLogo from '../../assets/dinely-logo.png'
import { toast } from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────
function getPlanBadge(plan: string, isDark: boolean) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    professional: { bg: isDark ? 'rgba(201, 156, 99, 0.15)' : '#fef3c7', color: '#C99C63', label: 'Professional' },
    starter: { bg: isDark ? 'rgba(56, 189, 248, 0.1)' : '#e0f2fe', color: isDark ? '#38bdf8' : '#0284c7', label: 'Starter' },
    free: { bg: isDark ? 'rgba(148, 163, 184, 0.1)' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', label: 'Free' },
  }
  const s = styles[plan] || styles.free
  return (
    <span style={{ padding: '6px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: s.bg, color: s.color, textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'inline-block' }}>
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
    <span style={{ padding: '6px 16px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: s.bg, color: s.color, display: 'inline-block' }}>
      {s.label}
    </span>
  )
}

function calculateTimeWithSystem(createdAt: string, status: string, cancelDate?: string) {
  const start = new Date(createdAt)
  const end = (status === 'canceled' && cancelDate) ? new Date(cancelDate) : new Date()
  
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) return `${diffDays} days`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} months`
  const diffYears = Math.floor(diffMonths / 12)
  const remainingMonths = diffMonths % 12
  return remainingMonths > 0 ? `${diffYears} years, ${remainingMonths} months` : `${diffYears} years`
}

export default function SuperAdminOrganizationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isDark } = useTheme()
  
  const [orgData, setOrgData] = useState<any>(null)
  const [subData, setSubData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!id || user?.role !== 'super_admin') return
    try {
      setLoading(true)
      const [orgRes, subRes] = await Promise.all([
        api.get(`/admin/organizations/${id}`),
        api.get(`/admin/organizations/${id}/subscription`)
      ])
      
      if (orgRes.data?.success) setOrgData(orgRes.data.data)
      if (subRes.data?.success) setSubData(subRes.data.data)
        
    } catch (error) {
      console.error('Failed to load org details:', error)
      toast.error('Failed to load organization details.')
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1517' : '#f8fafc' }}>Loading details...</div>
  }

  if (!orgData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0B1517' : '#f8fafc', color: isDark ? '#fff' : '#1e293b' }}>
        <h2>Organization Not Found</h2>
        <button onClick={() => navigate('/admin/super')} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '8px', backgroundColor: '#C99C63', color: '#fff', border: 'none', cursor: 'pointer' }}>Back to Dashboard</button>
      </div>
    )
  }

  const cardBg = isDark ? '#101A1C' : '#ffffff'
  const borderColor = isDark ? '#1e293b' : '#e2e8f0'
  const textPrimary = isDark ? '#ffffff' : '#1e293b'
  const textSecondary = isDark ? '#94a3b8' : '#64748b'
  const gold = '#C99C63'

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1517' : '#f8fafc',
      fontFamily: 'var(--font-sans)',
      color: textPrimary
    }}>
      <Navbar variant="admin" logoUrl={dinelyLogo} />

      <div style={{ padding: '32px 48px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Back Button */}
        <button 
          onClick={() => navigate('/admin/super')}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: textSecondary, cursor: 'pointer', padding: 0, marginBottom: '24px', fontSize: '0.9rem', fontWeight: 600, transition: 'color 0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.color = gold}
          onMouseOut={(e) => e.currentTarget.style.color = textSecondary}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        {/* Header Section */}
        <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, padding: '32px', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '16px', backgroundColor: isDark ? '#1e293b' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: gold, fontSize: '2rem' }}>
              {(orgData.name || 'R')[0].toUpperCase()}
            </div>
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: '2rem', fontWeight: 800 }}>{orgData.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: textSecondary }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Globe size={14} /> {orgData.country || 'Unknown Country'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Joined {new Date(orgData.createdAt).toLocaleDateString()}</span>
                {orgData.isActive ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isDark ? '#34d399' : '#059669' }}><CheckCircle size={14} /> Platform Active</span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444' }}><XCircle size={14} /> Platform Disabled</span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            {getPlanBadge(subData?.plan || orgData.subscriptionPlan, isDark)}
            {getStatusBadge(subData?.status || orgData.subscriptionStatus, isDark)}
          </div>
        </div>

        {/* Analytics Grid */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity color={gold} size={20} /> Usage Analytics
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          <StatsCard label="Total Reservations" value={orgData.counts?.totalReservations || 0} icon={<FileText size={18} />} variant={isDark ? 'dark' : 'light'} />
          <StatsCard label="Total Staff Members" value={orgData.counts?.staff || 0} icon={<Users size={18} />} variant={isDark ? 'dark' : 'light'} />
          <StatsCard label="Total Tables" value={orgData.counts?.tables || 0} icon={<Map size={18} />} variant={isDark ? 'dark' : 'light'} />
          
          <div style={{ backgroundColor: isDark ? '#152326' : '#f9fafb', borderRadius: '16px', padding: '24px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', color: textSecondary }}>
              <Clock size={18} /> <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Time with System</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: textPrimary, letterSpacing: '-0.02em' }}>
              {calculateTimeWithSystem(orgData.createdAt, subData?.status || orgData.subscriptionStatus, subData?.subscription?.updatedAt)}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Organization Info */}
          <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '16px' }}>
              <Building2 color={gold} size={18} /> Organization Details
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.95rem' }}><Mail size={16} color={textSecondary} /> {orgData.email || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.95rem' }}><Phone size={16} color={textSecondary} /> {orgData.phone || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.95rem' }}><Map size={16} color={textSecondary} /> {orgData.address || 'N/A'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setup Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.95rem' }}>
                  {orgData.setupCompleted ? <CheckCircle size={16} color="#10b981" /> : <AlertTriangle size={16} color="#f59e0b" />}
                  {orgData.setupCompleted ? 'Completed' : `Incomplete (Step ${orgData.setupStep || 1})`}
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div style={{ backgroundColor: cardBg, borderRadius: '16px', border: `1px solid ${borderColor}`, padding: '32px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '16px' }}>
              <CreditCard color={gold} size={18} /> Subscription History
            </h3>
            
            {subData?.subscription ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Plan</span>
                  <div style={{ marginTop: '8px' }}>{getPlanBadge(subData.subscription.plan, isDark)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Billing Status</span>
                  <div style={{ marginTop: '8px' }}>{getStatusBadge(subData.subscription.status, isDark)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subscription Started</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.95rem' }}>
                    <Calendar size={16} color={textSecondary} /> {new Date(subData.subscription.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: textSecondary, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {subData.subscription.status === 'canceled' ? 'Canceled On' : 'Current Period Ends'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.95rem' }}>
                    <Clock size={16} color={textSecondary} /> 
                    {new Date(
                      subData.subscription.status === 'canceled' 
                        ? subData.subscription.updatedAt 
                        : subData.subscription.currentPeriodEnd
                    ).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '32px 0', textAlign: 'center', color: textSecondary }}>
                <CreditCard size={32} style={{ opacity: 0.5, margin: '0 auto 16px auto', display: 'block' }} />
                <p>No active subscription record found via Stripe.</p>
                <p style={{ fontSize: '0.85rem' }}>They might be on a lifetime free tier or bypass plan.</p>
              </div>
            )}
          </div>
        </div>

      </div>
      <PoweredByFooter theme={isDark ? 'dark' : 'light'} />
    </div>
  )
}
