import { useState, useEffect } from 'react'
import { Search, MoreVertical, Plus, X, Trash2 } from 'lucide-react'
import { api } from '../../../services/api'
import { toast } from 'react-hot-toast'
import StatusBadge from '../../../components/StatusBadge'

interface StaffManagementTabProps {
  theme: 'dark' | 'light'
  orgId: string
}

export default function StaffManagementTab({ theme, orgId }: StaffManagementTabProps) {
  const isDark = theme === 'dark'
  const [staffList, setStaffList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Invite Modal State
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('host')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [demoInviteLink, setDemoInviteLink] = useState('')
  
  // Delete Confirmation State
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<any>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchStaff = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/organizations/${orgId}/staff`)
      if (data.data) {
        setStaffList(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail) return
    try {
      setInviteLoading(true)
      const response = await api.post(`/organizations/${orgId}/staff/invite`, {
        email: inviteEmail,
        role: inviteRole
      })
      
      const token = response.data?.data?.inviteToken
      if (token) {
        setDemoInviteLink(`${window.location.origin}/accept-invite?token=${token}`)
      }
      
      toast.success('Invitation sent! The staff member will receive an email with instructions to set up their account.')
      setShowInvite(false)
      setInviteEmail('')
      fetchStaff()
    } catch (err: any) {
      console.error('Failed to invite staff:', err)
      const message = err.response?.data?.error || 'Failed to invite staff.'
      toast.error(message)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDeleteMember) return
    try {
      setDeleteLoading(true)
      await api.delete(`/organizations/${orgId}/staff/${confirmDeleteMember.id}`)
      setStaffList(staffList.filter(s => s.id !== confirmDeleteMember.id))
      setConfirmDeleteMember(null)
    } catch (err) {
      console.error('Failed to remove staff:', err)
      toast.error('Failed to remove staff member. Ensure you have the right permissions.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div>
      {demoInviteLink && (
        <div style={{ padding: '16px', marginBottom: '24px', backgroundColor: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '12px', color: '#eab308' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>Demo Mode: Temporary Invite Link</div>
          <p style={{ fontSize: '0.875rem', marginBottom: '8px' }}>Since email delivery is not configured for this demo, copy this link manually to accept the invitation in an incognito window.</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input type="text" readOnly value={demoInviteLink} style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.2)', backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#ffffff', color: isDark ? '#ffffff' : '#1f2937' }} />
            <button onClick={() => { navigator.clipboard.writeText(demoInviteLink); toast.success('Copied to clipboard!') }} style={{ padding: '8px 16px', backgroundColor: '#eab308', color: '#ffffff', borderRadius: '6px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Copy</button>
            <button onClick={() => setDemoInviteLink('')} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#eab308', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.5)', fontWeight: 600, cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Top Control Bar */}
      <div className="res-admin-tab-header res-staff-controls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
        <div style={{ position: 'relative', width: '400px', maxWidth: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: isDark ? '#8b949e' : '#6b7280' }} />
          <input
            type="text"
            placeholder="Search name, phone, email or skills"
            style={{
              width: '100%',
              padding: '10px 16px 10px 40px',
              backgroundColor: isDark ? '#161B22' : '#ffffff',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '8px',
              color: isDark ? '#ffffff' : '#1f2937',
              fontSize: '0.875rem'
            }}
          />
        </div>
        <select style={{
          padding: '10px 16px',
          backgroundColor: isDark ? '#161B22' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '8px',
          color: isDark ? '#ffffff' : '#1f2937',
          fontSize: '0.875rem',
          cursor: 'pointer',
          appearance: 'none', // to allow custom styling if needed, though simple select is fine for MVP
          minWidth: '150px'
        }}>
          <option>All Roles</option>
          <option>Manager</option>
          <option>Host</option>
          <option>Viewer</option>
        </select>
        <button 
          onClick={() => setShowInvite(true)}
          style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          backgroundColor: '#C99C63',
          color: '#ffffff',
          fontWeight: 600,
          borderRadius: '8px',
          border: 'none',
          fontSize: '0.875rem',
          cursor: 'pointer'
        }}>
          <Plus size={16} />
          Invite Staff
        </button>
      </div>

      {/* Table Container */}
      <div style={{
        borderRadius: '12px',
        border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        backgroundColor: 'transparent',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{
                borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                backgroundColor: isDark ? '#101A1C' : '#f9fafb'
              }}>
                {['Name', 'Email', 'Last Active', 'Status', ''].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left',
                    padding: '16px 24px',
                    fontWeight: 500,
                    color: isDark ? '#ffffff' : '#4b5563' // Bright header text as per design
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: isDark ? '#8b949e' : '#6b7280' }}>
                    Loading staff members...
                  </td>
                </tr>
              )}
              {!loading && staffList.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: isDark ? '#8b949e' : '#6b7280' }}>
                    No staff members found.
                  </td>
                </tr>
              )}
              {!loading && Array.isArray(staffList) && staffList.map((member: any) => (
                <tr
                  key={member.id}
                  style={{
                    borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    transition: 'background-color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#161B22' : '#f9fafb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#1f2937' }}>
                    {member.user?.name || member.name || member.email?.split('@')[0]}
                  </td>
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#4b5563' }}>
                    {member.email}
                  </td>
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#4b5563' }}>
                    {member.lastActive ? new Date(member.lastActive).toLocaleString('en-GB') : 'Never'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <StatusBadge status={member.role || member.status || 'viewer'} />
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDeleteMember(member)
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        marginLeft: 'auto'
                      }}
                    >
                      <Trash2 size={16} /> <span>Remove</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: isDark ? '#101A1C' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>Invite Staff</h3>
              <button 
                onClick={() => setShowInvite(false)}
                style={{ background: 'none', border: 'none', color: isDark ? '#8b949e' : '#6b7280', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#d1d5db' : '#374151', marginBottom: '8px' }}>
                  Email Address
                </label>
                <input 
                  type="email" 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="employee@restaurant.com"
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '8px',
                    color: isDark ? '#ffffff' : '#111827',
                    boxSizing: 'border-box'
                  }} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: isDark ? '#d1d5db' : '#374151', marginBottom: '8px' }}>
                  Role
                </label>
                <select 
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    backgroundColor: isDark ? '#161B22' : '#ffffff',
                    border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                    borderRadius: '8px',
                    color: isDark ? '#ffffff' : '#111827',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="manager">Manager</option>
                  <option value="host">Host</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>

              <button 
                onClick={handleInvite}
                disabled={inviteLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: inviteLoading ? '#9ca3af' : '#C99C63',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: inviteLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteMember && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 60
        }}>
          <div style={{
            backgroundColor: isDark ? '#101A1C' : '#ffffff',
            border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem', fontWeight: 600, color: isDark ? '#ffffff' : '#111827' }}>Remove Staff Member</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '0.875rem', color: isDark ? '#d1d5db' : '#4b5563', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>{confirmDeleteMember.name || confirmDeleteMember.email || 'this member'}</strong>? They will lose access to the restaurant's dashboard immediately.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setConfirmDeleteMember(null)}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'transparent',
                  border: `1px solid ${isDark ? '#30363d' : '#d1d5db'}`,
                  color: isDark ? '#e6edf3' : '#374151',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
              >Cancel</button>
              <button 
                onClick={handleDelete}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
