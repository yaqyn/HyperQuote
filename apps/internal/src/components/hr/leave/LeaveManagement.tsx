import { useState, useMemo } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLeaveRequests, approveLeaveRequest, getEmployeeDirectory } from '../../../lib/server/hr'
import { LEAVE_ALLOWANCES } from '../../../types/hr'
import type { LeaveStatus, LeaveType } from '../../../types/hr'

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

type FilterKey = 'all' | 'pending' | 'approved' | 'rejected'

const STATUS_BADGE: Record<LeaveStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  approved: 'bg-green-500/20 text-green-700 dark:text-green-300',
  rejected: 'bg-red-500/20 text-red-700 dark:text-red-300',
}

const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'maternity', 'paternity', 'study', 'pilgrimage', 'childcare', 'nursing']

/**
 * Leave management view.
 * Tab filter: All/Pending/Approved/Rejected.
 * Table with approve/reject actions for pending requests.
 * New leave request form (inline).
 * Egyptian labor law reference sidebar.
 * Simple team calendar.
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

  // Simple day count between two dates
  function daysBetween(start: string, end: string): number {
    const d1 = new Date(start)
    const d2 = new Date(end)
    return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)) + 1)
  }

  const FILTER_BUTTONS: Array<{ key: FilterKey; label: string }> = [
    { key: 'all', label: t('leave.all', 'All') },
    { key: 'pending', label: t('leave.pending', 'Pending') },
    { key: 'approved', label: t('leave.approved', 'Approved') },
    { key: 'rejected', label: t('leave.rejected', 'Rejected') },
  ]

  if (!requests) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('leave.title', 'Leave Management')}</h2>
        <Button
          onPress={() => setShowNewForm(!showNewForm)}
          className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-sm text-white font-medium hover:bg-[#2563EB]/90 cursor-pointer"
        >
          {showNewForm ? t('leave.cancel', 'Cancel') : t('leave.newRequest', 'New Leave Request')}
        </Button>
      </div>

      {/* New request form */}
      {showNewForm && (
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-3">{t('leave.newRequest', 'New Leave Request')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs text-black/50 dark:text-white/50 mb-1">{t('leave.selectEmployee', 'Select Employee')}</label>
              <select className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB]">
                <option value="">{t('leave.selectEmployee', 'Select Employee')}</option>
                {(employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-black/50 dark:text-white/50 mb-1">{t('leave.selectType', 'Select Type')}</label>
              <select className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB]">
                <option value="">{t('leave.selectType', 'Select Type')}</option>
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`leave.types.${type}`, type)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-black/50 dark:text-white/50 mb-1">{t('leave.startDate', 'Start Date')}</label>
              <input type="date" className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB]" />
            </div>
            <div>
              <label className="block text-xs text-black/50 dark:text-white/50 mb-1">{t('leave.endDate', 'End Date')}</label>
              <input type="date" className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[#2563EB]" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-black/50 dark:text-white/50 mb-1">{t('leave.reason', 'Reason')}</label>
            <textarea className="w-full rounded-lg border border-black/20 dark:border-white/20 bg-transparent px-3 py-1.5 text-sm outline-none resize-y min-h-16 focus:border-[#2563EB]" />
          </div>
          <div className="mt-3">
            <label className="block text-xs text-black/50 dark:text-white/50 mb-1">{t('leave.attachment', 'Attachment')}</label>
            <div className="rounded-lg border-2 border-dashed border-black/10 dark:border-white/10 p-4 text-center text-xs text-black/40 dark:text-white/40">
              Drop file here or click to upload
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onPress={() => setShowNewForm(false)}
              className="rounded-lg bg-[#2563EB] px-4 py-1.5 text-sm text-white font-medium hover:bg-[#2563EB]/90 cursor-pointer"
            >
              {t('leave.submit', 'Submit Request')}
            </Button>
          </div>
        </GlassPanel>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-2">
            {FILTER_BUTTONS.map((btn) => (
              <button
                key={btn.key}
                type="button"
                onClick={() => setFilter(btn.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === btn.key
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10'
                }`}
              >
                {btn.label}
                {btn.key !== 'all' && (
                  <span className="ms-1.5 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {requests.filter((r) => r.status === btn.key).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                  <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('leave.employee', 'Employee')}</th>
                  <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('leave.type', 'Type')}</th>
                  <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('leave.startDate', 'Start')}</th>
                  <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('leave.endDate', 'End')}</th>
                  <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('leave.days', 'Days')}</th>
                  <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('leave.reason', 'Reason')}</th>
                  <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('leave.status', 'Status')}</th>
                  <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr key={req.id} className="border-b border-black/5 dark:border-white/5">
                    <td className="px-4 py-3 font-medium">{req.employeeName}</td>
                    <td className="px-4 py-3 text-black/60 dark:text-white/60">{t(`leave.types.${req.type}`, req.type)}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">{req.startDate}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">{req.endDate}</td>
                    <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">{daysBetween(req.startDate, req.endDate)}</td>
                    <td className="px-4 py-3 text-black/60 dark:text-white/60 max-w-32 truncate">{req.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[req.status]}`}>
                        {t(`leave.${req.status}`, req.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {req.status === 'pending' && (
                        <div className="flex gap-1.5">
                          <Button
                            onPress={() => approveMutation.mutate()}
                            className="rounded px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 bg-green-500/10 hover:bg-green-500/20 cursor-pointer"
                          >
                            {t('leave.approve', 'Approve')}
                          </Button>
                          <Button
                            onPress={() => approveMutation.mutate()}
                            className="rounded px-2 py-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-500/10 hover:bg-red-500/20 cursor-pointer"
                          >
                            {t('leave.reject', 'Reject')}
                          </Button>
                        </div>
                      )}
                      {req.approverComment && (
                        <span className="text-[10px] text-black/40 dark:text-white/40 block mt-0.5">
                          {req.approverComment}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-black/40 dark:text-white/40">
                      No leave requests found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Simple Team Calendar */}
          <GlassPanel>
            <h3 className="text-sm font-semibold mb-3">{t('leave.teamCalendar', 'Team Calendar')}</h3>
            <TeamCalendar requests={requests} />
          </GlassPanel>
        </div>

        {/* Sidebar: Egyptian labor law reference */}
        <GlassPanel className="h-fit">
          <h3 className="text-sm font-semibold mb-3">{t('leave.laborLaw', 'Egyptian Labor Law Reference')}</h3>
          <div className="space-y-2 text-xs">
            <LawRef label={t('leave.types.annual', 'Annual Leave')} detail={t('leave.allowances.annualFirstYear', `${LEAVE_ALLOWANCES.annual_first_year} days (first year)`)} />
            <LawRef label="" detail={t('leave.allowances.annualAfterYear', `${LEAVE_ALLOWANCES.annual_after_year} days (after 1 year)`)} />
            <LawRef label="" detail={t('leave.allowances.annualSenior', `${LEAVE_ALLOWANCES.annual_after_10_years_or_50} days (10+ years or age 50+)`)} />
            <LawRef label={t('leave.types.maternity', 'Maternity Leave')} detail={t('leave.allowances.maternity', `${LEAVE_ALLOWANCES.maternity_days} days (max ${LEAVE_ALLOWANCES.maternity_max_times} times)`)} />
            <LawRef label={t('leave.types.paternity', 'Paternity Leave')} detail={t('leave.allowances.paternity', `${LEAVE_ALLOWANCES.paternity_days} day`)} />
            <LawRef label={t('leave.types.sick', 'Sick Leave')} detail={t('leave.allowances.sick', `${LEAVE_ALLOWANCES.sick_total_days} days (${LEAVE_ALLOWANCES.sick_first_90_pay_percent}% pay first 90, ${LEAVE_ALLOWANCES.sick_next_90_pay_percent}% next 90)`)} />
            <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/5">
              <LawRef label="" detail={t('leave.allowances.mandatoryIncrease', `${LEAVE_ALLOWANCES.mandatory_annual_increase_percent}% mandatory annual salary increase`)} />
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function LawRef({ label, detail }: { label: string; detail: string }) {
  return (
    <div>
      {label && <div className="font-medium text-black/70 dark:text-white/70 mb-0.5">{label}</div>}
      <div className="text-black/50 dark:text-white/50">{detail}</div>
    </div>
  )
}

function TeamCalendar({ requests }: { requests: import('../../../types/hr').LeaveRequest[] }) {
  // Simple month grid showing who's off which days
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthName = now.toLocaleString('en', { month: 'long', year: 'numeric' })

  const approvedRequests = requests.filter((r) => r.status === 'approved' || r.status === 'pending')

  // Build day cells
  const cells: Array<{ day: number | null; people: string[] }> = []

  // Empty cells for padding
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, people: [] })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const people = approvedRequests
      .filter((r) => dateStr >= r.startDate && dateStr <= r.endDate)
      .map((r) => r.employeeName.split(' ')[0]!)
    cells.push({ day, people })
  }

  return (
    <div>
      <div className="text-sm font-medium mb-2">{monthName}</div>
      <div className="grid grid-cols-7 gap-px text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] text-black/40 dark:text-white/40 py-1">{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`min-h-8 text-xs p-0.5 rounded ${
              cell.day === null
                ? ''
                : cell.people.length > 0
                  ? 'bg-[#2563EB]/5'
                  : ''
            }`}
          >
            {cell.day !== null && (
              <>
                <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px]">{cell.day}</div>
                {cell.people.length > 0 && (
                  <div className="text-[8px] text-[#2563EB] leading-tight truncate">
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
