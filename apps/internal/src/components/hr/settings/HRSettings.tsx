import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
import { Button, Toggle, UnderlineInput, Badge } from '../../ui'

// ─── Egyptian Holidays 2026 ──────────────────────────────

interface Holiday {
  name: string
  date: string
  type: 'fixed' | 'islamic'
  days?: number
}

const EGYPTIAN_HOLIDAYS_2026: Holiday[] = [
  { name: 'Coptic Christmas', date: '2026-01-07', type: 'fixed' },
  { name: 'Revolution Day', date: '2026-01-25', type: 'fixed' },
  { name: 'Eid al-Fitr', date: '2026-03-20', type: 'islamic', days: 3 },
  { name: 'Sinai Liberation', date: '2026-04-25', type: 'fixed' },
  { name: 'Labour Day', date: '2026-05-01', type: 'fixed' },
  { name: 'Eid al-Adha', date: '2026-05-27', type: 'islamic', days: 4 },
  { name: 'Islamic New Year', date: '2026-06-17', type: 'islamic' },
  { name: 'June 30 Revolution', date: '2026-06-30', type: 'fixed' },
  { name: 'July 23 Revolution', date: '2026-07-23', type: 'fixed' },
  { name: "Prophet's Birthday", date: '2026-08-27', type: 'islamic' },
  { name: 'Armed Forces Day', date: '2026-10-06', type: 'fixed' },
]

// ─── Component ───────────────────────────────────────────

