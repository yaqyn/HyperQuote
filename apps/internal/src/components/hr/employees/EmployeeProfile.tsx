import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { getEmployeeDirectory, getAttendance, getDriverCompliance, getLeaveRequests, savePerformanceNotes } from '../../../lib/server/hr'
import { Button } from '../../ui'
import { useHRStore } from '../../../stores/hr'
import { LEAVE_ALLOWANCES } from '../../../types/hr'
import type { DriverComplianceRecord } from '../../../types/hr'

/**
 * Employee Profile — "The Card"
 * Section order: Contact Info -> Current Status -> Attendance Summary -> Leave Balance -> Documents -> Performance Notes
 * Driver compliance shown inline when applicable.
 */
export function EmployeeProfile() {
  const { t } = useTranslation('hr')
  const selectedEmployeeId = useHRStore((s) => s.selectedEmployeeId)

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

  const { data: leaveRequests } = useQuery({
    queryKey: ['hr', 'leave'],
    queryFn: () => getLeaveRequests(),
    staleTime: 30_000,
  })

  const driverCompliance = complianceRecords?.find(
    (r: DriverComplianceRecord) => r.driverId === selectedEmployeeId,
  )

  const [perfNotes, setPerfNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)

  const notesMutation = useMutation({
    mutationFn: () => savePerformanceNotes({ data: { employeeId: selectedEmployeeId!, notes: perfNotes } }),
    onSuccess: () => {
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    },
  })

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

  // Employee leave requests
  const employeeLeave = (leaveRequests ?? []).filter((l) => l.employeeId === employee.id)
  const approvedLeave = employeeLeave.filter((l) => l.status === 'approved')
  const pendingLeave = employeeLeave.filter((l) => l.status === 'pending')

  // Mock leave used
  const annualUsed = approvedLeave.filter((l) => l.type === 'annual').length * 3
  const sickUsed = approvedLeave.filter((l) => l.type === 'sick').length * 2

  // Attendance %
  const totalAttendance = employeeAttendance.length
  const presentDays = employeeAttendance.filter((a) => a.clockIn !== null).length
  const attendancePct = totalAttendance > 0 ? Math.round((presentDays / totalAttendance) * 100) : 0

  // Current status
  const today = new Date().toISOString().split('T')[0]!
  const isOnLeave = approvedLeave.some((l) => l.startDate <= today && l.endDate >= today)
  const currentLeave = approvedLeave.find((l) => l.startDate <= today && l.endDate >= today)
  const todayAttendance = employeeAttendance.find((a) => a.date === today)

  let currentStatusLabel: string
  let currentStatusColor: string
  if (employee.status === 'inactive') {
    currentStatusLabel = t('profile.inactive', 'Inactive')
    currentStatusColor = 'text-[var(--color-text-subtle)]'
  } else if (isOnLeave && currentLeave) {
    currentStatusLabel = `${t('profile.onLeave', 'On Leave')} — ${t(`leave.types.${currentLeave.type}`, currentLeave.type)} (${currentLeave.startDate} to ${currentLeave.endDate})`
    currentStatusColor = 'text-[var(--color-primary)]'
  } else if (todayAttendance?.clockIn) {
    currentStatusLabel = `${t('profile.present', 'Present')} — clocked in ${todayAttendance.clockIn}`
    currentStatusColor = 'text-green-600 dark:text-green-400'
  } else {
    currentStatusLabel = t('profile.notClockedIn', 'Not clocked in today')
    currentStatusColor = 'text-red-600 dark:text-red-400'
  }

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
            {t('employees.hireDate', 'Hired')} {employee.hireDate} &middot; {tenureYears.toFixed(1)} yr
          </p>
        </div>
      </div>

      {/* ── 1. Contact Info ────────────────────────────── */}
      <section>
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
          {t('profile.contactInfo', 'Contact Information')}
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
      </section>

      {/* ── 2. Current Status ──────────────────────────── */}
      <section className="border-t border-[var(--color-border)] pt-5">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
          {t('profile.currentStatus', 'Current Status')}
        </div>
        <div className={`text-sm font-medium ${currentStatusColor}`}>
          {currentStatusLabel}
        </div>
        {pendingLeave.length > 0 && (
          <div className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2">
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              {pendingLeave.length} pending leave request{pendingLeave.length > 1 ? 's' : ''}
            </span>
            {pendingLeave.map((l) => (
              <div key={l.id} className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                {t(`leave.types.${l.type}`, l.type)} — {l.startDate} to {l.endDate}
              </div>
            ))}
          </div>
        )}

        {/* Driver compliance inline */}
        {driverCompliance && (
          <div className="mt-3 rounded-xl border border-[var(--color-border)]/50 p-4 space-y-3">
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
            )}
          </div>
        )}
      </section>

      {/* ── 3. Attendance Summary ──────────────────────── */}
      <section className="border-t border-[var(--color-border)] pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
            {t('profile.attendanceHistory', 'Attendance Summary')}
          </div>
          <div className={`text-lg font-[family-name:var(--font-geist-mono)] tabular-nums ${attendancePct >= 90 ? 'text-green-600 dark:text-green-400' : attendancePct >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
            {attendancePct}%
          </div>
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
      </section>

      {/* ── 4. Leave Balance ───────────────────────────── */}
      <section className="border-t border-[var(--color-border)] pt-5">
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
      </section>

      {/* ── 5. Documents ───────────────────────────────── */}
      <section className="border-t border-[var(--color-border)] pt-5">
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
      </section>

      {/* ── 6. Performance Notes ───────────────────────── */}
      <section className="border-t border-[var(--color-border)] pt-5">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-2">
          {t('profile.performanceNotes', 'Performance Notes')}
        </div>
        <textarea
          value={perfNotes}
          onChange={(e) => setPerfNotes(e.target.value)}
          className="w-full rounded-xl border border-[var(--color-border)] bg-transparent p-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none resize-y min-h-20
            focus:ring-1 focus:ring-[var(--color-primary)]/40"
          placeholder="Add performance notes..."
        />
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="subtle"
            isDisabled={!perfNotes.trim() || notesMutation.isPending}
            onPress={() => notesMutation.mutate()}
          >
            {notesMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <AnimatePresence>
            {notesSaved && (
              <motion.span
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[12px] text-green-600 dark:text-green-400"
              >
                Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </section>
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
