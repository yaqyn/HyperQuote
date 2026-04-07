import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getEmployeeDirectory, getDriverCompliance, getLeaveRequests, getAttendance } from '../../../lib/server/hr'

/**
 * HR Home — "The Board"
 * Today's stats: Present | Absent | On Leave | Late. Large mono numbers with colored data indicators.
 * Below: who's in/out today as a compact list with status dots.
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
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Compute stats
  const activeEmployees = employees.filter((e) => e.status === 'active')
  const totalActive = activeEmployees.length

  const clockedIn = attendance?.filter((a) => a.clockIn !== null).length ?? 0
  const onLeave = leaveRequests?.filter((l) => l.status === 'approved').length ?? 0

  // Late = clocked in but after expected time (mock: overtime > 0 as proxy for late arrivals)
  const late = attendance?.filter((a) => a.clockIn !== null && a.overtime > 0).length ?? 0
  const absent = Math.max(0, totalActive - clockedIn - onLeave)

  // Compliance alerts
  const expiring = compliance.filter((c) => c.complianceStatus === 'yellow').length
  const expired = compliance.filter((c) => c.complianceStatus === 'red').length

  const stats = [
    {
      label: t('home.present', 'Present'),
      value: clockedIn,
      color: 'text-green-600 dark:text-green-400',
      dot: 'bg-green-500',
    },
    {
      label: t('home.absent', 'Absent'),
      value: absent,
      color: absent > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-subtle)]',
      dot: 'bg-red-500',
    },
    {
      label: t('home.onLeave', 'On Leave'),
      value: onLeave,
      color: onLeave > 0 ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]',
      dot: 'bg-[var(--color-primary)]',
    },
    {
      label: t('home.late', 'Late'),
      value: late,
      color: late > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-text-subtle)]',
      dot: 'bg-amber-500',
    },
  ]

  // Build who's in/out list from attendance + employees
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

  // Sort: absent first, then late, then on leave, then present
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
      {/* Stats strip */}
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

        {/* Compliance alert inline */}
        {(expiring > 0 || expired > 0) && (
          <div className="ms-auto text-end">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
              {t('home.complianceAlerts', 'Compliance')}
            </div>
            <div className="flex items-baseline gap-3">
              {expired > 0 && (
                <span className="text-lg font-[family-name:var(--font-geist-mono)] tabular-nums text-red-600 dark:text-red-400">
                  {expired} <span className="text-xs font-sans">expired</span>
                </span>
              )}
              {expiring > 0 && (
                <span className="text-lg font-[family-name:var(--font-geist-mono)] tabular-nums text-amber-600 dark:text-amber-400">
                  {expiring} <span className="text-xs font-sans">expiring</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Who's in/out today */}
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
              {/* Status dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor[person.status]}`} />

              {/* Name */}
              <span className="text-sm text-[var(--color-text)] w-40 truncate">{person.name}</span>

              {/* Role */}
              <span className="text-xs text-[var(--color-text-subtle)] w-28 truncate">{person.role}</span>

              {/* Department */}
              <span className="text-xs text-[var(--color-text-subtle)] flex-1 truncate">{person.department}</span>

              {/* Clock in time */}
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
