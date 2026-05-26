import React, { useState, useCallback } from 'react'
import { X, BarChart2, Download, RefreshCw, Loader2, TrendingUp, Users, ArrowRight } from 'lucide-react'
import { api } from '../services/api'
import { openNativePicker } from '../utils/nativePicker'

interface AnalyticsReportModalProps {
  restaurantId: string
  restaurantName: string
  onClose: () => void
  isDark?: boolean
}

type Period = 'daily' | 'weekly' | 'bi-weekly' | 'monthly'

interface ReportData {
  meta: {
    period: string
    dateFrom: string
    dateTo: string
    generatedAt: string
    restaurantName: string
  }
  summary: {
    totalReservations: number
    totalCovers: number
    bySource: { walkIn: number; online: number; staff: number; phone: number }
    byStatus: Record<string, number>
    avgPartySize: number
    peakDay: { date: string; count: number } | null
  }
  dailyBreakdown: Array<{
    date: string; total: number; covers: number
    walkIn: number; online: number; staff: number; phone: number
  }>
  reservations: Array<{
    date: string; startTime: string; endTime: string
    guestFirstName: string; guestLastName: string
    phone: string; email: string; partySize: number
    table: string; status: string; source: string
    specialRequests: string; createdAt: string
  }>
}

const formatDate = (d: string) => {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00Z')
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const formatTime = (t: string) => t ? t.substring(0, 5) : '—'

const sourceLabel = (s: string) => {
  if (s === 'walk_in') return 'Walk-in'
  if (s === 'pos') return 'Staff'
  if (s === 'phone') return 'Phone'
  return 'Online'
}

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    completed: 'Completed', seated: 'Seated', confirmed: 'Confirmed',
    pending: 'Pending', cancelled: 'Cancelled', no_show: 'No-show',
    arriving: 'Arriving', noShow: 'No-show',
  }
  return map[s] || s
}

const statusColor = (s: string) => {
  if (s === 'completed') return '#6B9E78'
  if (s === 'seated') return '#38bdf8'
  if (s === 'confirmed' || s === 'arriving') return '#C99C63'
  if (s === 'cancelled' || s === 'no_show' || s === 'noShow') return '#e05252'
  return '#8b949e'
}

