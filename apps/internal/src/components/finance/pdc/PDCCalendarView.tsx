import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { ChequeRecord, ChequeStatus } from '../../../types/finance'
import { CurrencyCell } from '../shared/CurrencyCell'
import { StatusBadge } from '../shared/StatusBadge'

interface PDCCalendarViewProps {
  cheques: ChequeRecord[]
}

// Helpers
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DOT_COLORS: Record<ChequeStatus, string> = {
  received: 'bg-[#2563EB]',
  deposited: 'bg-orange-500',
  cleared: 'bg-green-500',
  bounced: 'bg-red-500',
  re_presented: 'bg-yellow-500',
  written_off: 'bg-black/30 dark:bg-white/30',
  replaced: 'bg-black/30 dark:bg-white/30',
}

/**
 * PDC Calendar View — monthly calendar with color-coded maturity dots.
 * Day click expands to show cheques due that day.
 * 3-day-before maturity highlight with amber background.
 * Due This Week summary at top.
 */
export function PDCCalendarView({ cheques }: PDCCalendarViewProps) {
  const { t, i18n } = useTranslation('finance')
  const isArabic = i18n.language === 'ar'

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Group cheques by maturity date key
  const chequesByDate = useMemo(() => {
    const map = new Map<string, ChequeRecord[]>()
    for (const c of cheques) {
      // Only show active cheques (not cleared/written_off/replaced)
      if (c.status === 'cleared' || c.status === 'written_off' || c.status === 'replaced') continue
      const key = c.maturityDate.slice(0, 10)
      const list = map.get(key) ?? []
      list.push(c)
      map.set(key, list)
    }
    return map
  }, [cheques])

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const first = startOfMonth(currentMonth)
    const last = endOfMonth(currentMonth)
    const days: (Date | null)[] = []

    // Fill leading empty cells (week starts Sunday)
    const startDay = first.getDay()
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    // Fill month days
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))
    }

    return days
  }, [currentMonth])

  // Due This Week (next 7 days)
  const now = Date.now()
  const weekMs = 7 * 86_400_000
  const threeDayMs = 3 * 86_400_000

  const dueThisWeekByDay = useMemo(() => {
    const result: { date: Date; cheques: ChequeRecord[]; total: number }[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(now + i * 86_400_000)
      const key = toDateKey(day)
      const dayCheques = chequesByDate.get(key) ?? []
      if (dayCheques.length > 0) {
        result.push({
          date: day,
          cheques: dayCheques,
          total: dayCheques.reduce((s, c) => s + c.amount, 0),
        })
      }
    }
    return result
  }, [chequesByDate, now])

  // Total maturity value this week
  const weekTotal = useMemo(
    () => dueThisWeekByDay.reduce((s, d) => s + d.total, 0),
    [dueThisWeekByDay],
  )

  const prevMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
    setSelectedDate(null)
  }
  const nextMonth = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
    setSelectedDate(null)
  }

  const monthLabel = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', {
    year: 'numeric',
    month: 'long',
  }).format(currentMonth)

  const dayNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', { weekday: 'short' })
    // Sunday=0 through Saturday=6
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(2024, 0, i) // Jan 2024 starts on Monday, but let's use a known Sunday
      // Jan 7 2024 is a Sunday
      const base = new Date(2024, 0, 7 + i)
      return formatter.format(base)
    })
  }, [isArabic])

  const formatDayDate = (d: Date) => {
    return new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(d)
  }

  const today = new Date()

  const selectedCheques = selectedDate ? chequesByDate.get(selectedDate) ?? [] : []

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* Due This Week summary */}
      {dueThisWeekByDay.length > 0 && (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-black dark:text-white">
              {t('pdc.dueThisWeek', 'Due This Week')}
            </span>
            <CurrencyCell amount={weekTotal} className="text-base" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {dueThisWeekByDay.map((day) => {
              const key = toDateKey(day.date)
              const isWithin3Days = day.date.getTime() - now <= threeDayMs
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={`rounded-lg border p-2 text-start transition-colors ${
                    isWithin3Days
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                      : 'border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60'
                  } hover:border-[#2563EB]/40`}
                >
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {formatDayDate(day.date)}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="font-[family-name:var(--font-geist-mono)] text-sm text-black dark:text-white">
                      {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(day.cheques.length)}
                    </span>
                    <div className="flex gap-0.5">
                      {day.cheques.slice(0, 3).map((c) => (
                        <div key={c.id} className={`size-1.5 rounded-full ${DOT_COLORS[c.status]}`} />
                      ))}
                    </div>
                  </div>
                  <CurrencyCell amount={day.total} className="text-xs" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
          <Button
            onPress={prevMonth}
            className="rounded-lg p-1.5 text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label={t('pdc.prevMonth', 'Previous month')}
          >
            <svg className="size-5 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
          <span className="text-sm font-medium text-black dark:text-white">{monthLabel}</span>
          <Button
            onPress={nextMonth}
            className="rounded-lg p-1.5 text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            aria-label={t('pdc.nextMonth', 'Next month')}
          >
            <svg className="size-5 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-black/10 dark:border-white/10">
          {dayNames.map((name) => (
            <div key={name} className="px-2 py-2 text-center text-xs font-medium text-black/40 dark:text-white/40">
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-[4.5rem] border-b border-e border-black/5 dark:border-white/5" />
            }

            const key = toDateKey(day)
            const dayCheques = chequesByDate.get(key) ?? []
            const isToday = isSameDay(day, today)
            const isSelected = selectedDate === key
            const maturityTime = day.getTime()
            const isWithin3Days = maturityTime >= now && maturityTime <= now + threeDayMs && dayCheques.length > 0

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : key)}
                className={`min-h-[4.5rem] border-b border-e border-black/5 dark:border-white/5 p-1.5 text-start transition-colors ${
                  isWithin3Days ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                } ${isSelected ? 'bg-[#2563EB]/5 ring-1 ring-inset ring-[#2563EB]/30' : ''} hover:bg-black/[0.02] dark:hover:bg-white/[0.02]`}
              >
                <span
                  className={`inline-flex items-center justify-center size-6 rounded-full text-xs font-[family-name:var(--font-geist-mono)] ${
                    isToday
                      ? 'bg-[#2563EB] text-white'
                      : 'text-black/70 dark:text-white/70'
                  }`}
                >
                  {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(day.getDate())}
                </span>
                {dayCheques.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {dayCheques.map((c) => (
                      <div
                        key={c.id}
                        className={`size-2 rounded-full ${DOT_COLORS[c.status]}`}
                        title={`${c.chequeNumber} - ${c.customerName}`}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected day expansion */}
      {selectedDate && selectedCheques.length > 0 && (
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4">
          <h3 className="text-sm font-medium text-black dark:text-white mb-3">
            {new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }).format(new Date(selectedDate))}
          </h3>
          <div className="space-y-2">
            {selectedCheques.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] px-3 py-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`size-2.5 rounded-full flex-shrink-0 ${DOT_COLORS[c.status]}`} />
                  <div className="min-w-0">
                    <span className="font-[family-name:var(--font-geist-mono)] text-sm text-black dark:text-white">
                      {c.chequeNumber}
                    </span>
                    <span className="text-sm text-black/50 dark:text-white/50 ms-2">
                      {c.customerName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <CurrencyCell amount={c.amount} />
                  <StatusBadge status={c.status} variant="cheque" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-black/50 dark:text-white/50">
        {(
          [
            ['received', 'Received'],
            ['deposited', 'Deposited'],
            ['bounced', 'Bounced'],
            ['re_presented', 'Re-presented'],
          ] as const
        ).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`size-2 rounded-full ${DOT_COLORS[status]}`} />
            <span>{t(`pdc.${status === 're_presented' ? 'rePres' : status}`, label)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
