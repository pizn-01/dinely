import { useState, useEffect } from 'react'
import { AlertTriangle, Info, X } from 'lucide-react'
import { api } from '../services/api'

export default function GlobalBanner() {
  const [broadcast, setBroadcast] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchBroadcasts = async () => {
      try {
        const { data } = await api.get('/public/broadcasts/active')
        if (data?.data && data.data.length > 0) {
          // just show the latest active one
          setBroadcast(data.data[0])
        }
      } catch (err) {
        console.error('Failed to fetch active broadcasts', err)
      }
    }
    fetchBroadcasts()

    // Poll every 5 minutes in case a new critical alert goes out
    const id = setInterval(fetchBroadcasts, 300000)
    return () => clearInterval(id)
  }, [])

  if (!broadcast || dismissed) return null

  const isWarning = broadcast.type === 'warning'

  return (
    <div style={{
      width: '100%',
      backgroundColor: isWarning ? '#fef3c7' : '#e0f2fe',
      color: isWarning ? '#b45309' : '#0369a1',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      position: 'relative',
      zIndex: 1000,
      borderBottom: `1px solid ${isWarning ? '#fde68a' : '#bae6fd'}`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {isWarning ? <AlertTriangle size={18} /> : <Info size={18} />}
        <strong>{broadcast.title}:</strong> {broadcast.message}
      </div>
      <button 
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute',
          right: '16px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.7,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <X size={16} />
      </button>
    </div>
  )
}
