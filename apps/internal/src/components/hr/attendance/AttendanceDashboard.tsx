import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getAttendance, clockInOut } from '../../../lib/server/hr'
import { OVERTIME_RATES, WORKING_HOURS } from '../../../types/hr'
import type { OvertimeType } from '../../../types/hr'

/**
 * Attendance Dashboard — "The Clock"
 * Calendar grid showing attendance for the month. Each cell: colored dot.
 * Summary strip below: total days, present %, late count.
 * Today's live check-ins/outs as a timeline.
 */
export function AttendanceDashboard() {
  const { t } = useTranslation('hr')
  const queryClient = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { data: attendance } = useQuery({
    queryKey: ['hr', 'attendance', selectedDate],
    queryFn: () => getAttendance({ data: selectedDate ? { date: selectedDate } : undefined }),
    staleTime: 15_000,
  })

  const clockMutation = useMutation({
    mutationFn: () => clockInOut({ data: { employeeId: 'emp-004', action: 'in' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] }),
  })

  if (!attendance) {
    return (
      <div className="p-5 text-center text-[var(--color-text-subtle)]">
        Loading...
      </div>
    )
  }

  // Summary stats
  const clockedIn = attendance.filter((a) => a.clockIn !== null).length
  const absentCount = attendance.filter((a) => a.clockIn === null).length
  const totalHours = attendance.reduce((sum, a) => sum + a.hoursWorked, 0)
  const overtimeHours = attendance.reduce((sum, a) => sum + a.overtime, 0)
  const lateArrivals = attendance.filter((a) => a.clockIn !== null && a.overtime > 0)
  const lateCount = lateArrivals.length

  // Calendar grid
  const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate()
  const firstDayOfWeek = new Date(selectedMonth.year, selectedMonth.month, 1).getDay()
  const monthName = new Date(selectedMonth.year, selectedMonth.month).toLocaleString('en', { month: 'long', year: 'numeric' })

  // Build calendar cells
  const cells: Array<{ day: number | null; status: 'present' | 'absent' | 'late' | 'leave' | null }> = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push({ day: null, status: null })
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const record = attendance.find((a) => a.date === dateStr)
    let status: 'present' | 'absent' | 'late' | 'leave' | null = null
    if (record) {
      if (record.clockIn) {
        status = record.overtime > 0 ? 'late' : 'present'
      } else {
        status = 'absent'
      }
    }
    cells.push({ day, status })
  }

  const cellDotColor: Record<string, string> = {
    present: 'bg-green-500',
    absent: 'bg-red-500',
    late: 'bg-amber-500',
    leave: 'bg-[var(--color-primary)]',
  }

  const prevMonth = () => {
    setSelectedMonth((prev: { year: number; month: number }) => {
      const m = prev.month - 1
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m }
    })
  }

  const nextMonth = () => {
    setSelectedMonth((prev: { year: number; month: number }) => {
      const m = prev.month + 1
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m }
    })
  }

  return (
    <div className="p-5 space-y-6">
      {/* Header + clock in */}
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
          {t('attendance.title', 'Attendance')}
        </div>
        <Button
          onPress={() => clockMutation.mutate()}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm text-white font-medium cursor-pointer hover:opacity-90 transition-opacity outline-none"
        >
          {t('attendance.clockInBtn', 'Clock In')}
        </Button>
      </div>

      {/* Today's summary — Present | Absent | Late (most important at a glance) */}
      <div className="rounded-xl border border-[var(--color-border)]/50 px-5 py-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
          {t('attendance.todaySummary', "Today's Summary")}
        </div>
        <div className="flex items-baseline gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-[family-name:var(--font-geist-mono)] tabular-nums text-green-600 dark:text-green-400">{clockedIn}</span>
            <span className="text-xs text-[var(--color-text-subtle)]">{t('attendance.present', 'Present')}</span>
          </div>
          <span className="text-[var(--color-border)]">|</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-[family-name:var(--font-geist-mono)] tabular-nums ${absentCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-[var(--color-text-subtle)]'}`}>{absentCount}</span>
            <span className="text-xs text-[var(--color-text-subtle)]">{t('attendance.absent', 'Absent')}</span>
          </div>
          <span className="text-[var(--color-border)]">|</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-[family-name:var(--font-geist-mono)] tabular-nums ${lateCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-text-subtle)]'}`}>{lateCount}</span>
            <span className="text-xs text-[var(--color-text-subtle)]">{t('attendance.late', 'Late')}</span>
          </div>
        </div>
      </div>

      {/* Late arrivals callout (if any) */}
      {lateArrivals.length > 0 && (
        <div className="rounded-xl bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400 mb-2">
            {t('attendance.lateArrivals', 'Late Arrivals')}
          </div>
          <div className="flex flex-col gap-1">
            {lateArrivals.map((record) => (
              <div key={record.id} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-sm text-[var(--color-text)]">{record.employeeName}</span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-amber-600 dark:text-amber-400">
                  {record.clockIn}
                </span>
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-muted)]">
                  +{record.overtime.toFixed(1)}h
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed stats */}
      <div className="flex items-baseline gap-8 border-b border-[var(--color-border)] pb-5">
        <StatCell label={t('attendance.totalHours', 'Total Hours')} value={totalHours.toFixed(1)} />
        <StatCell label={t('attendance.overtimeHours', 'Overtime')} value={overtimeHours.toFixed(1)} color="text-[var(--color-primary)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Calendar grid */}
        <div>
          {/* Month nav */}
          <div className="flex items-center gap-3 mb-4">
            <button type="button" onClick={prevMonth} className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer">
              &larr;
            </button>
            <span className="text-sm font-medium text-[var(--color-text)]">{monthName}</span>
            <button type="button" onClick={nextMonth} className="text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer">
              &rarr;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {/* Day headers */}
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-[10px] text-[var(--color-text-subtle)] text-center py-1 font-medium">
                {d}
              </div>
            ))}

            {/* Day cells */}
            {cells.map((cell, i) => {
              const dateStr = cell.day !== null
                ? `${selectedMonth.year}-${String(selectedMonth.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`
                : null
              const isSelected = dateStr !== null && selectedDate === dateStr

              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => { if (dateStr) setSelectedDate(isSelected ? null : dateStr) }}
                  className={`flex flex-col items-center justify-center py-2 rounded-lg transition-colors cursor-pointer
                    ${isSelected ? 'bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/30' : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'}
                    ${cell.day === null ? 'pointer-events-none' : ''}`}
                >
                  {cell.day !== null && (
                    <>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)]">
                        {cell.day}
                      </span>
                      {cell.status && (
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${cellDotColor[cell.status]}`} />
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-[var(--color-text-subtle)]">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Absent</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Late</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" /> Leave</span>
          </div>
        </div>

        {/* Today's timeline */}
        <div>
          <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-3">
            {selectedDate
              ? <>{t('attendance.checkinsFor', 'Check-ins for')} <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{selectedDate}</span></>
              : t('attendance.todayTimeline', 'Today\'s Check-ins')
            }
          </div>

          <div className="flex flex-col">
            {[...attendance]
              .filter((a) => a.clockIn !== null)
              .sort((a, b) => (b.overtime > 0 ? 1 : 0) - (a.overtime > 0 ? 1 : 0))
              .map((record) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, x: 4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12, ease: 'easeOut' }}
                  className="flex items-center gap-3 py-2 border-b border-[var(--color-border)]/30"
                >
                  <span className="text-sm text-[var(--color-text)] w-32 truncate">{record.employeeName}</span>
                  {record.overtime > 0 && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">Late</span>
                  )}
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)]">
                    {record.clockIn}
                  </span>
                  <span className="text-[var(--color-text-subtle)] text-xs">-</span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)]">
                    {record.clockOut ?? '--:--'}
                  </span>
                  <span className="flex-1" />
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text)]">
                    {record.hoursWorked > 0 ? `${record.hoursWorked.toFixed(1)}h` : '-'}
                  </span>
                  {record.overtime > 0 && (
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-primary)]">
                      +{record.overtime.toFixed(1)}h
                    </span>
                  )}
                </motion.div>
              ))}
          </div>
        </div>
      </div>

      {/* Working hours note */}
      <div className="flex items-center gap-4 text-[11px] text-[var(--color-text-subtle)] border-t border-[var(--color-border)] pt-4">
        <span>Standard: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-muted)]">{WORKING_HOURS.standard_per_day}h/day</span></span>
        <span>Ramadan: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-muted)]">{WORKING_HOURS.ramadan_per_day}h/day</span></span>
        <span>Day OT: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-muted)]">{OVERTIME_RATES.day * 100}%</span></span>
        <span>Night OT: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-muted)]">{OVERTIME_RATES.night * 100}%</span></span>
        <span>Holiday OT: <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-muted)]">{OVERTIME_RATES.holiday * 100}%</span></span>
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
        {label}
      </div>
      <div className={`text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums ${color ?? 'text-[var(--color-text)]'}`}>
        {value}
      </div>
    </div>
  )
}
