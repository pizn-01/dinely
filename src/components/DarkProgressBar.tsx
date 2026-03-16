interface DarkProgressBarProps {
  currentStep: number
  totalSteps: number
  percentage: number
}

export default function DarkProgressBar({ currentStep, totalSteps, percentage }: DarkProgressBarProps) {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#8b949e', fontFamily: 'Inter, system-ui, sans-serif' }}>
          Step {currentStep} of {totalSteps}
        </span>
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#8b949e', fontFamily: 'Inter, system-ui, sans-serif' }}>
          {percentage}% Complete
        </span>
      </div>
      <div style={{ width: '100%', height: '6px', backgroundColor: '#1e2d30', borderRadius: '4px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            backgroundColor: '#6B9E78',
            borderRadius: '4px',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            width: `${percentage}%`
          }}
        />
      </div>
    </div>
  )
}
