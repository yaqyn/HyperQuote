import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getHolidayCalendar } from '../../../lib/server/admin'
import type { Holiday } from '../../../types/admin'

/**
 * Holiday calendar with year selector, list/calendar view.
 * 14-15 Egyptian public holidays pre-loaded.
 * Islamic holidays have estimatedDate + confirmedDate (moon sighting).
 * "Confirm Date" button opens date picker for Islamic holidays.
 *
 * NOTE: Islamic dates are estimated until government announces based on moon sighting.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function HolidayCalendar() {
  const { t } = useTranslation('admin')
  const [year, setYear] = useState(2026)
  const [view, setView] = useState<'list' | 'calendar'>('list')
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('holidays.title', 'Holiday Calendar')}</h2>
        <div className="flex items-center gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-black/50 dark:text-white/50">{t('holidays.year', 'Year')}:</span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg border border-black/10 dark:border-white/10 bg-white/80 dark:bg-black/80 px-3 py-1.5 text-sm font-[family-name:var(--font-geist-mono)] tabular-nums outline-none"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                view === 'list' ? 'bg-[#2563EB] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {t('holidays.listView', 'List View')}
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                view === 'calendar' ? 'bg-[#2563EB] text-white' : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {t('holidays.calendarView', 'Calendar View')}
            </button>
          </div>
        </div>
      </div>

      {/* Moon sighting note */}
      <p className="text-xs text-black/40 dark:text-white/40 italic">
        {t('holidays.moonSightingNote', 'Islamic dates are estimated until government announces based on moon sighting')}
      </p>

      {view === 'list' ? (
        <HolidayListView
          holidays={filteredHolidays}
          confirmingId={confirmingId}
          confirmDate={confirmDate}
          onStartConfirm={(id) => { setConfirmingId(id); setConfirmDate(''); }}
          onConfirmDateChange={setConfirmDate}
          onConfirm={handleConfirm}
          onCancelConfirm={() => setConfirmingId(null)}
        />
      ) : (
        <HolidayCalendarView holidays={filteredHolidays} year={year} />
      )}
    </div>
  )
}

// ─── List View ──────────────────────────────────────────

function HolidayListView({
  holidays,
  confirmingId,
  confirmDate,
  onStartConfirm,
  onConfirmDateChange,
  onConfirm,
  onCancelConfirm,
}: {
  holidays: Holiday[]
  confirmingId: string | null
  confirmDate: string
  onStartConfirm: (id: string) => void
  onConfirmDateChange: (date: string) => void
  onConfirm: (id: string) => void
  onCancelConfirm: () => void
}) {
  const { t } = useTranslation('admin')

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10">
            <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('holidays.name', 'Holiday')}</th>
            <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('holidays.estimatedDate', 'Estimated Date')}</th>
            <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50">{t('holidays.confirmedDate', 'Confirmed Date')}</th>
            <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50" />
            <th className="px-4 py-3 text-start font-medium text-black/50 dark:text-white/50" />
          </tr>
        </thead>
        <tbody>
          {holidays.map((holiday) => (
            <tr key={holiday.id} className="border-b border-black/5 dark:border-white/5">
              <td className="px-4 py-3">
                <div>
                  <span className="font-medium">{holiday.nameAr}</span>
                  <span className="ms-2 text-black/40 dark:text-white/40">{holiday.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 font-[family-name:var(--font-geist-mono)] tabular-nums">
                {holiday.estimatedDate}
              </td>
              <td className="px-4 py-3">
                {confirmingId === holiday.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={confirmDate}
                      onChange={(e) => onConfirmDateChange(e.target.value)}
                      className="rounded border border-[#2563EB] bg-transparent px-2 py-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-sm outline-none"
                    />
                    <Button
                      onPress={() => onConfirm(holiday.id)}
                      className="rounded bg-[#2563EB] px-2 py-1 text-xs text-white cursor-pointer outline-none"
                    >
                      {t('approvals.save', 'Save')}
                    </Button>
                    <Button
                      onPress={onCancelConfirm}
                      className="rounded px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer outline-none"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : holiday.confirmedDate ? (
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-green-600 dark:text-green-400">
                    {holiday.confirmedDate}
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    {t('holidays.pendingConfirmation', 'Pending confirmation')}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  holiday.isIslamic
                    ? 'bg-[#2563EB]/10 text-[#2563EB]'
                    : 'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50'
                }`}>
                  {holiday.isIslamic ? t('holidays.islamic', 'Islamic') : t('holidays.fixed', 'Fixed')}
                </span>
              </td>
              <td className="px-4 py-3">
                {holiday.isIslamic && !holiday.confirmedDate && confirmingId !== holiday.id && (
                  <Button
                    onPress={() => onStartConfirm(holiday.id)}
                    className="rounded-md px-2 py-1 text-xs text-[#2563EB] hover:bg-[#2563EB]/5 cursor-pointer outline-none"
                  >
                    {t('holidays.confirmDate', 'Confirm Date')}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Calendar View ──────────────────────────────────────

function HolidayCalendarView({
  holidays,
  year,
}: {
  holidays: Holiday[]
  year: number
}) {
  const holidaysByMonth = holidays.reduce(
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {MONTHS.map((monthName, monthIndex) => {
        const monthHolidays = holidaysByMonth[monthIndex] ?? []
        const firstDay = new Date(year, monthIndex, 1).getDay()
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
        const holidayDays = new Set(
          monthHolidays.map((h) => new Date(h.confirmedDate ?? h.estimatedDate).getDate()),
        )

        return (
          <div
            key={monthIndex}
            className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-3"
          >
            <h4 className="text-sm font-semibold mb-2">{monthName}</h4>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={`${d}-${i}`} className="text-black/30 dark:text-white/30 py-1">{d}</div>
              ))}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const isHoliday = holidayDays.has(day)
                return (
                  <div
                    key={day}
                    className={`py-1 rounded font-[family-name:var(--font-geist-mono)] tabular-nums ${
                      isHoliday
                        ? 'bg-[#2563EB] text-white font-medium'
                        : 'text-black/70 dark:text-white/70'
                    }`}
                  >
                    {day}
                  </div>
                )
              })}
            </div>
            {monthHolidays.length > 0 && (
              <div className="mt-2 space-y-1">
                {monthHolidays.map((h) => (
                  <div key={h.id} className="text-xs text-black/50 dark:text-white/50 truncate">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                      {new Date(h.confirmedDate ?? h.estimatedDate).getDate()}
                    </span>
                    {' '}{h.nameAr}
                    {h.isIslamic && !h.confirmedDate && (
                      <span className="ms-1 text-amber-600 dark:text-amber-400">*</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
