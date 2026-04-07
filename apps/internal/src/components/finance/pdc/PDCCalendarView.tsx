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

/** Status dot colors — semantic for DATA */
const DOT_COLORS: Record<ChequeStatus, string> = {
  received: 'bg-[#2563EB]',
  deposited: 'bg-[#2563EB]/50',
  cleared: 'bg-green-500',
  bounced: 'bg-red-500',
  re_presented: 'bg-yellow-500',
  written_off: 'bg-black/20 dark:bg-white/20',
  replaced: 'bg-black/20 dark:bg-white/20',
}

/**
 * PDC Calendar View — month calendar with cheque amounts as dots on due dates.
 * Color by status (pending=blue, cleared=green, bounced=red as DATA).
 * Click date to see cheques due. Minimal chrome.
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

    const startDay = first.getDay()
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }

    for (let d = 1; d <= last.getDate(); d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d))
    }

    return days
  }, [currentMonth])

  const now = Date.now()
  const threeDayMs = 3 * 86_400_000

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
    const formatter = new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', { weekday: 'narrow' })
    return Array.from({ length: 7 }, (_, i) => {
      const base = new Date(2024, 0, 7 + i) // Jan 7 2024 is a Sunday
      return formatter.format(base)
    })
  }, [isArabic])

  const todayDate = new Date()
  const selectedCheques = selectedDate ? chequesByDate.get(selectedDate) ?? [] : []

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {/* Calendar */}
      <div className="rounded-lg border border-black/10 dark:border-white/10">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/[0.04] dark:border-white/[0.04]">
          <Button
            onPress={prevMonth}
            className="rounded-md p-1 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors"
            aria-label={t('pdc.prevMonth', 'Previous month')}
          >
            <svg className="size-4 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
          <span className="text-xs font-medium text-black dark:text-white">{monthLabel}</span>
          <Button
            onPress={nextMonth}
            className="rounded-md p-1 text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] transition-colors"
            aria-label={t('pdc.nextMonth', 'Next month')}
          >
            <svg className="size-4 rtl:rotate-180" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7">
          {dayNames.map((name, i) => (
            <div key={`${name}-${i}`} className="px-1 py-2 text-center text-[10px] font-medium text-black/30 dark:text-white/30">
              {name}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="min-h-16 border-t border-e border-black/[0.03] dark:border-white/[0.03]" />
            }

            const key = toDateKey(day)
            const dayCheques = chequesByDate.get(key) ?? []
            const isToday = isSameDay(day, todayDate)
            const isSelected = selectedDate === key
            const maturityTime = day.getTime()
            const isUrgent = maturityTime >= now && maturityTime <= now + threeDayMs && dayCheques.length > 0

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(isSelected ? null : key)}
                className={`min-h-16 border-t border-e border-black/[0.03] dark:border-white/[0.03] p-1.5 text-start transition-colors ${
                  isUrgent ? 'bg-red-500/[0.03]' : ''
                } ${isSelected ? 'bg-[#2563EB]/[0.04] ring-1 ring-inset ring-[#2563EB]/20' : ''} hover:bg-black/[0.015] dark:hover:bg-white/[0.015]`}
              >
                {/* Day number */}
                <span
                  className={`inline-flex items-center justify-center size-5 rounded-full text-[10px] font-[family-name:var(--font-geist-mono)] tabular-nums ${
                    isToday
                      ? 'bg-[#2563EB] text-white'
                      : 'text-black/50 dark:text-white/50'
                  }`}
                >
                  {new Intl.NumberFormat(isArabic ? 'ar-EG' : 'en-EG').format(day.getDate())}
                </span>

                {/* Cheque dots */}
                {dayCheques.length > 0 && (
                  <div className="flex flex-wrap gap-[3px] mt-1">
                    {dayCheques.map((c) => (
                      <div
                        key={c.id}
                        className={`size-[5px] rounded-full ${DOT_COLORS[c.status]}`}
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
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-medium text-black/40 dark:text-white/40 mb-1">
            {new Intl.DateTimeFormat(isArabic ? 'ar-EG' : 'en-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }).format(new Date(selectedDate))}
          </div>
          {selectedCheques.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between py-2 border-b border-black/[0.03] dark:border-white/[0.03]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`size-2 rounded-full flex-shrink-0 ${DOT_COLORS[c.status]}`} />
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black dark:text-white">
                  {c.chequeNumber}
                </span>
                <span className="text-xs text-black/40 dark:text-white/40 truncate">
                  {c.customerName}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <CurrencyCell amount={c.amount} className="text-xs" />
                <StatusBadge status={c.status} variant="cheque" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend — ultra minimal */}
      <div className="flex items-center gap-4 text-[10px] text-black/30 dark:text-white/30">
        {(
          [
            ['received', 'Pending'],
            ['cleared', 'Cleared'],
            ['bounced', 'Bounced'],
          ] as const
        ).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`size-[5px] rounded-full ${DOT_COLORS[status]}`} />
            <span>{t(`pdc.${status}`, label)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
