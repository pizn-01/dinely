import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { staffLoginPath, staffTablesPath } from '../utils/restaurantRoutes'

/**
 * Old bookmark `/staff/tables` → canonical `/staff/:slug/tables` using stored org slug.
 */
export default function LegacyStaffTablesRedirect() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary, #8b949e)' }}>
        Loading…
      </div>
    )
  }

  const slug = user?.restaurantSlug
  if (!slug) {
    return <Navigate to={staffLoginPath()} replace />
  }

  return <Navigate to={staffTablesPath(slug)} replace />
}
