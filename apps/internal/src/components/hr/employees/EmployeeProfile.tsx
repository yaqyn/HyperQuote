import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getEmployeeDirectory, getAttendance } from '../../../lib/server/hr'
import { useHRStore } from '../../../stores/hr'
import { LEAVE_ALLOWANCES } from '../../../types/hr'

// ─── Glass panel wrapper ────────────────────────────────

function GlassPanel({
  children,
  title,
  className = '',
}: {
  children: React.ReactNode
  title: string
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 ${className}`}
    >
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      {children}
    </div>
  )
}

/**
 * Employee profile view -- detailed info for a single employee.
 * Sections: Personal, Employment, Documents, Leave Balance, Attendance History, Performance Notes.
 * Leave balance computed from tenure using LEAVE_ALLOWANCES.
 */
export function EmployeeProfile() {
  const { t } = useTranslation('hr')
  const selectedEmployeeId = useHRStore((s) => s.selectedEmployeeId)
  const setSelectedEmployeeId = useHRStore((s) => s.setSelectedEmployeeId)

  const { data: employees } = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => getEmployeeDirectory(),
    staleTime: 30_000,
  })

  const { data: attendanceRecords } = useQuery({
    queryKey: ['hr', 'attendance'],
    queryFn: () => getAttendance(),
    staleTime: 15_000,
  })

  const employee = employees?.find((e) => e.id === selectedEmployeeId)

  if (!employee) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  // Compute tenure in years
  const hireDate = new Date(employee.hireDate)
  const now = new Date()
  const tenureYears = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  // Compute annual leave allowance per Egyptian labor law
  let annualAllowance: number
  if (tenureYears < 1) {
    annualAllowance = LEAVE_ALLOWANCES.annual_first_year
  } else if (tenureYears >= 10) {
    annualAllowance = LEAVE_ALLOWANCES.annual_after_10_years_or_50
  } else {
    annualAllowance = LEAVE_ALLOWANCES.annual_after_year
  }

  // Employee attendance (last 10)
  const employeeAttendance = (attendanceRecords ?? [])
    .filter((a) => a.employeeId === employee.id)
    .slice(0, 10)

  // Mock leave used
  const annualUsed = 5
  const sickUsed = 2

  return (
    <div className="p-6 space-y-4">
      {/* Back button */}
      <Button
        onPress={() => setSelectedEmployeeId(null)}
        className="inline-flex items-center gap-1.5 text-sm text-[#2563EB] hover:underline cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        {t('profile.back', 'Back to Directory')}
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#2563EB]/10 flex items-center justify-center text-[#2563EB] text-lg font-semibold">
          {employee.name.charAt(0)}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{employee.name}</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            {employee.role} &middot; {employee.department}
          </p>
        </div>
        <span className="ms-auto inline-flex items-center gap-1.5 text-xs font-medium">
          <span className={`w-2 h-2 rounded-full ${employee.status === 'active' ? 'bg-green-500' : 'bg-black/20 dark:bg-white/20'}`} />
          {t(`employees.${employee.status}`, employee.status)}
        </span>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Personal Info */}
        <GlassPanel title={t('profile.personalInfo', 'Personal Information')}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={t('employees.name', 'Name')} value={employee.name} />
            <InfoRow label={t('employees.phone', 'Phone')} value={employee.phone} mono />
            <InfoRow label={t('employees.email', 'Email')} value={employee.email} />
            <InfoRow label={t('employees.nationalId', 'National ID')} value={employee.nationalId ?? '-'} mono />
            <InfoRow label={t('employees.address', 'Address')} value={employee.address ?? '-'} />
            <InfoRow label={t('employees.emergencyContact', 'Emergency Contact')} value={employee.emergencyContact ?? '-'} />
          </dl>
        </GlassPanel>

        {/* Employment */}
        <GlassPanel title={t('profile.employment', 'Employment Details')}>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={t('employees.role', 'Role')} value={employee.role} />
            <InfoRow label={t('employees.department', 'Department')} value={employee.department} />
            <InfoRow label={t('employees.hireDate', 'Hire Date')} value={employee.hireDate} mono />
            <InfoRow label={t('employees.contractType', 'Contract Type')} value={employee.contractType ?? '-'} />
            <InfoRow label={t('employees.reportingManager', 'Reporting Manager')} value={employee.reportingManager ?? '-'} />
          </dl>
        </GlassPanel>

        {/* Documents */}
        <GlassPanel title={t('profile.documents', 'Documents')}>
          <div className="space-y-2">
            {[
              { key: 'contract', label: t('profile.contract', 'Contract') },
              { key: 'nationalIdCopy', label: t('profile.nationalIdCopy', 'National ID Copy') },
              { key: 'taxCard', label: t('profile.taxCard', 'Tax Card') },
              { key: 'socialInsurance', label: t('profile.socialInsurance', 'Social Insurance Card') },
            ].map((doc) => (
              <div key={doc.key} className="flex items-center justify-between rounded-lg bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2">
                <span className="text-sm text-black/70 dark:text-white/70">{doc.label}</span>
                <span className="text-xs text-black/40 dark:text-white/40">On file</span>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Leave Balance */}
        <GlassPanel title={t('profile.leaveBalance', 'Leave Balance')}>
          <div className="space-y-3">
            <LeaveRow
              label={t('profile.annualLeave', 'Annual Leave')}
              total={annualAllowance}
              used={annualUsed}
              t={t}
            />
            <LeaveRow
              label={t('profile.sickLeave', 'Sick Leave')}
              total={LEAVE_ALLOWANCES.sick_total_days}
              used={sickUsed}
              t={t}
            />
            <LeaveRow
              label={t('profile.maternityLeave', 'Maternity Leave')}
              total={LEAVE_ALLOWANCES.maternity_days}
              used={0}
              t={t}
            />
          </div>
        </GlassPanel>

        {/* Attendance History */}
        <GlassPanel title={t('profile.attendanceHistory', 'Attendance History')}>
          {employeeAttendance.length > 0 ? (
            <div className="space-y-1">
              {employeeAttendance.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm py-1">
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">{a.date}</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {a.clockIn ?? '--:--'} - {a.clockOut ?? '--:--'}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs">
                    {a.hoursWorked}h
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-black/40 dark:text-white/40">No attendance records</p>
          )}
        </GlassPanel>

        {/* Performance Notes */}
        <GlassPanel title={t('profile.performanceNotes', 'Performance Notes')}>
          <textarea
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-transparent p-3 text-sm outline-none resize-y min-h-24 focus:border-[#2563EB]"
            placeholder="Add performance notes..."
          />
        </GlassPanel>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div>
      <dt className="text-xs text-black/50 dark:text-white/50">{label}</dt>
      <dd className={`mt-0.5 ${mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''}`}>
        {value}
      </dd>
    </div>
  )
}

function LeaveRow({
  label,
  total,
  used,
  t,
}: {
  label: string
  total: number
  used: number
  t: (key: string, fallback: string) => string
}) {
  const remaining = total - used
  const pct = total > 0 ? (used / total) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-black/70 dark:text-white/70">{label}</span>
        <span className="text-xs text-black/50 dark:text-white/50">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{remaining}</span>{' '}
          {t('profile.daysRemaining', 'days remaining')}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#2563EB] transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-black/40 dark:text-white/40">
        <span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{used}</span>{' '}
          {t('profile.daysUsed', 'used')}
        </span>
        <span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{total}</span>{' '}
          {t('profile.totalAllowance', 'total')}
        </span>
      </div>
    </div>
  )
}
