import { useState, useMemo } from 'react'
import { Button as AriaButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { getLeaveRequests, approveLeaveRequest, submitLeaveRequest, getEmployeeDirectory } from '../../../lib/server/hr'
import { LEAVE_ALLOWANCES } from '../../../types/hr'
import { UnderlineInput, Button } from '../../ui'
import type { LeaveStatus, LeaveType, LeaveRequest } from '../../../types/hr'

const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'maternity', 'paternity', 'study', 'pilgrimage', 'childcare', 'nursing']

/**
 * Leave Management — "The Calendar"
 * PENDING requests at top (these need action NOW).
 * Approved/rejected below in separate section.
 * Approval buttons show impact: name + dates + duration.
 * Calendar highlights today (blue), leave days (colored by type), pending (dashed).
 */
export function LeaveManagement() {
  const { t } = useTranslation('hr')
  const queryClient = useQueryClient()
  const [showNewForm, setShowNewForm] = useState(false)
  const [approvalComment, setApprovalComment] = useState('')
  const [commentingOn, setCommentingOn] = useState<string | null>(null)

  // New request form state
  const [formEmployee, setFormEmployee] = useState('')
  const [formType, setFormType] = useState('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formReason, setFormReason] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)

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
    mutationFn: (vars: { requestId: string; decision: 'approved' | 'rejected'; comment?: string }) =>
      approveLeaveRequest({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] })
      setApprovalComment('')
      setCommentingOn(null)
    },
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      submitLeaveRequest({
        data: {
          employeeId: formEmployee,
          type: formType,
          startDate: formStart,
          endDate: formEnd,
          reason: formReason,
          attachment: formFile?.name,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] })
      setShowNewForm(false)
      setFormEmployee('')
      setFormType('')
      setFormStart('')
      setFormEnd('')
      setFormReason('')
      setFormFile(null)
    },
  })

  function daysBetween(start: string, end: string): number {
    const d1 = new Date(start)
    const d2 = new Date(end)
    return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000)) + 1)
  }

  if (!requests) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Split into pending (action needed) vs resolved
  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  const statusDot: Record<LeaveStatus, string> = {
    pending: 'bg-amber-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
  }

  const leaveTypeColor: Record<string, string> = {
    annual: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    sick: 'bg-red-500/10 text-red-600 dark:text-red-400',
    maternity: 'bg-green-500/10 text-green-600 dark:text-green-400',
    paternity: 'bg-green-500/10 text-green-600 dark:text-green-400',
    study: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    pilgrimage: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    childcare: 'bg-green-500/10 text-green-600 dark:text-green-400',
    nursing: 'bg-green-500/10 text-green-600 dark:text-green-400',
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
            {t('leave.title', 'Leave Management')}
          </div>
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 font-[family-name:var(--font-geist-mono)] tabular-nums">
              {pending.length} pending
            </span>
          )}
        </div>
        <Button variant="primary" onPress={() => setShowNewForm(!showNewForm)}>
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
              <select
                value={formEmployee}
                onChange={(e) => setFormEmployee(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
              >
                <option value="">{t('leave.selectEmployee', 'Select...')}</option>
                {(employees ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.selectType', 'Type')}</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
              >
                <option value="">{t('leave.selectType', 'Select...')}</option>
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>{t(`leave.types.${type}`, type)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.startDate', 'Start')}</label>
              <input
                type="date"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] font-[family-name:var(--font-geist-mono)] tabular-nums outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.endDate', 'End')}</label>
              <input
                type="date"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] font-[family-name:var(--font-geist-mono)] tabular-nums outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.reason', 'Reason')}</label>
            <input
              type="text"
              value={formReason}
              onChange={(e) => setFormReason(e.target.value)}
              placeholder="Optional reason..."
              className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">{t('leave.attachment', 'Attachment')}</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
              className="text-sm text-[var(--color-text-muted)] file:me-3 file:rounded-lg file:border-0 file:bg-black/[0.05] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-text)] file:cursor-pointer dark:file:bg-white/[0.06]"
            />
            {formFile && (
              <div className="mt-1 text-[11px] text-[var(--color-text-subtle)]">
                {formFile.name} ({(formFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="primary"
              isDisabled={!formEmployee || !formType || !formStart || !formEnd}
              onPress={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? 'Submitting...' : t('leave.submit', 'Submit')}
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Main content */}
        <div className="space-y-5">
          {/* ── PENDING REQUESTS (ACTION NEEDED) ───────── */}
          {pending.length > 0 && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400 mb-3">
                {t('leave.needsAction', 'Needs Your Action')}
              </div>
              <div className="flex flex-col gap-2">
                {pending.map((req) => {
                  const days = daysBetween(req.startDate, req.endDate)

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.12, ease: 'easeOut' }}
                      className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] px-4 py-3 space-y-2"
                    >
                      {/* Request info */}
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500" />
                        <span className="text-sm font-medium text-[var(--color-text)]">{req.employeeName}</span>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${leaveTypeColor[req.type] ?? 'bg-black/[0.04] text-[var(--color-text-muted)]'}`}>
                          {t(`leave.types.${req.type}`, req.type)}
                        </span>
                        <span className="flex-1" />
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)]">
                          {req.startDate} - {req.endDate}
                        </span>
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-medium text-[var(--color-text)]">
                          {days}d
                        </span>
                      </div>

                      {req.reason && (
                        <div className="text-xs text-[var(--color-text-muted)] ps-5">
                          {req.reason}
                        </div>
                      )}

                      {/* Comment field */}
                      {commentingOn === req.id && (
                        <input
                          type="text"
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}

                      {/* Large action buttons with impact description */}
                      <div className="flex items-center gap-2 ps-5">
                        {commentingOn !== req.id && (
                          <button
                            type="button"
                            onClick={() => setCommentingOn(req.id)}
                            className="rounded-lg px-2 py-1 text-[11px] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer transition-colors"
                          >
                            + add note
                          </button>
                        )}
                        <span className="flex-1" />
                        <AriaButton
                          onPress={() => approveMutation.mutate({ requestId: req.id, decision: 'rejected', comment: approvalComment || undefined })}
                          className="rounded-lg px-4 py-2 text-[13px] font-medium text-red-700 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 cursor-pointer outline-none transition-colors"
                        >
                          {t('leave.reject', 'Reject')}
                        </AriaButton>
                        <AriaButton
                          onPress={() => approveMutation.mutate({ requestId: req.id, decision: 'approved', comment: approvalComment || undefined })}
                          className="rounded-lg px-4 py-2 text-[13px] font-medium text-green-700 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 cursor-pointer outline-none transition-colors"
                        >
                          {t('leave.approveImpact', 'Approve')} — {req.employeeName.split(' ')[0]} out {req.startDate.slice(5)} to {req.endDate.slice(5)} ({days}d)
                        </AriaButton>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {pending.length === 0 && (
            <div className="rounded-xl bg-green-500/5 px-4 py-3">
              <span className="text-sm text-green-600 dark:text-green-400">
                No pending requests
              </span>
            </div>
          )}

          {/* ── RESOLVED REQUESTS ──────────────────────── */}
          {resolved.length > 0 && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
                {t('leave.resolved', 'Resolved')}
              </div>
              <div className="flex flex-col">
                {resolved.map((req) => {
                  const days = daysBetween(req.startDate, req.endDate)

                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 px-2 py-2.5 -mx-2 border-b border-[var(--color-border)]/30 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors rounded-lg"
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot[req.status]}`} />
                      <span className="text-sm text-[var(--color-text)] w-32 shrink-0 truncate">{req.employeeName}</span>
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium shrink-0 ${leaveTypeColor[req.type] ?? 'bg-black/[0.04] text-[var(--color-text-muted)]'}`}>
                        {t(`leave.types.${req.type}`, req.type)}
                      </span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)] shrink-0">
                        {req.startDate} - {req.endDate}
                      </span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text)] shrink-0">
                        {days}d
                      </span>
                      <span className="flex-1" />
                      <span className={`text-[11px] font-medium ${req.status === 'approved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {req.status}
                      </span>
                      {req.approverComment && (
                        <span className="text-[10px] text-[var(--color-text-subtle)] max-w-40 truncate">
                          {req.approverComment}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

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

function TeamCalendar({ requests }: { requests: LeaveRequest[] }) {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const monthName = now.toLocaleString('en', { month: 'long', year: 'numeric' })

  const approvedRequests = requests.filter((r) => r.status === 'approved')
  const pendingRequests = requests.filter((r) => r.status === 'pending')

  const cells: Array<{ day: number | null; approved: string[]; pending: string[]; isToday: boolean }> = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, approved: [], pending: [], isToday: false })
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const approved = approvedRequests
      .filter((r) => dateStr >= r.startDate && dateStr <= r.endDate)
      .map((r) => r.employeeName.split(' ')[0]!)
    const pending = pendingRequests
      .filter((r) => dateStr >= r.startDate && dateStr <= r.endDate)
      .map((r) => r.employeeName.split(' ')[0]!)
    cells.push({ day, approved, pending, isToday: day === today })
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
            className={`min-h-10 text-xs p-0.5 rounded transition-colors
              ${cell.isToday ? 'ring-1 ring-[var(--color-primary)] bg-[var(--color-primary)]/5' : ''}
              ${cell.day !== null && cell.approved.length > 0 ? 'bg-green-500/5' : ''}
              ${cell.day !== null && cell.pending.length > 0 && cell.approved.length === 0 ? 'bg-amber-500/5' : ''}
            `}
          >
            {cell.day !== null && (
              <>
                <div className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] ${
                  cell.isToday ? 'text-[var(--color-primary)] font-bold' : 'text-[var(--color-text-muted)]'
                }`}>
                  {cell.day}
                </div>
                {cell.approved.length > 0 && (
                  <div className="text-[8px] text-green-600 dark:text-green-400 leading-tight truncate">
                    {cell.approved.join(', ')}
                  </div>
                )}
                {cell.pending.length > 0 && (
                  <div className="text-[8px] text-amber-600 dark:text-amber-400 leading-tight truncate" style={{ borderBottom: '1px dashed currentColor' }}>
                    {cell.pending.join(', ')}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {/* Calendar legend */}
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--color-text-subtle)]">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm ring-1 ring-[var(--color-primary)] bg-[var(--color-primary)]/5" /> Today</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-500/10" /> Approved leave</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-500/10 border-b border-dashed border-amber-500" /> Pending leave</span>
      </div>
    </div>
  )
}
