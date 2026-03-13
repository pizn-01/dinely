import { Upload, Download } from 'lucide-react'
import { useRef } from 'react'

interface FloorMapTabProps {
  theme: 'dark' | 'light'
}

const sampleData = [
  { table: '#1', capacity: '1-2', area: 'Window', type: 'Window' },
  { table: '#2', capacity: '3-4', area: 'Main Dining', type: 'Main Dining' },
  { table: '#3', capacity: '1-2', area: 'Outdoor', type: 'Outdoor' },
]

export default function FloorMapTab({ theme }: FloorMapTabProps) {
  const isDark = theme === 'dark'
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('Selected file:', file.name)
      // Implementation for parsing CSV would go here
    }
  }

  return (
    <div>
      {/* Hidden File Input */}
      <input 
        type="file" 
        accept=".csv" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {/* Upload Zone */}
      <div
        onClick={handleUploadClick}
        style={{
          border: `1px dashed ${isDark ? '#4b5563' : '#d1d5db'}`, // Darker gray dashed border
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '32px',
          backgroundColor: isDark ? '#161B22' : '#ffffff',
          transition: 'border-color 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = isDark ? '#ffffff' : '#6b7280'}
        onMouseOut={(e) => e.currentTarget.style.borderColor = isDark ? '#4b5563' : '#d1d5db'}
      >
        <Upload size={24} style={{ margin: '0 auto 12px auto', color: isDark ? '#ffffff' : '#4b5563' }} />
        <p style={{ fontWeight: 600, fontSize: '0.875rem', color: isDark ? '#ffffff' : '#1f2937', margin: 0 }}>Upload CSV</p>
        <p style={{ fontSize: '0.75rem', marginTop: '4px', color: isDark ? '#8b949e' : '#6b7280', margin: '4px 0 0 0' }}>
          Table number, capacity,area,type
        </p>
      </div>

      {/* Sample Sheet */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: isDark ? '#ffffff' : '#1f2937' }}>
          Sample Sheet
        </h3>
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: '#C99C63',
          color: '#ffffff',
          fontWeight: 500,
          borderRadius: '8px',
          border: 'none',
          fontSize: '0.875rem',
          cursor: 'pointer'
        }}>
          <Download size={16} />
          Download
        </button>
      </div>

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
                {['Tabel', 'Capacity', 'Area', 'Type'].map((h) => (
                  <th key={h} style={{
                    textAlign: 'left',
                    padding: '16px 24px',
                    fontWeight: 600,
                    color: isDark ? '#ffffff' : '#4b5563'
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row) => (
                <tr
                  key={row.table}
                  style={{
                    borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    transition: 'background-color 0.2s',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = isDark ? '#161B22' : '#f9fafb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#1f2937' }}>
                    {row.table}
                  </td>
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#4b5563' }}>
                    {row.capacity}
                  </td>
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#4b5563' }}>
                    {row.area}
                  </td>
                  <td style={{ padding: '16px 24px', color: isDark ? '#e6edf3' : '#4b5563' }}>
                    {row.type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
