import { useState, useEffect, useCallback } from 'react'
import { Calendar, Users as UsersIcon, LayoutGrid, UserCheck } from 'lucide-react'
import { api } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useRealtimeReservations } from '../../hooks/useRealtimeReservations'
import Navbar from '../../components/Navbar'
import StatsCard from '../../components/StatsCard'
import ReservationTab from './tabs/ReservationTab'
import TablesManagementTab from './tabs/TablesManagementTab'
import StaffManagementTab from './tabs/StaffManagementTab'
import WaitingListTab from './tabs/WaitingListTab'
import FloorMapTab from './tabs/FloorMapTab'
import PoweredByFooter from '../../components/PoweredByFooter'
import SettingsTab from './tabs/SettingsTab'
import SupportTab from './tabs/SupportTab'

const tabs = [
  { id: 'reservation', label: 'Reservation' },
  { id: 'tables', label: 'Tables Management' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'waitinglist', label: 'Waiting List' },
  { id: 'floormap', label: 'Floor Map' },
  { id: 'support', label: 'Support & Feedback' },
  { id: 'settings', label: 'Settings' },
]

export default function AdminDashboard() {
  const { user } = useAuth()
  const orgId = user?.restaurantId || ''
  const [activeTab, setActiveTab] = useState('reservation')
  const { isDark } = useTheme()
  const [orgData, setOrgData] = useState<any>(null)
  const [stats, setStats] = useState({
    todayBookings: 0,
    seatedNow: 0,
    totalTables: 0,
    totalStaff: 0,
    serverToday: new Date().toISOString().split('T')[0],
    openingTime: '12:00',
    closingTime: '22:00'
  })

  const fetchStats = useCallback(async () => {
    if (!orgId) return
    try {
      const [statsRes, orgRes] = await Promise.all([
        api.get(`/organizations/${orgId}/dashboard/stats`),
        api.get(`/organizations/${orgId}`)
      ])
      
      if (orgRes.data.data) {
        setOrgData(orgRes.data.data)
      }
      
      if (statsRes.data.data) {
        setStats({
          todayBookings: statsRes.data.data.today?.reservations || 0,
          seatedNow: statsRes.data.data.today?.seatedNow || 0,
          totalTables: statsRes.data.data.totals?.activeTables || 0,
          totalStaff: statsRes.data.data.totals?.totalStaff || 0,
          serverToday: statsRes.data.data.today?.date || new Date().toISOString().split('T')[0],
          openingTime: statsRes.data.data.today?.openingTime || '12:00',
          closingTime: statsRes.data.data.today?.closingTime || '22:00'
        })
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    fetchStats()
    // Auto-poll every 15 seconds to keep the system updated
    const interval = setInterval(fetchStats, 15_000)
    return () => clearInterval(interval)
  }, [orgId, fetchStats])

  // Real-time sync: instant refresh on any reservation event
  useRealtimeReservations(orgId, fetchStats)


  if (!user || !orgId) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: isDark ? '#0B1517' : '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isDark ? '#ffffff' : '#1f2937',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <Navbar variant="admin" userName={user?.name} userEmail={user?.email} userRole={user?.role} orgSlug={orgData?.slug} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h2>Access Denied</h2>
          <p>You must be logged in with a restaurant account to access the admin dashboard.</p>
          <a href="/login" style={{ color: '#C99C63', textDecoration: 'none', marginTop: '16px', fontWeight: 600 }}>Go to Login</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1517' : '#ffffff',
      fontFamily: 'var(--font-sans)',
      transition: 'background-color 0.3s ease'
    }}>
      <Navbar variant="admin" logoUrl={orgData?.logoUrl} userName={user?.name} userEmail={user?.email} userRole={user?.role} orgSlug={orgData?.slug} />

      <div className="res-admin-container" style={{ padding: '32px 48px' }}>
        {/* Stats Cards */}
        <div className="res-admin-stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px', // Spacious gap
          marginBottom: '32px'
        }}>
          <StatsCard
            label="Today's Bookings"
            value={stats.todayBookings}
            icon={<Calendar size={18} />}
            variant={isDark ? 'dark' : 'light'}
          />
          <StatsCard
            label="Seated Now"
            value={stats.seatedNow}
            icon={<UsersIcon size={18} />}
            variant={isDark ? 'dark' : 'light'}
          />
          <StatsCard
            label="Tables"
            value={stats.totalTables}
            icon={<LayoutGrid size={18} />}
            variant={isDark ? 'dark' : 'light'}
          />
          <StatsCard
            label="Total Staff"
            value={stats.totalStaff}
            icon={<UserCheck size={18} />}
            variant={isDark ? 'dark' : 'light'}
          />
        </div>

        {/* Tab Navigation */}
        <div style={{
          width: '100%',
        }}>
          <div className="res-admin-tabs" style={{
            display: 'flex',
            gap: '32px', // wide gap between tabs
            borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            marginBottom: '24px' // Add space below tabs
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '16px 0',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  position: 'relative',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: activeTab === tab.id
                    ? '#C99C63'
                    : (isDark ? '#8b949e' : '#6b7280'),
                  transition: 'color 0.2s'
                }}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: '#C99C63'
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            {activeTab === 'reservation' && <ReservationTab theme={isDark ? 'dark' : 'light'} orgId={orgId} serverToday={stats.serverToday} openingTime={stats.openingTime} closingTime={stats.closingTime} />}
            {activeTab === 'tables' && <TablesManagementTab theme={isDark ? 'dark' : 'light'} orgId={orgId} />}
            {activeTab === 'staff' && <StaffManagementTab theme={isDark ? 'dark' : 'light'} orgId={orgId} />}
            {activeTab === 'waitinglist' && <WaitingListTab theme={isDark ? 'dark' : 'light'} orgId={orgId} serverToday={stats.serverToday} />}
            {activeTab === 'floormap' && <FloorMapTab theme={isDark ? 'dark' : 'light'} orgId={orgId} />}
            {activeTab === 'support' && <SupportTab theme={isDark ? 'dark' : 'light'} orgId={orgId} />}
            {activeTab === 'settings' && <SettingsTab theme={isDark ? 'dark' : 'light'} orgId={orgId} />}
          </div>
        </div>
      </div>
      <PoweredByFooter theme={isDark ? 'dark' : 'light'} />
    </div>
  )
}
