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

  return (
    <div className="p-5 space-y-8 max-w-3xl">

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
            .map((holiday, i) => (
              <div
                key={`${holiday.date}-${i}`}
                className="flex items-center gap-3 py-2.5 border-b border-[var(--color-border)]/30"
              >
                <span className="text-[13px] text-[var(--color-text)] flex-1">
                  {holiday.name}
                  {holiday.days && holiday.days > 1 && (
                    <span className="ms-1.5 font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-subtle)]">
                      ({holiday.days}d)
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
            ))}
        </div>
      </section>
    </div>
  )
}
