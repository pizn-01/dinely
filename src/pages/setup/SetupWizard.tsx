import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../../components/Navbar'
import ProgressBar from '../../components/ProgressBar'
import { X, Upload, Download, Eye, EyeOff } from 'lucide-react'

const TOTAL_STEPS = 4

export default function SetupWizard() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)

  // Step 1: Restaurant Details
  const [details, setDetails] = useState({
    address: '123 Main Street, London',
    openingTime: '17:00',
    closingTime: '22:00',
  })

  // Step 3: Table Rules
  const [rules, setRules] = useState({
    mergeable: false,
    walkIns: false,
  })

  // Step 4: Team
  const [teamEmail, setTeamEmail] = useState('john@example.com')
  const [teamRole, setTeamRole] = useState('Manager')
  const [invitedMembers, setInvitedMembers] = useState([
    { email: 'john@example.com', role: 'Manager' },
  ])

  const percentage = Math.round((currentStep / TOTAL_STEPS) * 100)

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate('/admin')
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addMember = () => {
    if (teamEmail) {
      setInvitedMembers([...invitedMembers, { email: teamEmail, role: teamRole }])
      setTeamEmail('')
    }
  }

  const removeMember = (index: number) => {
    setInvitedMembers(invitedMembers.filter((_, i) => i !== index))
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Restaurant Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>Address</label>
                <input
                  type="text"
                  value={details.address}
                  onChange={(e) => setDetails({ ...details, address: e.target.value })}
                  placeholder="123 Main Street, London"
                  style={{
                    width: '100%',
                    backgroundColor: '#161B22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    color: '#8b949e',
                    fontSize: '1rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>Opening Time</label>
                  <input
                    type="text"
                    value={details.openingTime}
                    onChange={(e) => setDetails({ ...details, openingTime: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#161B22',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      padding: '16px 20px',
                      color: '#ffffff',
                      fontSize: '1.125rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: '#ffffff', marginBottom: '12px' }}>Closing Time</label>
                  <input
                    type="text"
                    value={details.closingTime}
                    onChange={(e) => setDetails({ ...details, closingTime: e.target.value })}
                    style={{
                      width: '100%',
                      backgroundColor: '#161B22',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      padding: '16px 20px',
                      color: '#ffffff',
                      fontSize: '1.125rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '24px' }}>Floor Map Setup</h2>
            <div style={{
              border: '2px dashed #30363d',
              borderRadius: '12px',
              padding: '48px',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '24px',
              backgroundColor: 'transparent'
            }}>
              <Upload size={24} style={{ color: '#8b949e', margin: '0 auto 12px' }} />
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>Upload CSV</p>
              <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '4px' }}>Table number, capacity, area, type</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#ffffff', flex: 1 }}>Sample Sheet</h3>
              <button style={{
                backgroundColor: '#C99C63',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Download size={14} /> Download
              </button>
            </div>
            <div style={{ backgroundColor: '#161B22', border: '1px solid #30363d', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                <tr style={{ borderBottom: '1px solid #30363d' }}>
                  {['Table', 'Capacity', 'Area', 'Type'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 500, color: '#8b949e' }}>{h}</th>
                  ))}
                </tr>
                </thead>
                <tbody>
                  {[
                    { t: '#1', c: '1-2', a: 'Window', ty: 'Window' },
                    { t: '#2', c: '3-4', a: 'Main Dining', ty: 'Main Dining' },
                    { t: '#3', c: '1-2', a: 'Outdoor', ty: 'Outdoor' },
                  ].map(r => (
                    <tr key={r.t} style={{ borderBottom: '1px solid #30363d' }}>
                      <td style={{ padding: '14px 16px', color: '#8b949e' }}>{r.t}</td>
                      <td style={{ padding: '14px 16px', color: '#8b949e' }}>{r.c}</td>
                      <td style={{ padding: '14px 16px', color: '#8b949e' }}>{r.a}</td>
                      <td style={{ padding: '14px 16px', color: '#8b949e' }}>{r.ty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )

      case 3:
        return (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '24px' }}>Table Rules</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { key: 'mergeable' as const, title: 'Mergeable Tables', desc: 'Allow combining adjacent tables for large parties' },
                { key: 'walkIns' as const, title: 'Walk-ins Allowed', desc: 'Allow staff to seat guests without reservations' },
              ].map((rule) => (
                <div key={rule.key} style={{
                  border: '1px solid #30363d',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ffffff' }}>{rule.title}</h3>
                    <p style={{ fontSize: '0.75rem', color: '#8b949e', marginTop: '4px' }}>{rule.desc}</p>
                  </div>
                  <button
                    onClick={() => setRules({ ...rules, [rule.key]: !rules[rule.key] })}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '999px',
                      backgroundColor: rules[rule.key] ? '#5EEA7A' : '#30363d',
                      border: 'none',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#ffffff',
                      position: 'absolute',
                      top: '2px',
                      left: rules[rule.key] ? '22px' : '2px',
                      transition: 'left 0.2s'
                    }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )

      case 4:
        return (
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '24px' }}>Invite Your Team</h2>
            <div style={{ display: 'flex', alignItems: 'end', gap: '12px', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>Team Member Email</label>
                <input
                  type="email"
                  value={teamEmail}
                  onChange={(e) => setTeamEmail(e.target.value)}
                  placeholder="john@example.com"
                  style={{
                    width: '100%',
                    backgroundColor: '#161B22',
                    border: '1px solid #30363d',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ width: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>Role</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={teamRole}
                    onChange={(e) => setTeamRole(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#161B22',
                      border: '1px solid #30363d',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                      appearance: 'none',
                    }}
                  >
                    <option>Manager</option>
                    <option>Host</option>
                    <option>Server</option>
                  </select>
                </div>
              </div>
              <button
                onClick={addMember}
                style={{
                  backgroundColor: '#C99C63',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Add
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {invitedMembers.map((member, i) => (
                <div key={i} style={{
                  border: '1px solid #30363d',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#161B22',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8b949e'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <span style={{ fontSize: '0.875rem', color: '#ffffff' }}>{member.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      padding: '4px 12px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171'
                    }}>
                      {member.role}
                    </span>
                    <button
                      onClick={() => removeMember(i)}
                      style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', padding: '4px' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B1517',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <Navbar variant="setup" />

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '0 16px'
      }}>
        {/* Header Title */}
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: '#ffffff',
          marginTop: '60px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          Restaurant Setup
        </h1>

        {/* Progress Bar Container */}
        <div style={{ width: '100%', maxWidth: '900px', marginBottom: '24px' }}>
          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} percentage={percentage} />
        </div>

        {/* Main Step Content Card */}
        <div style={{
          width: '100%',
          maxWidth: '900px',
          backgroundColor: '#101A1C',
          border: '1px solid #30363d',
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          {renderStep()}
        </div>

        {/* Footer Navigation */}
        <div style={{ width: '100%', maxWidth: '900px', paddingBottom: '48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              style={{
                backgroundColor: 'transparent',
                color: currentStep === 1 ? '#30363d' : '#8b949e',
                border: '1px solid #30363d',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: currentStep === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Back
            </button>

            {/* Pagination Dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div key={i} style={{
                  width: i + 1 === currentStep ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '999px',
                  backgroundColor: i + 1 === currentStep ? '#C99C63' : '#30363d',
                  transition: 'all 0.3s ease'
                }} />
              ))}
            </div>

            <button
              onClick={nextStep}
              style={{
                backgroundColor: '#C99C63',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 48px',
                fontSize: '1.rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {currentStep === TOTAL_STEPS ? 'Complete Setup' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