const periodLabel = (p: Period, from: string, to: string) => {
  if (p === 'daily') return `Daily — ${formatDate(from)}`
  if (p === 'monthly') return `Monthly — ${formatDate(from).split(' ').slice(1).join(' ')}`
  return `${formatDate(from)} — ${formatDate(to)}`
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.8rem' }}>
        <span style={{ color: 'var(--text-secondary, #8b949e)' }}>{label}</span>
        <span style={{ color: 'var(--text-primary, #e6edf3)', fontWeight: 600 }}>{value} <span style={{ color: 'var(--text-secondary, #8b949e)', fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, backgroundColor: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

export default function AnalyticsReportModal({ restaurantId, restaurantName, onClose, isDark = true }: AnalyticsReportModalProps) {
  const [period, setPeriod] = useState<Period>('weekly')
  const [date, setDate] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async (p: Period = period, d: string = date) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/organizations/${restaurantId}/reservations/reports/analytics`, {
        params: { period: p, date: d }
      })
      setReport(res.data?.data || null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load report. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [restaurantId, period, date])

  const handlePeriodChange = (p: Period) => {
    setPeriod(p)
    fetchReport(p, date)
  }

  const handleDateChange = (d: string) => {
    setDate(d)
    fetchReport(period, d)
  }

  const handleExportCsv = async () => {
    if (!report) return
    try {
      const res = await api.get(`/organizations/${restaurantId}/reservations/export`, {
        params: { startDate: report.meta.dateFrom, endDate: report.meta.dateTo },
        responseType: 'blob'
      })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `dinely-report-${period}-${report.meta.dateFrom}-${report.meta.dateTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // fallback: build CSV from report data
      const headers = ['Date', 'Time', 'Guest Name', 'Phone', 'Email', 'Party Size', 'Table', 'Source', 'Status', 'Special Requests']
      const rows = report.reservations.map(r => [
        r.date, formatTime(r.startTime),
        `${r.guestFirstName} ${r.guestLastName}`.trim() || 'Walk-in',
        r.phone, r.email, r.partySize, r.table,
        sourceLabel(r.source), statusLabel(r.status), r.specialRequests
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dinely-report-${period}-${report.meta.dateFrom}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const bg = 'var(--bg-secondary, #161b22)'
  const border = 'var(--border-color, #30363d)'
  const textPrimary = 'var(--text-primary, #e6edf3)'
  const textSecondary = 'var(--text-secondary, #8b949e)'
  const bgCard = 'var(--bg-card, #1c2128)'
  const gold = '#C99C63'

  const periods: { key: Period; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'bi-weekly', label: 'Bi-weekly' },
    { key: 'monthly', label: 'Monthly' },
  ]

  const s = report?.summary
  const totalSrc = s ? (s.bySource.walkIn + s.bySource.online + s.bySource.staff + s.bySource.phone) : 0
  const totalSt = s ? Object.values(s.byStatus).reduce((a, b) => a + b, 0) : 0

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} className="analytics-no-print" style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 1000,
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1001, width: '95vw', maxWidth: '1100px',
        maxHeight: '92vh', overflowY: 'auto',
        backgroundColor: bg, borderRadius: '16px',
        border: `1px solid ${border}`,
        boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>

        {/* ── Header ── */}
        <div className="analytics-no-print" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '12px',
          padding: '18px 24px 14px',
          borderBottom: `1px solid ${border}`,
          position: 'sticky', top: 0, backgroundColor: bg, zIndex: 10,
        }}>
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: 'rgba(201,156,99,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={18} style={{ color: gold }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: textPrimary }}>Analytics Report</h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: textSecondary }}>{restaurantName}</p>
            </div>
          </div>

          {/* Period + Date + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Period buttons */}
            <div style={{ display: 'flex', borderRadius: '8px', border: `1px solid ${border}`, overflow: 'hidden' }}>
              {periods.map(({ key, label }) => (
                <button key={key} onClick={() => handlePeriodChange(key)} style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  backgroundColor: period === key ? gold : 'transparent',
                  color: period === key ? '#0B1517' : textSecondary,
                  transition: 'all 0.15s',
                }}>{label}</button>
              ))}
            </div>

            <input type="date" className={isDark ? 'native-picker-dark' : undefined} value={date} onClick={openNativePicker} onChange={e => handleDateChange(e.target.value)} style={{
              padding: '6px 10px', borderRadius: '8px', border: `1px solid ${border}`,
              backgroundColor: 'var(--bg-primary, #0d1117)', color: textPrimary, fontSize: '0.8rem', outline: 'none', cursor: 'pointer',
            }} />

            <button onClick={() => fetchReport()} disabled={loading} title="Refresh" style={{
              padding: '6px 10px', borderRadius: '8px', border: `1px solid ${border}`,
              backgroundColor: 'transparent', color: textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}>
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>

            {report && (
              <>
                <button onClick={handleExportCsv} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '8px', border: `1px solid ${border}`,
                  backgroundColor: 'transparent', color: textSecondary, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                }}>
                  <Download size={14} /> Export CSV
                </button>
              </>
            )}

            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: textSecondary, padding: '4px',
              display: 'flex', alignItems: 'center',
            }}><X size={18} /></button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '24px' }}>

          {/* Empty state */}
          {!report && !loading && !error && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: textSecondary }}>
              <BarChart2 size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 600, color: textPrimary }}>Select a period and generate your report</p>
              <p style={{ margin: '8px 0 20px', fontSize: '0.85rem' }}>Click any period button above to load data</p>
              <button onClick={() => fetchReport()} style={{
                padding: '9px 24px', borderRadius: '8px', border: 'none', backgroundColor: gold,
                color: '#0B1517', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px',
              }}>
                <ArrowRight size={15} /> Generate Report
              </button>
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '12px', color: textSecondary }}>
              <Loader2 size={28} className="animate-spin" style={{ color: gold }} />
              <span>Loading report data...</span>
            </div>
          )}

          {error && (
            <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(224,82,82,0.08)', border: '1px solid rgba(224,82,82,0.3)', color: '#e05252', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}

          {report && !loading && (
            <>
              {/* Date range sub-heading */}
              <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: textSecondary }}>
                {periodLabel(period as Period, report.meta.dateFrom, report.meta.dateTo)}
                {report.summary.peakDay && (
                  <> · <TrendingUp size={13} style={{ verticalAlign: 'middle', color: gold }} /> Peak day: <strong style={{ color: textPrimary }}>{formatDate(report.summary.peakDay.date)}</strong> ({report.summary.peakDay.count} bookings)</>
                )}
              </p>

              {/* ── Summary Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }} className="analytics-summary-grid">
                {[
                  { label: 'Total Bookings', value: s!.totalReservations, color: gold },
                  { label: 'Total Covers', value: s!.totalCovers, color: '#6B9E78' },
                  { label: 'Walk-ins', value: s!.bySource.walkIn, color: '#38bdf8' },
                  { label: 'Online', value: s!.bySource.online, color: '#a78bfa' },
                  { label: 'Staff / Phone', value: s!.bySource.staff + s!.bySource.phone, color: '#fb923c' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    padding: '16px', borderRadius: '12px', backgroundColor: bgCard,
                    border: `1px solid ${border}`, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: '0.72rem', color: textSecondary, marginTop: '6px', fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* ── Breakdowns ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* Source */}
                <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: bgCard, border: `1px solid ${border}` }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '0.875rem', fontWeight: 700, color: textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={15} style={{ color: gold }} /> By Source
                  </h3>
                  <BarRow label="Walk-in" value={s!.bySource.walkIn} total={totalSrc} color="#38bdf8" />
                  <BarRow label="Online / App" value={s!.bySource.online} total={totalSrc} color="#a78bfa" />
                  <BarRow label="Staff (POS)" value={s!.bySource.staff} total={totalSrc} color="#fb923c" />
                  <BarRow label="Phone" value={s!.bySource.phone} total={totalSrc} color="#f472b6" />
                </div>
                {/* Status */}
                <div style={{ padding: '20px', borderRadius: '12px', backgroundColor: bgCard, border: `1px solid ${border}` }}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '0.875rem', fontWeight: 700, color: textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={15} style={{ color: gold }} /> By Status
                  </h3>
                  {[
                    { key: 'completed', label: 'Completed', color: '#6B9E78' },
                    { key: 'seated', label: 'Seated', color: '#38bdf8' },
                    { key: 'confirmed', label: 'Confirmed', color: '#C99C63' },
                    { key: 'arriving', label: 'Arriving', color: '#fbbf24' },
                    { key: 'cancelled', label: 'Cancelled', color: '#e05252' },
                    { key: 'noShow', label: 'No-show', color: '#9e2b2b' },
                  ].map(({ key, label, color }) => (
                    <BarRow key={key} label={label} value={s!.byStatus[key] || 0} total={totalSt} color={color} />
                  ))}
                </div>
              </div>

              {/* ── Daily Breakdown ── */}
              {report.dailyBreakdown.length > 1 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 700, color: textPrimary }}>Daily Breakdown</h3>
                  <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${border}` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: bgCard }}>
                          {['Date', 'Total', 'Covers', 'Walk-in', 'Online', 'Staff', 'Phone'].map(h => (
                            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {report.dailyBreakdown.map((row, i) => (
                          <tr key={row.date} style={{ borderBottom: `1px solid ${border}`, backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td style={{ padding: '9px 14px', color: textPrimary, fontWeight: 500 }}>{formatDate(row.date)}</td>
                            <td style={{ padding: '9px 14px', color: gold, fontWeight: 700 }}>{row.total}</td>
                            <td style={{ padding: '9px 14px', color: textPrimary }}>{row.covers}</td>
                            <td style={{ padding: '9px 14px', color: '#38bdf8' }}>{row.walkIn}</td>
                            <td style={{ padding: '9px 14px', color: '#a78bfa' }}>{row.online}</td>
                            <td style={{ padding: '9px 14px', color: '#fb923c' }}>{row.staff}</td>
                            <td style={{ padding: '9px 14px', color: '#f472b6' }}>{row.phone}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Reservation Detail Table ── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: textPrimary }}>
                    All Reservations <span style={{ color: textSecondary, fontWeight: 400 }}>({report.reservations.length})</span>
                  </h3>
                </div>
                <div style={{ overflowX: 'auto', borderRadius: '12px', border: `1px solid ${border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: bgCard }}>
                        {['Date', 'Time', 'Guest', 'Phone', 'Email', 'Pax', 'Table', 'Source', 'Status', 'Special Requests'].map(h => (
                          <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.reservations.map((r, i) => {
                        const guestName = `${r.guestFirstName} ${r.guestLastName}`.trim() || 'Walk-in'
                        return (
                          <tr key={i} style={{ borderBottom: `1px solid ${border}`, backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td style={{ padding: '8px 12px', color: textPrimary, whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
                            <td style={{ padding: '8px 12px', color: textSecondary, whiteSpace: 'nowrap' }}>{formatTime(r.startTime)}</td>
                            <td style={{ padding: '8px 12px', color: textPrimary, whiteSpace: 'nowrap' }}>{guestName}</td>
                            <td style={{ padding: '8px 12px', color: textSecondary }}>{r.phone || '—'}</td>
                            <td style={{ padding: '8px 12px', color: textSecondary, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email || '—'}</td>
                            <td style={{ padding: '8px 12px', color: textPrimary, textAlign: 'center' }}>{r.partySize}</td>
                            <td style={{ padding: '8px 12px', color: textSecondary }}>{r.table}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                                backgroundColor: r.source === 'walk_in' ? 'rgba(56,189,248,0.12)' : r.source === 'pos' ? 'rgba(251,146,60,0.12)' : 'rgba(167,139,250,0.12)',
                                color: r.source === 'walk_in' ? '#38bdf8' : r.source === 'pos' ? '#fb923c' : '#a78bfa',
                              }}>
                                {sourceLabel(r.source)}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                fontSize: '0.72rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                                backgroundColor: `${statusColor(r.status)}18`,
                                color: statusColor(r.status),
                              }}>
                                {statusLabel(r.status)}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: textSecondary, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.specialRequests || '—'}
                            </td>
                          </tr>
                        )
                      })}
                      {report.reservations.length === 0 && (
                        <tr>
                          <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: textSecondary }}>No reservations in this period</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Print avg line */}
              <p style={{ marginTop: '16px', fontSize: '0.78rem', color: textSecondary, textAlign: 'right' }}>
                Avg. party size: <strong style={{ color: textPrimary }}>{s!.avgPartySize}</strong>
              </p>
            </>
          )}
        </div>
      </div>

      {/* Mobile grid override */}
      <style>{`
        @media (max-width: 680px) {
          .analytics-summary-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  )
}