export function HRSettings() {
  const { t } = useTranslation('hr')

  // Working hours state
  const [standardHours, setStandardHours] = useState(8)
  const [ramadanHours, setRamadanHours] = useState(6)
  const [weekStart, setWeekStart] = useState<'sun' | 'mon'>('sun')
  const [weekendFri, setWeekendFri] = useState(true)
  const [weekendSat, setWeekendSat] = useState(true)
  const [hoursSaved, setHoursSaved] = useState(false)

  // Holiday calendar state
  const [holidays, setHolidays] = useState<Holiday[]>(EGYPTIAN_HOLIDAYS_2026)
  const [showAddHoliday, setShowAddHoliday] = useState(false)
  const [newHolidayName, setNewHolidayName] = useState('')
  const [newHolidayDate, setNewHolidayDate] = useState('')

  function saveWorkingHours() {
    setHoursSaved(true)
    setTimeout(() => setHoursSaved(false), 2000)
  }

  function addHoliday() {
    if (!newHolidayName.trim() || !newHolidayDate) return
    setHolidays((prev: Holiday[]) => [
      ...prev,
      { name: newHolidayName.trim(), date: newHolidayDate, type: 'fixed' },
    ])
    setNewHolidayName('')
    setNewHolidayDate('')
    setShowAddHoliday(false)
  }

  // Compute next upcoming holiday
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]!
  const upcomingHolidays = holidays
    .filter((h) => h.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
  const nextHoliday = upcomingHolidays[0] ?? null
  const daysUntilNext = nextHoliday
    ? Math.ceil((new Date(nextHoliday.date).getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
    : null

  return (
    <div className="p-5 space-y-8 max-w-3xl">

      {/* Next holiday banner */}
      {nextHoliday && daysUntilNext !== null && (
        <div className="rounded-xl border border-[var(--color-border)]/50 bg-[var(--color-primary)]/[0.03] px-5 py-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-subtle)] mb-1">
              {t('settings.nextHoliday', 'Next Holiday')}
            </div>
            <div className="text-sm font-medium text-[var(--color-text)]">
              {nextHoliday.name}
              {nextHoliday.days && nextHoliday.days > 1 && (
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-muted)] ms-1.5">
                  ({nextHoliday.days}d)
                </span>
              )}
            </div>
            <div className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-muted)] mt-0.5">
              {nextHoliday.date}
            </div>
          </div>
          <div className="text-end">
            <div className="text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-primary)]">
              {daysUntilNext}
            </div>
            <div className="text-[10px] text-[var(--color-text-subtle)]">
              {daysUntilNext === 0 ? t('settings.today', 'today') : daysUntilNext === 1 ? t('settings.tomorrow', 'tomorrow') : t('settings.daysAway', 'days away')}
            </div>
          </div>
        </div>
      )}

      {/* Section A: Working Hours */}
      <section>
        <h3 className="text-[14px] font-semibold text-[var(--color-text)] mb-4">
          {t('settings.workingHours', 'Working Hours')}
        </h3>

        <div className="space-y-4">
          {/* Standard hours */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--color-text)]">
              {t('settings.standardHours', 'Standard hours per day')}
            </span>
            <input
              type="number"
              min={1}
              max={12}
              value={standardHours}
              onChange={(e) => setStandardHours(Number(e.target.value))}
              className="w-16 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 text-center font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
            />
          </div>

          {/* Ramadan hours */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--color-text)]">
              {t('settings.ramadanHours', 'Ramadan hours per day')}
            </span>
            <input
              type="number"
              min={1}
              max={12}
              value={ramadanHours}
              onChange={(e) => setRamadanHours(Number(e.target.value))}
              className="w-16 rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 text-center font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
            />
          </div>

          {/* Work week start */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--color-text)]">
              {t('settings.weekStart', 'Work week starts')}
            </span>
            <div className="flex gap-1">
              {(['sun', 'mon'] as const).map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setWeekStart(day)}
                  className={`rounded-full px-3 py-1 text-[12px] font-medium cursor-pointer transition-all
                    ${weekStart === day
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-black/[0.04] text-[var(--color-text-muted)] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]'
                    }`}
                >
                  {day === 'sun' ? 'Sunday' : 'Monday'}
                </button>
              ))}
            </div>
          </div>

          {/* Weekend days */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] text-[var(--color-text)]">
              {t('settings.weekendDays', 'Weekend days')}
            </span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weekendFri}
                  onChange={(e) => setWeekendFri(e.target.checked)}
                  className="accent-[var(--color-primary)]"
                />
                <span className="text-[12px] text-[var(--color-text-muted)]">Friday</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={weekendSat}
                  onChange={(e) => setWeekendSat(e.target.checked)}
                  className="accent-[var(--color-primary)]"
                />
                <span className="text-[12px] text-[var(--color-text-muted)]">Saturday</span>
              </label>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-2 pt-2">
            <Button variant="subtle" onPress={saveWorkingHours}>
              {t('settings.save', 'Save')}
            </Button>
            <AnimatePresence>
              {hoursSaved && (
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
        </div>
      </section>

      {/* Section B: Holiday Calendar */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold text-[var(--color-text)]">
            {t('settings.holidayCalendar', 'Holiday Calendar')}
          </h3>
          <Button variant="subtle" onPress={() => setShowAddHoliday(!showAddHoliday)}>
            {showAddHoliday ? t('settings.cancel', 'Cancel') : t('settings.addHoliday', 'Add Holiday')}
          </Button>
        </div>

        {/* Add holiday form */}
        <AnimatePresence>
          {showAddHoliday && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden mb-4"
            >
              <div className="flex items-end gap-3 rounded-xl border border-[var(--color-border)] p-3">
                <div className="flex-1">
                  <UnderlineInput
                    value={newHolidayName}
                    onChange={setNewHolidayName}
                    placeholder="Holiday name..."
                    label="Holiday name"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1 font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/40"
                  />
                </div>
                <Button
                  variant="primary"
                  isDisabled={!newHolidayName.trim() || !newHolidayDate}
                  onPress={addHoliday}
                >
                  Add
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Islamic note */}
        <div className="text-[11px] text-[var(--color-text-subtle)] mb-3 italic">
          Islamic holidays: date may shift +/-1-2 days based on moon sighting
        </div>

        {/* Holiday list */}
        <div className="flex flex-col">
          {holidays
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((holiday, i) => {
              const isPast = holiday.date < todayStr
              const isNext = nextHoliday?.date === holiday.date && nextHoliday?.name === holiday.name

              return (
                <div
                  key={`${holiday.date}-${i}`}
                  className={`flex items-center gap-3 py-2.5 border-b border-[var(--color-border)]/30 transition-colors
                    ${isPast ? 'opacity-40' : ''}
                    ${isNext ? 'bg-[var(--color-primary)]/[0.03] rounded-lg px-2 -mx-2' : ''}`}
                >
                  <span className="text-[13px] text-[var(--color-text)] flex-1">
                    {holiday.name}
                    {holiday.days && holiday.days > 1 && (
                      <span className="ms-1.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)]">
                        ({holiday.days}d)
                      </span>
                    )}
                    {isNext && (
                      <span className="ms-2 text-[10px] font-medium text-[var(--color-primary)] uppercase tracking-wider">
                        Next
                      </span>
                    )}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px] text-[var(--color-text-muted)]">
                    {holiday.date}
                  </span>
                  <Badge
                    variant="status"
                    color={holiday.type === 'islamic' ? 'blue' : 'neutral'}
                  >
                    {holiday.type === 'islamic' ? 'Islamic — may shift' : 'Fixed'}
                  </Badge>
                </div>
              )
            })}
        </div>
      </section>
    </div>
  )
}
