import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getEmployeeDirectory, getDriverCompliance, getLeaveRequests, getAttendance } from '../../../lib/server/hr'

// ─── Glass panel wrapper ────────────────────────────────

function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * HR home view -- overview cards.
 * 4 glass panels: Headcount, Compliance Alerts, Pending Leave, Attendance Today.
 * Geist Mono for all numbers.
 */
export function HRHome() {
  const { t } = useTranslation('hr')

  const { data: employees } = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => getEmployeeDirectory(),
    staleTime: 30_000,
  })

  const { data: compliance } = useQuery({
    queryKey: ['hr', 'compliance'],
    queryFn: () => getDriverCompliance(),
    staleTime: 30_000,
  })

  const { data: leaveRequests } = useQuery({
    queryKey: ['hr', 'leave'],
    queryFn: () => getLeaveRequests(),
    staleTime: 30_000,
  })

  const { data: attendance } = useQuery({
    queryKey: ['hr', 'attendance'],
    queryFn: () => getAttendance(),
    staleTime: 15_000,
  })

  if (!employees || !compliance) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  // Compute stats
  const activeEmployees = employees.filter((e) => e.status === 'active')
  const departments = [...new Set(employees.map((e) => e.department))]
  const deptCounts = departments.map((d) => ({
    department: d,
    count: employees.filter((e) => e.department === d).length,
  }))

  // New this month
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const newThisMonth = employees.filter((e) => e.hireDate >= monthStart).length

  // Compliance alerts
  const expiring = compliance.filter((c) => c.complianceStatus === 'yellow').length
  const expired = compliance.filter((c) => c.complianceStatus === 'red').length

  // Pending leave
  const pendingLeave = leaveRequests?.filter((l) => l.status === 'pending').length ?? 0

  // Attendance
  const clockedIn = attendance?.filter((a) => a.clockIn !== null).length ?? 0
  const totalEmployees = activeEmployees.length

  return (
    <div className="p-6 space-y-6">
      {/* ─── Row 1: Headcount + Compliance ──────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Headcount */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">{t('home.headcount', 'Headcount')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCell label={t('home.total', 'Total')} value={activeEmployees.length} />
            <MetricCell label={t('home.newThisMonth', 'New This Month')} value={newThisMonth} accent="blue" />
          </div>
          <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5">
            <div className="text-xs text-black/50 dark:text-white/50 mb-2">{t('home.byDepartment', 'By Department')}</div>
            <div className="grid grid-cols-3 gap-2">
              {deptCounts.map((d) => (
                <div key={d.department} className="flex items-center justify-between text-xs">
                  <span className="text-black/60 dark:text-white/60">{d.department}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* Compliance Alerts */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">{t('home.complianceAlerts', 'Compliance Alerts')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCell label={t('home.expiring', 'Expiring')} value={expiring} accent="yellow" />
            <MetricCell label={t('home.expired', 'Expired')} value={expired} accent="red" />
          </div>
          {expired > 0 && (
            <div className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {expired} driver(s) blocked from dispatch due to expired compliance
            </div>
          )}
        </GlassPanel>
      </div>

      {/* ─── Row 2: Pending Leave + Attendance ──────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending Leave */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">{t('home.pendingLeave', 'Pending Leave Requests')}</h3>
          <MetricCell label={t('leave.pending', 'Pending')} value={pendingLeave} accent="blue" />
        </GlassPanel>

        {/* Attendance Today */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">{t('home.attendanceToday', 'Attendance Today')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <MetricCell label={t('home.clockedIn', 'Clocked In')} value={clockedIn} accent="green" />
            <MetricCell label={t('home.notClockedIn', 'Not Clocked In')} value={totalEmployees - clockedIn} />
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function MetricCell({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'green' | 'blue' | 'red' | 'yellow'
}) {
  const colorMap = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-[#2563EB]',
    red: 'text-red-600 dark:text-red-400',
    yellow: 'text-amber-600 dark:text-amber-400',
  }

  return (
    <div>
      <div className="text-xs text-black/50 dark:text-white/50 mb-1">{label}</div>
      <div
        className={`text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums ${accent ? colorMap[accent] : ''}`}
      >
        {value}
      </div>
    </div>
  )
}
