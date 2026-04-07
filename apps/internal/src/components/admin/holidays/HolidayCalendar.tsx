import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getHolidayCalendar } from '../../../lib/server/admin'
import type { Holiday } from '../../../types/admin'

/**
 * HolidayCalendar — "The Year"
 * 12-month mini calendar grid. Holiday dates highlighted with blue dots.
 * Add holiday as inline date picker + name input.
 * Egyptian public holidays pre-marked.
 *
 * NOTE: Islamic dates are estimated until government announces based on moon sighting.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function HolidayCalendar() {
  const { t } = useTranslation('admin')
  const [year, setYear] = useState(2026)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmDate, setConfirmDate] = useState('')

  const { data: holidays } = useQuery({
    queryKey: ['admin', 'holidays'],
    queryFn: () => getHolidayCalendar(),
    staleTime: 60_000,
  })

  const filteredHolidays = (holidays ?? []).filter((h) => h.year === year)

  const handleConfirm = (holidayId: string) => {
    // In production, would call updateHolidayCalendar
    setConfirmingId(null)
    setConfirmDate('')
  }

  // Group holidays by month for the calendar
  const holidaysByMonth = filteredHolidays.reduce(
    (acc, h) => {
      const date = h.confirmedDate ?? h.estimatedDate
      const month = new Date(date).getMonth()
      if (!acc[month]) acc[month] = []
      acc[month].push(h)
      return acc
    },
    {} as Record<number, Holiday[]>,
  )

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
          {t('holidays.title', 'The Year')}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setYear((y: number) => y - 1)}
            className="w-6 h-6 flex items-center justify-center rounded text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-medium w-12 text-center">
            {year}
          </span>
          <button
            type="button"
            onClick={() => setYear((y: number) => y + 1)}
            className="w-6 h-6 flex items-center justify-center rounded text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>

      {/* 12-month mini calendar grid */}
      <div className="grid grid-cols-3 gap-3 lg:grid-cols-4 xl:grid-cols-6">
        {MONTHS.map((monthName, monthIndex) => {
          const monthHolidays = holidaysByMonth[monthIndex] ?? []
          const firstDay = new Date(year, monthIndex, 1).getDay()
          const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
          const holidayDays = new Set(
            monthHolidays.map((h) => new Date(h.confirmedDate ?? h.estimatedDate).getDate()),
          )
          const unconfirmedDays = new Set(
            monthHolidays
              .filter((h) => h.isIslamic && !h.confirmedDate)
              .map((h) => new Date(h.estimatedDate).getDate()),
          )

          return (
            <div key={monthIndex} className="border border-black/6 dark:border-white/6 rounded-lg p-2.5">
              <div className="text-[11px] font-semibold text-black/40 dark:text-white/40 mb-1.5">{monthName}</div>
              <div className="grid grid-cols-7 gap-px text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-[8px] text-black/20 dark:text-white/20 py-0.5">{d}</div>
                ))}
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const isHoliday = holidayDays.has(day)
                  const isUnconfirmed = unconfirmedDays.has(day)
                  return (
                    <div
                      key={day}
                      className="relative flex items-center justify-center py-0.5"
                    >
                      <span className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-[9px] leading-none ${
                        isHoliday ? 'font-semibold text-[#2563EB]' : 'text-black/40 dark:text-white/40'
                      }`}>
                        {day}
                      </span>
                      {isHoliday && (
                        <span className={`absolute -bottom-0.5 w-1 h-1 rounded-full ${
                          isUnconfirmed ? 'bg-amber-400' : 'bg-[#2563EB]'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Holiday names under calendar */}
              {monthHolidays.length > 0 && (
                <div className="mt-1.5 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.04] space-y-0.5">
                  {monthHolidays.map((h) => (
                    <div key={h.id} className="flex items-center gap-1 text-[9px] text-black/35 dark:text-white/35 truncate">
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums shrink-0">
                        {new Date(h.confirmedDate ?? h.estimatedDate).getDate()}
                      </span>
                      <span className="truncate">{h.nameAr}</span>
                      {h.isIslamic && !h.confirmedDate && (
                        <span className="text-amber-500 shrink-0">*</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Holiday list — for confirm actions */}
      <div className="border border-black/6 dark:border-white/6 rounded-lg overflow-hidden divide-y divide-black/[0.04] dark:divide-white/[0.04]">
        {filteredHolidays.map((holiday) => (
          <div key={holiday.id} className="flex items-center gap-3 px-4 py-2.5">
            {/* Type indicator */}
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              holiday.isIslamic ? 'bg-[#2563EB]' : 'bg-black/15 dark:bg-white/15'
            }`} />

            {/* Names */}
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium">{holiday.nameAr}</span>
              <span className="text-[11px] text-black/30 dark:text-white/30 ms-2">{holiday.name}</span>
            </div>

            {/* Date — mono */}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-black/50 dark:text-white/50 shrink-0">
              {holiday.estimatedDate}
            </span>

            {/* Confirmed date or confirm action */}
            {confirmingId === holiday.id ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="date"
                  value={confirmDate}
                  onChange={(e) => setConfirmDate(e.target.value)}
                  className="rounded border border-[#2563EB] bg-transparent px-1.5 py-0.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] outline-none"
                />
                <Button
                  onPress={() => handleConfirm(holiday.id)}
                  className="rounded bg-[#2563EB] px-2 py-0.5 text-[10px] text-white cursor-pointer outline-none"
                >
                  Save
                </Button>
                <Button
                  onPress={() => setConfirmingId(null)}
                  className="text-[10px] text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white cursor-pointer outline-none"
                >
                  Cancel
                </Button>
              </div>
            ) : holiday.confirmedDate ? (
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-green-600 dark:text-green-400 shrink-0">
                {holiday.confirmedDate}
              </span>
            ) : holiday.isIslamic ? (
              <Button
                onPress={() => { setConfirmingId(holiday.id); setConfirmDate('') }}
                className="text-[11px] text-[#2563EB]/70 hover:text-[#2563EB] cursor-pointer outline-none shrink-0"
              >
                {t('holidays.confirmDate', 'Confirm')}
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      {/* Add holiday inline */}
      <button
        type="button"
        className="w-full rounded-lg border border-dashed border-black/10 dark:border-white/10 py-2.5 text-xs text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50 hover:border-black/20 dark:hover:border-white/20 transition-colors cursor-pointer"
      >
        + {t('holidays.addHoliday', 'Add holiday')}
      </button>

      {/* Moon sighting note */}
      <p className="text-[10px] text-black/20 dark:text-white/20">
        * {t('holidays.moonSightingNote', 'Islamic dates estimated until government announces based on moon sighting')}
      </p>
    </div>
  )
}
