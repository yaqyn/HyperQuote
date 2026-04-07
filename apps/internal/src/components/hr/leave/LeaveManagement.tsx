import { useState, useMemo } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getLeaveRequests, approveLeaveRequest, getEmployeeDirectory } from '../../../lib/server/hr'
import { LEAVE_ALLOWANCES } from '../../../types/hr'
import type { LeaveStatus, LeaveType } from '../../../types/hr'

type FilterKey = 'all' | 'pending' | 'approved' | 'rejected'

const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'maternity', 'paternity', 'study', 'pilgrimage', 'childcare', 'nursing']

/**
 * Leave Management — "The Calendar"
 * Leave requests as a list: employee name + type tag + dates (mono) + duration + status dot.
 * Approve/Reject as inline hover buttons.
 * Leave balance shown as thin utilization bars per employee.
 */
export function LeaveManagement() {
  const { t } = useTranslation('hr')
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [showNewForm, setShowNewForm] = useState(false)

  const { data: requests } = useQuery({
    queryKey: ['hr', 'leave'],
    queryFn: () => getLeaveRequests(),
    staleTime: 30_000,
  })

  const { data: employees } = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => getEmployeeDirectory(),
    staleTime: 30_000,
  })

  const approveMutation = useMutation({
    mutationFn: () => approveLeaveRequest(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] }),
  })

  const filtered = useMemo(() => {
    if (!requests) return []
    if (filter === 'all') return requests
    return requests.filter((r) => r.status === filter)
  }, [requests, filter])

  function daysBetween(start: string, end: string): number {
    const d1 = new Date(start)
    const d2 = new Date(end)
    return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)) + 1)
  }

  const FILTERS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: t('leave.all', 'All') },
    { key: 'pending', label: t('leave.pending', 'Pending') },
    { key: 'approved', label: t('leave.approved', 'Approved') },
    { key: 'rejected', label: t('leave.rejected', 'Rejected') },
  ]

  if (!requests) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  const statusDot: Record<LeaveStatus, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
          {t('leave.title', 'Leave Management')}
        </div>
        <Button
          onPress={() => setShowNewForm(!showNewForm)}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white font-medium cursor-pointer hover:opacity-90 transition-opacity outline-none"
        >
          {showNewForm ? t('leave.cancel', 'Cancel') : t('leave.newRequest', 'New Request')}
        </Button>
      </div>

      {/* New request form */}
      {showNewForm && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="border border-[var(--color-border)] rounded-xl p-4 space-y-3"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.selectEmployee', 'Employee')}</label>
              <select className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40">
                <option value="">{t('leave.selectEmployee', 'Select...')}</option>
                {(employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.selectType', 'Type')}</label>
              <select className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40">
                <option value="">{t('leave.selectType', 'Select...')}</option>
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`leave.types.${type}`, type)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.startDate', 'Start')}</label>
              <input type="date" className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40" />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.endDate', 'End')}</label>
              <input type="date" className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onPress={() => setShowNewForm(false)}
              className="rounded-lg bg-[var(--color-primary)] px-4 py-1.5 text-sm text-white font-medium cursor-pointer hover:opacity-90 transition-opacity outline-none"
            >
              {t('leave.submit', 'Submit')}
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main content */}
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium cursor-pointer transition-all duration-150 outline-none
                  ${filter === f.key
                    ? 'text-[var(--color-text)] bg-black/[0.06] dark:bg-white/[0.06]'
                    : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                  }`}
              >
                {f.label}
                {f.key !== 'all' && (
                  <span className="ms-1.5 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {requests.filter((r) => r.status === f.key).length}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {/* Request list */}
          <div className="flex flex-col">
            {filtered.map((req) => {
              const days = daysBetween(req.startDate, req.endDate)

              return (
                <div
                  key={req.id}
                  className="group flex items-center gap-3 px-2 py-2.5 -mx-2 border-b border-[var(--color-border)]/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors rounded-lg"
                >
                  {/* Status dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[req.status]}`} />

                  {/* Employee */}
                  <span className="text-sm text-[var(--color-text)] w-32 shrink-0 truncate">{req.employeeName}</span>

                  {/* Type tag */}
                  <span className="rounded-md bg-black/[0.04] dark:bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-[var(--color-text-muted)] shrink-0">
                    {t(`leave.types.${req.type}`, req.type)}
                  </span>

                  {/* Dates */}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)] shrink-0">
                    {req.startDate} - {req.endDate}
                  </span>

                  {/* Duration */}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text)] shrink-0">
                    {days}d
                  </span>

                  <span className="flex-1" />

                  {/* Approve/Reject buttons (only on hover for pending) */}
                  {req.status === 'pending' && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onPress={() => approveMutation.mutate()}
                        className="rounded-md px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 cursor-pointer outline-none"
                      >
                        {t('leave.approve', 'Approve')}
                      </Button>
                      <Button
                        onPress={() => approveMutation.mutate()}
                        className="rounded-md px-2 py-0.5 text-[11px] font-medium text-red-700 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 cursor-pointer outline-none"
                      >
                        {t('leave.reject', 'Reject')}
                      </Button>
                    </div>
                  )}

                  {req.approverComment && (
                    <span className="text-[10px] text-[var(--color-text-subtle)]">
                      {req.approverComment}
                    </span>
                  )}
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-[var(--color-text-subtle)]">
                No leave requests found
              </div>
            )}
          </div>

          {/* Team Calendar */}
          <div className="pt-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
              {t('leave.teamCalendar', 'Team Calendar')}
            </div>
            <TeamCalendar requests={requests} />
          </div>
        </div>

        {/* Sidebar: labor law + leave balances */}
        <div className="space-y-5">
          {/* Leave balances as utilization bars */}
          <div>
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
              {t('leave.balances', 'Leave Balances')}
            </div>
            {(employees ?? []).slice(0, 6).map((emp) => {
              const used = requests.filter((r) => r.employeeId === emp.id && r.status === 'approved').length * 2
              const total = LEAVE_ALLOWANCES.annual_after_year
              const pct = Math.min((used / total) * 100, 100)

              return (
                <div key={emp.id} className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--color-text)] truncate">{emp.name}</span>
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)]">
                      {total - used}d left
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.05] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Labor law reference */}
          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
              {t('leave.laborLaw', 'Egyptian Labor Law')}
            </div>
            <div className="space-y-2 text-[11px] text-[var(--color-text-subtle)]">
              <LawLine label="Annual (1st year)" value={`${LEAVE_ALLOWANCES.annual_first_year}d`} />
              <LawLine label="Annual (after 1y)" value={`${LEAVE_ALLOWANCES.annual_after_year}d`} />
              <LawLine label="Annual (10y+/50+)" value={`${LEAVE_ALLOWANCES.annual_after_10_years_or_50}d`} />
              <LawLine label="Maternity" value={`${LEAVE_ALLOWANCES.maternity_days}d`} />
              <LawLine label="Paternity" value={`${LEAVE_ALLOWANCES.paternity_days}d`} />
              <LawLine label="Sick" value={`${LEAVE_ALLOWANCES.sick_total_days}d`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function LawLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-muted)]">{value}</span>
    </div>
  )
}

function TeamCalendar({ requests }: { requests: import('../../../types/hr').LeaveRequest[] }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthName = now.toLocaleString('en', { month: 'long', year: 'numeric' })

  const approvedRequests = requests.filter((r) => r.status === 'approved' || r.status === 'pending')

  const cells: Array<{ day: number | null; people: string[] }> = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, people: [] })
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const people = approvedRequests
      .filter((r) => dateStr >= r.startDate && dateStr <= r.endDate)
      .map((r) => r.employeeName.split(' ')[0]!)
    cells.push({ day, people })
  }

  return (
    <div>
      <div className="text-sm font-medium text-[var(--color-text)] mb-2">{monthName}</div>
      <div className="grid grid-cols-7 gap-px text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] text-[var(--color-text-subtle)] py-1">{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`min-h-8 text-xs p-0.5 rounded ${
              cell.day !== null && cell.people.length > 0 ? 'bg-[var(--color-primary)]/5' : ''
            }`}
          >
            {cell.day !== null && (
              <>
                <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-[var(--color-text-muted)]">{cell.day}</div>
                {cell.people.length > 0 && (
                  <div className="text-[8px] text-[var(--color-primary)] leading-tight truncate">
                    {cell.people.join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
