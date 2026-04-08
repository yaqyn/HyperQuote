import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getEmployeeDirectory, getDriverCompliance, getLeaveRequests, getAttendance } from '../../../lib/server/hr'
import { useHRStore } from '../../../stores/hr'

/**
 * HR Home — "The Board"
 * PENDING ACTIONS first (leave requests, expiring docs, attendance exceptions).
 * Then today's stats and roster below.
 */
export function HRHome() {
  const { t } = useTranslation('hr')
  const setActiveTab = useHRStore((s) => s.setActiveTab)

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
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // ─── Pending actions ────────────────────────────────────
  const pendingLeave = leaveRequests?.filter((l) => l.status === 'pending') ?? []
  const expiringDocs = compliance.filter((c) => c.complianceStatus === 'yellow')
  const expiredDocs = compliance.filter((c) => c.complianceStatus === 'red')

  // Late arrivals = clocked in after expected start (using overtime > 0 as proxy)
  const lateArrivals = attendance?.filter((a) => a.clockIn !== null && a.overtime > 0) ?? []

  // Absent today (active employees who haven't clocked in and aren't on leave)
  const activeEmployees = employees.filter((e) => e.status === 'active')
  const totalActive = activeEmployees.length
  const clockedIn = attendance?.filter((a) => a.clockIn !== null).length ?? 0
  const onLeaveCount = leaveRequests?.filter((l) => l.status === 'approved').length ?? 0
  const absentCount = Math.max(0, totalActive - clockedIn - onLeaveCount)

  const pendingActions = [
    ...(pendingLeave.length > 0
      ? [{
          id: 'leave',
          count: pendingLeave.length,
          label: t('home.pendingLeave', '{{count}} leave request pending', { count: pendingLeave.length }),
          detail: pendingLeave.map((l) => `${l.employeeName} — ${l.type} (${l.startDate} to ${l.endDate})`),
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-500/10',
          dot: 'bg-amber-500',
          tab: 'time' as const,
        }]
      : []),
    ...(expiredDocs.length > 0
      ? [{
          id: 'expired',
          count: expiredDocs.length,
          label: t('home.expiredDocs', '{{count}} driver blocked — expired documents', { count: expiredDocs.length }),
          detail: expiredDocs.map((d) => `${d.driverName} — cannot dispatch`),
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-500/10',
          dot: 'bg-red-500',
          tab: 'time' as const,
        }]
      : []),
    ...(expiringDocs.length > 0
      ? [{
          id: 'expiring',
          count: expiringDocs.length,
          label: t('home.expiringDocs', '{{count}} document expiring within 30 days', { count: expiringDocs.length }),
          detail: expiringDocs.map((d) => `${d.driverName} — review needed`),
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-500/10',
          dot: 'bg-amber-500',
          tab: 'time' as const,
        }]
      : []),
    ...(absentCount > 0
      ? [{
          id: 'absent',
          count: absentCount,
          label: t('home.absentToday', '{{count}} absent today', { count: absentCount }),
          detail: [] as string[],
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-500/10',
          dot: 'bg-red-500',
          tab: 'time' as const,
        }]
      : []),
    ...(lateArrivals.length > 0
      ? [{
          id: 'late',
          count: lateArrivals.length,
          label: t('home.lateToday', '{{count}} late arrival today', { count: lateArrivals.length }),
          detail: lateArrivals.map((a) => `${a.employeeName} — clocked in ${a.clockIn}`),
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-500/10',
          dot: 'bg-amber-500',
          tab: 'time' as const,
        }]
      : []),
  ]

  // ─── Today's stats ──────────────────────────────────────
  const lateCount = lateArrivals.length
  const stats = [
    {
      label: t('home.present', 'Present'),
      value: clockedIn,
      color: 'text-green-600 dark:text-green-400',
    },
    {
      label: t('home.absent', 'Absent'),
      value: absentCount,
      color: absentCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-subtle)]',
    },
    {
      label: t('home.onLeave', 'On Leave'),
      value: onLeaveCount,
      color: onLeaveCount > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]',
    },
    {
      label: t('home.late', 'Late'),
      value: lateCount,
      color: lateCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-text-subtle)]',
    },
  ]

  // ─── Who's in/out roster ────────────────────────────────
  const statusList = activeEmployees.map((emp) => {
    const record = attendance?.find((a) => a.employeeId === emp.id)
    const isOnLeave = leaveRequests?.some((l) => l.employeeId === emp.id && l.status === 'approved')

    let status: 'present' | 'absent' | 'leave' | 'late'
    if (isOnLeave) {
      status = 'leave'
    } else if (record?.clockIn) {
      status = record.overtime > 0 ? 'late' : 'present'
    } else {
      status = 'absent'
    }

    return { id: emp.id, name: emp.name, role: emp.role, department: emp.department, status, clockIn: record?.clockIn ?? null }
  })

  const sortOrder: Record<string, number> = { absent: 0, late: 1, leave: 2, present: 3 }
  statusList.sort((a, b) => sortOrder[a.status] - sortOrder[b.status])

  const dotColor: Record<string, string> = {
    present: 'bg-green-500',
    absent: 'bg-red-500',
    leave: 'bg-[var(--color-primary)]',
    late: 'bg-amber-500',
  }

  return (
    <div className="p-5 space-y-6">
      {/* ── Pending Actions (PRIMARY) ──────────────────── */}
      {pendingActions.length > 0 && (
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
            {t('home.pendingActions', 'Pending Actions')}
          </div>
          <div className="flex flex-col gap-2">
            {pendingActions.map((action) => (
              <motion.button
                key={action.id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                onClick={() => setActiveTab(action.tab)}
                className={`flex items-start gap-3 rounded-xl ${action.bg} px-4 py-3 text-start cursor-pointer transition-all hover:opacity-80 w-full`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${action.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums ${action.color}`}>
                      {action.count}
                    </span>
                    <span className={`text-sm font-medium ${action.color}`}>
                      {action.label}
                    </span>
                  </div>
                  {action.detail.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {action.detail.slice(0, 3).map((line) => (
                        <div key={line} className="text-xs text-[var(--color-text-muted)] truncate">{line}</div>
                      ))}
                      {action.detail.length > 3 && (
                        <div className="text-[11px] text-[var(--color-text-subtle)]">
                          +{action.detail.length - 3} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {pendingActions.length === 0 && (
        <div className="rounded-xl bg-green-500/5 px-4 py-3">
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            {t('home.allClear', 'All clear — no pending actions')}
          </span>
        </div>
      )}

      {/* ── Today's Stats (SECONDARY) ─────────────────── */}
      <div className="flex items-baseline gap-8 border-b border-[var(--color-border)] pb-5">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
              {stat.label}
            </div>
            <div className={`text-3xl font-[family-name:var(--font-geist-mono)] tabular-nums ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Who's in/out today ────────────────────────── */}
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
          {t('home.todayRoster', 'Today\'s Roster')}
        </div>

        <div className="flex flex-col">
          {statusList.map((person) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="flex items-center gap-3 px-2 py-2 -mx-2 rounded-lg hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor[person.status]}`} />
              <span className="text-sm text-[var(--color-text)] w-40 truncate">{person.name}</span>
              <span className="text-xs text-[var(--color-text-subtle)] w-28 truncate">{person.role}</span>
              <span className="text-xs text-[var(--color-text-subtle)] flex-1 truncate">{person.department}</span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)] w-12 text-end shrink-0">
                {person.clockIn ?? '--:--'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
