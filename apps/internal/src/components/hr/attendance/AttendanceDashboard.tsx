import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttendance, clockInOut } from '../../../lib/server/hr'
import { OVERTIME_RATES, WORKING_HOURS } from '../../../types/hr'
import type { OvertimeType } from '../../../types/hr'

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

const OVERTIME_RATE_DISPLAY: Record<OvertimeType, { rate: number; label: string; pct: string }> = {
  day: { rate: OVERTIME_RATES.day, label: 'Day', pct: '135%' },
  night: { rate: OVERTIME_RATES.night, label: 'Night', pct: '170%' },
  holiday: { rate: OVERTIME_RATES.holiday, label: 'Holiday', pct: '200%' },
}

/**
 * Attendance dashboard.
 * Current day summary: clocked in count, total hours, overtime hours.
 * Table: employee, date, clock in/out, hours worked (Geist Mono), overtime, type, rate.
 * Clock In/Out quick action.
 * Working hours note: 8h/day standard, 6h/day Ramadan, 48h/week max. Weekend: Friday + Saturday.
 */
export function AttendanceDashboard() {
  const { t } = useTranslation('hr')
  const queryClient = useQueryClient()
  const [weekOffset, setWeekOffset] = useState(0)

  const { data: attendance } = useQuery({
    queryKey: ['hr', 'attendance'],
    queryFn: () => getAttendance(),
    staleTime: 15_000,
  })

  const clockMutation = useMutation({
    mutationFn: () => clockInOut(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] }),
  })

  if (!attendance) {
    return (
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  // Summary stats
  const clockedIn = attendance.filter((a) => a.clockIn !== null).length
  const totalHours = attendance.reduce((sum, a) => sum + a.hoursWorked, 0)
  const overtimeHours = attendance.reduce((sum, a) => sum + a.overtime, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('attendance.title', 'Attendance Dashboard')}</h2>
        <Button
          onPress={() => clockMutation.mutate()}
          className="rounded-lg bg-[#2563EB] px-3 py-1.5 text-sm text-white font-medium hover:bg-[#2563EB]/90 cursor-pointer"
        >
          {t('attendance.clockInBtn', 'Clock In')}
        </Button>
      </div>

      {/* ─── Summary Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassPanel>
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">{t('attendance.clockedIn', 'Clocked In')}</div>
          <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-green-600 dark:text-green-400">
            {clockedIn}
          </div>
        </GlassPanel>
        <GlassPanel>
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">{t('attendance.totalHours', 'Total Hours')}</div>
          <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums">
            {totalHours.toFixed(1)}
          </div>
        </GlassPanel>
        <GlassPanel>
          <div className="text-xs text-black/50 dark:text-white/50 mb-1">{t('attendance.overtimeHours', 'Overtime Hours')}</div>
          <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]">
            {overtimeHours.toFixed(1)}
          </div>
        </GlassPanel>
      </div>

      {/* ─── Week Selector ───────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-black/60 dark:text-white/60">{t('attendance.weekSelector', 'Week')}:</span>
        <button
          type="button"
          onClick={() => setWeekOffset((p) => p - 1)}
          className="rounded px-2 py-1 text-xs bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          &larr;
        </button>
        <span className="text-sm font-[family-name:var(--font-geist-mono)] tabular-nums">
          {weekOffset === 0 ? t('attendance.today', 'This Week') : `${weekOffset > 0 ? '+' : ''}${weekOffset}w`}
        </span>
        <button
          type="button"
          onClick={() => setWeekOffset((p) => p + 1)}
          className="rounded px-2 py-1 text-xs bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          &rarr;
        </button>
      </div>

      {/* ─── Attendance Table ────────────────────────────── */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('attendance.employee', 'Employee')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('attendance.date', 'Date')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('attendance.clockIn', 'Clock In')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('attendance.clockOut', 'Clock Out')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('attendance.hoursWorked', 'Hours')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('attendance.overtime', 'Overtime')}</th>
              <th className="px-4 py-3 text-start text-xs text-black/50 dark:text-white/50 font-medium">{t('attendance.overtimeRate', 'Rate')}</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((record) => {
              const otDisplay = record.overtimeType ? OVERTIME_RATE_DISPLAY[record.overtimeType] : null

              return (
                <tr key={record.id} className="border-b border-black/5 dark:border-white/5">
                  <td className="px-4 py-3 font-medium">{record.employeeName}</td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums text-black/60 dark:text-white/60">
                    {record.date}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {record.clockIn ?? '--:--'}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {record.clockOut ?? '--:--'}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    {record.hoursWorked > 0 ? record.hoursWorked.toFixed(1) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {record.overtime > 0 ? (
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[#2563EB]">
                        {record.overtime.toFixed(1)}h
                      </span>
                    ) : (
                      <span className="text-black/30 dark:text-white/30">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {otDisplay ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="text-black/60 dark:text-white/60">
                          {t(`attendance.${record.overtimeType}`, otDisplay.label)}
                        </span>
                        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-[#2563EB]">
                          {otDisplay.pct}
                        </span>
                      </span>
                    ) : (
                      <span className="text-black/30 dark:text-white/30">-</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Working Hours Note ──────────────────────────── */}
      <GlassPanel className="flex items-start gap-3">
        <svg className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
        </svg>
        <div className="text-xs text-black/60 dark:text-white/60 space-y-1">
          <p>{t('attendance.workingHoursNote', `Standard: ${WORKING_HOURS.standard_per_day}h/day, ${WORKING_HOURS.standard_per_week}h/week. Ramadan: ${WORKING_HOURS.ramadan_per_day}h/day. Weekend: Friday + Saturday.`)}</p>
          <div className="flex gap-4 mt-1">
            <span>{t('attendance.day', 'Day')}: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">{OVERTIME_RATES.day * 100}%</span></span>
            <span>{t('attendance.night', 'Night')}: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">{OVERTIME_RATES.night * 100}%</span></span>
            <span>{t('attendance.holiday', 'Holiday')}: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">{OVERTIME_RATES.holiday * 100}%</span></span>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
