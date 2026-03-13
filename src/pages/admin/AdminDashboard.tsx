import { useState } from 'react'
import { Calendar, Users as UsersIcon, LayoutGrid, UserCheck } from 'lucide-react'
import Navbar from '../../components/Navbar'
import StatsCard from '../../components/StatsCard'
import ReservationTab from './tabs/ReservationTab'
import TablesManagementTab from './tabs/TablesManagementTab'
import StaffManagementTab from './tabs/StaffManagementTab'
import FloorMapTab from './tabs/FloorMapTab'

const tabs = [
  { id: 'reservation', label: 'Reservation' },
  { id: 'tables', label: 'Tables Management' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'floormap', label: 'Floor Map' },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('reservation')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const isDark = theme === 'dark'

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: isDark ? '#0B1517' : '#ffffff',
      fontFamily: 'var(--font-sans)',
      transition: 'background-color 0.3s ease'
    }}>
      <Navbar variant="admin" theme={theme} onToggleTheme={toggleTheme} />

      <div style={{ padding: '32px 48px' }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px', // Spacious gap
          marginBottom: '32px'
        }}>
          <StatsCard
            label="Today's Bookings"
            value={3}
            icon={<Calendar size={18} />}
            variant={theme}
          />
          <StatsCard
            label="Seated Now"
            value={3}
            icon={<UsersIcon size={18} />}
            variant={theme}
          />
          <StatsCard
            label="Tables"
            value={16}
            icon={<LayoutGrid size={18} />}
            variant={theme}
          />
          <StatsCard
            label="Total Staff"
            value={5}
            icon={<UserCheck size={18} />}
            variant={theme}
          />
        </div>

        {/* Tab Navigation */}
        <div style={{
          width: '100%',
        }}>
          <div style={{
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
                    ? (isDark ? '#5EEA7A' : '#10b981')
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
                    backgroundColor: isDark ? '#5EEA7A' : '#10b981'
                  }} />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
            {activeTab === 'reservation' && <ReservationTab theme={theme} />}
            {activeTab === 'tables' && <TablesManagementTab theme={theme} />}
            {activeTab === 'staff' && <StaffManagementTab theme={theme} />}
            {activeTab === 'floormap' && <FloorMapTab theme={theme} />}
          </div>
        </div>
      </div>
    </div>
  )
}
