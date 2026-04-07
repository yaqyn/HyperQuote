import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion } from 'motion/react'
import { getEmployeeDirectory, getAttendance, getDriverCompliance } from '../../../lib/server/hr'
import { useHRStore } from '../../../stores/hr'
import { LEAVE_ALLOWANCES } from '../../../types/hr'
import type { DriverComplianceRecord } from '../../../types/hr'

/**
 * Employee Profile — "The Card"
 * Profile header: name + role + department + hire date (mono).
 * Stats row: attendance % + leave balance + certifications count.
 * Below: attendance history, leave history, documents.
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

  const { data: complianceRecords } = useQuery({
    queryKey: ['hr', 'compliance'],
    queryFn: () => getDriverCompliance(),
    staleTime: 30_000,
  })

  // Find compliance record for this employee (if they are a driver)
  const driverCompliance = complianceRecords?.find(
    (r: DriverComplianceRecord) => r.driverId === selectedEmployeeId,
  )

  const employee = employees?.find((e) => e.id === selectedEmployeeId)

  if (!employee) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Compute tenure
  const hireDate = new Date(employee.hireDate)
  const now = new Date()
  const tenureYears = (now.getTime() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)

  // Annual leave allowance per Egyptian labor law
  let annualAllowance: number
  if (tenureYears < 1) {
    annualAllowance = LEAVE_ALLOWANCES.annual_first_year
  } else if (tenureYears >= 10) {
    annualAllowance = LEAVE_ALLOWANCES.annual_after_10_years_or_50
  } else {
    annualAllowance = LEAVE_ALLOWANCES.annual_after_year
  }

  // Employee attendance
  const employeeAttendance = (attendanceRecords ?? [])
    .filter((a) => a.employeeId === employee.id)
    .slice(0, 10)

  // Mock leave used
  const annualUsed = 5
  const sickUsed = 2

  // Attendance %
  const totalAttendance = employeeAttendance.length
  const presentDays = employeeAttendance.filter((a) => a.clockIn !== null).length
  const attendancePct = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0

  return (
    <div className="p-5 space-y-6">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-black/[0.05] dark:bg-white/[0.05] flex items-center justify-center text-lg font-semibold text-[var(--color-text-muted)]">
          {employee.name.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--color-text)]">{employee.name}</h2>
            <span className={`w-2 h-2 rounded-full ${employee.status === 'active' ? 'bg-green-500' : 'bg-black/15 dark:bg-white/15'}`} />
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {employee.role} &middot; {employee.department}
          </p>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-subtle)] mt-0.5">
            {t('employees.hireDate', 'Hired')} {employee.hireDate}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-baseline gap-8 border-b border-[var(--color-border)] pb-5">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
            {t('profile.attendance', 'Attendance')}
          </div>
          <div className={`text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums ${attendancePct >= 90 ? 'text-green-600 dark:text-green-400' : attendancePct >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {attendancePct}%
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
            {t('profile.leaveBalance', 'Leave Balance')}
          </div>
          <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
            {annualAllowance - annualUsed}
            <span className="text-sm text-[var(--color-text-subtle)] font-sans ms-1">/ {annualAllowance}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
            {t('profile.tenure', 'Tenure')}
          </div>
          <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text)]">
            {tenureYears.toFixed(1)}
            <span className="text-sm text-[var(--color-text-subtle)] font-sans ms-1">yr</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance history */}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
            {t('profile.attendanceHistory', 'Attendance History')}
          </div>
          {employeeAttendance.length > 0 ? (
            <div className="flex flex-col">
              {employeeAttendance.map((a) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className="flex items-center gap-3 py-1.5 border-b border-[var(--color-border)]/30"
                >
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)] w-20">
                    {a.date}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text)]">
                    {a.clockIn ?? '--:--'}
                  </span>
                  <span className="text-[var(--color-text-subtle)] text-xs">-</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text)]">
                    {a.clockOut ?? '--:--'}
                  </span>
                  <span className="flex-1" />
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)]">
                    {a.hoursWorked > 0 ? `${a.hoursWorked.toFixed(1)}h` : '-'}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-subtle)]">No attendance records</p>
          )}
        </div>

        {/* Leave history + balance bars */}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
            {t('profile.leaveBalance', 'Leave Balance')}
          </div>
          <div className="space-y-4">
            <LeaveBar
              label={t('profile.annualLeave', 'Annual Leave')}
              total={annualAllowance}
              used={annualUsed}
            />
            <LeaveBar
              label={t('profile.sickLeave', 'Sick Leave')}
              total={LEAVE_ALLOWANCES.sick_total_days}
              used={sickUsed}
            />
            <LeaveBar
              label={t('profile.maternityLeave', 'Maternity Leave')}
              total={LEAVE_ALLOWANCES.maternity_days}
              used={0}
            />
          </div>
        </div>

        {/* Personal info */}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
            {t('profile.personalInfo', 'Personal Information')}
          </div>
          <div className="space-y-2">
            <InfoLine label={t('employees.phone', 'Phone')} value={employee.phone} mono />
            <InfoLine label={t('employees.email', 'Email')} value={employee.email} />
            <InfoLine label={t('employees.nationalId', 'National ID')} value={employee.nationalId ?? '-'} mono />
            <InfoLine label={t('employees.address', 'Address')} value={employee.address ?? '-'} />
            <InfoLine label={t('employees.emergencyContact', 'Emergency')} value={employee.emergencyContact ?? '-'} />
            <InfoLine label={t('employees.contractType', 'Contract')} value={employee.contractType ?? '-'} />
            <InfoLine label={t('employees.reportingManager', 'Manager')} value={employee.reportingManager ?? '-'} />
          </div>
        </div>

        {/* Documents */}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
            {t('profile.documents', 'Documents')}
          </div>
          <div className="space-y-1.5">
            {[
              { key: 'contract', label: t('profile.contract', 'Contract') },
              { key: 'nationalIdCopy', label: t('profile.nationalIdCopy', 'National ID Copy') },
              { key: 'taxCard', label: t('profile.taxCard', 'Tax Card') },
              { key: 'socialInsurance', label: t('profile.socialInsurance', 'Social Insurance Card') },
            ].map((doc) => (
              <div key={doc.key} className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)]/30">
                <span className="text-sm text-[var(--color-text)]">{doc.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[11px] text-[var(--color-text-subtle)]">On file</span>
                </span>
              </div>
            ))}
          </div>

          {/* Performance notes */}
          <div className="mt-6">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-2">
              {t('profile.performanceNotes', 'Performance Notes')}
            </div>
            <textarea
              className="w-full rounded-xl border border-[var(--color-border)] bg-transparent p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none resize-y min-h-20
                focus:ring-1 focus:ring-[var(--color-primary)]/40"
              placeholder="Add performance notes..."
            />
          </div>
        </div>
      </div>

      {/* Compliance section (for drivers) */}
      {driverCompliance && (
        <div className="mt-6">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
            {t('profile.compliance', 'Driver Compliance')}
          </div>
          <div className="rounded-xl border border-[var(--color-border)]/50 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${
                driverCompliance.complianceStatus === 'green' ? 'bg-green-500' :
                driverCompliance.complianceStatus === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium text-[var(--color-text)]">
                {driverCompliance.complianceStatus === 'green' ? t('compliance.clear', 'All Clear') :
                 driverCompliance.complianceStatus === 'yellow' ? t('compliance.expiring', 'Expiring Soon') :
                 t('compliance.expired', 'Expired / Blocked')}
              </span>
              {driverCompliance.dispatchBlocked && (
                <span className="text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                  {t('compliance.blocked', 'Dispatch Blocked')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoLine label={t('compliance.licenseClass', 'License Class')} value={driverCompliance.licenseClass} />
              <InfoLine label={t('compliance.licenseExpiry', 'License Expiry')} value={driverCompliance.licenseExpiry} mono />
              <InfoLine label={t('compliance.medicalExpiry', 'Medical Expiry')} value={driverCompliance.medicalExpiry} mono />
              <InfoLine label={t('compliance.drugTest', 'Drug Test')} value={`${driverCompliance.drugTestResult} (${driverCompliance.drugTestDate})`} />
            </div>
            {driverCompliance.certifications.length > 0 && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1.5">
                  {t('compliance.certifications', 'Certifications')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {driverCompliance.certifications.map((cert) => (
                    <span
                      key={cert.type}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-[var(--color-border)]/50 text-[var(--color-text-muted)]"
                    >
                      {cert.type} — <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{cert.expiry}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function InfoLine({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[var(--color-border)]/30">
      <span className="text-xs text-[var(--color-text-subtle)]">{label}</span>
      <span className={`text-sm text-[var(--color-text)] ${mono ? 'font-[family-name:var(--font-geist-mono)] tabular-nums' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function LeaveBar({ label, total, used }: { label: string; total: number; used: number }) {
  const remaining = total - used
  const pct = total > 0 ? (used / total) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-[var(--color-text)]">{label}</span>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)]">
          {remaining} / {total}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.05] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}
