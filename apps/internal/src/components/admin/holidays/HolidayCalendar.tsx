import { useState, useMemo } from 'react'
import { Button as AriaButton, Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHolidayCalendar, updateHolidayCalendar, addHoliday, deleteHoliday } from '../../../lib/server/admin'
import { Button } from '../../ui/Button'
import { UnderlineInput } from '../../ui/UnderlineInput'
import type { Holiday } from '../../../types/admin'

/**
 * HolidayCalendar — "The Year"
 * 12-month mini calendar grid. Holiday dates highlighted with blue dots.
 * Next upcoming holiday shown prominently at top.
 * Islamic holidays have a clear "Confirm Date" button.
 *
 * NOTE: Islamic dates are estimated until government announces based on moon sighting.
 */

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function HolidayCalendar() {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [year, setYear] = useState(2026)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmDate, setConfirmDate] = useState('')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data: holidays } = useQuery({
    queryKey: ['admin', 'holidays'],
    queryFn: () => getHolidayCalendar(),
    staleTime: 60_000,
  })

  const confirmMutation = useMutation({
    mutationFn: (data: { holidayId: string; confirmedDate: string }) =>
      updateHolidayCalendar({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] })
      setConfirmingId(null)
      setConfirmDate('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (holidayId: string) => deleteHoliday({ data: { holidayId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] })
      setDeleteTarget(null)
    },
  })

  const filteredHolidays = (holidays ?? []).filter((h) => h.year === year)

  const handleConfirm = (holidayId: string) => {
    if (confirmDate) {
      confirmMutation.mutate({ holidayId, confirmedDate: confirmDate })
    }
  }

  // Next upcoming holiday (from today)
  const nextHoliday = useMemo(() => {
    const now = new Date()
    const upcoming = (holidays ?? [])
      .map((h) => ({
        ...h,
        date: new Date(h.confirmedDate ?? h.estimatedDate),
      }))
      .filter((h) => h.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    return upcoming[0] ?? null
  }, [holidays])

  // Days until next holiday
  const daysUntilNext = useMemo(() => {
    if (!nextHoliday) return null
    const now = new Date()
    const diff = nextHoliday.date.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }, [nextHoliday])

  // Count unconfirmed Islamic holidays
  const unconfirmedCount = useMemo(() => {
    return filteredHolidays.filter((h) => h.isIslamic && !h.confirmedDate).length
  }, [filteredHolidays])

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

      {/* Next upcoming holiday — prominent banner */}
      {nextHoliday && daysUntilNext !== null && (() => {
        const nextDate = new Date(nextHoliday.confirmedDate ?? nextHoliday.estimatedDate)
        const formattedDate = nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        return (
          <div className="border border-[#2563EB]/15 bg-[#2563EB]/[0.03] rounded-lg px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[#2563EB]/10 flex items-center justify-center shrink-0">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] font-bold text-[#2563EB]">
                  {nextDate.getDate()}
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold">
                  Next: {nextHoliday.name} ({formattedDate})
                </div>
                <div className="text-[12px] text-black/40 dark:text-white/40 mt-0.5">
                  {nextHoliday.nameAr !== nextHoliday.name && nextHoliday.nameAr}
                  {nextHoliday.isIslamic && !nextHoliday.confirmedDate && (
                    <span className="text-amber-600 dark:text-amber-400 ms-2">estimated date</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-end">
              <span className="text-[11px] text-black/30 dark:text-white/30">in</span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold ms-1.5">
                {daysUntilNext}
              </span>
              <span className="text-[12px] text-black/35 dark:text-white/35 ms-1">
                {daysUntilNext === 1 ? 'day' : 'days'}
              </span>
            </div>
          </div>
        )
      })()}

      {/* Unconfirmed Islamic holidays alert */}
      {unconfirmedCount > 0 && (
        <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/15 px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-amber-700 dark:text-amber-400">
            {unconfirmedCount} Islamic {unconfirmedCount === 1 ? 'holiday' : 'holidays'} pending date confirmation
          </span>
          <span className="text-[10px] text-amber-600/60 dark:text-amber-400/60">Moon sighting required</span>
        </div>
      )}

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
          <div key={holiday.id} className="group/hol flex items-center gap-3 px-4 py-2.5">
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
                <AriaButton
                  onPress={() => handleConfirm(holiday.id)}
                  isDisabled={!confirmDate || confirmMutation.isPending}
                  className="rounded bg-[#2563EB] px-2 py-0.5 text-[10px] text-white cursor-pointer outline-none data-[disabled]:opacity-50"
                >
                  Save
                </AriaButton>
                <AriaButton
                  onPress={() => setConfirmingId(null)}
                  className="text-[10px] text-black/30 dark:text-white/30 hover:text-black dark:hover:text-white cursor-pointer outline-none"
                >
                  Cancel
                </AriaButton>
              </div>
            ) : holiday.confirmedDate ? (
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-green-600 dark:text-green-400 shrink-0">
                {holiday.confirmedDate}
              </span>
            ) : holiday.isIslamic ? (
              <AriaButton
                onPress={() => { setConfirmingId(holiday.id); setConfirmDate('') }}
                className="rounded-full bg-[#2563EB] px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#2563EB]/90 cursor-pointer outline-none transition-colors shrink-0"
              >
                {t('holidays.confirmDate', 'Confirm Date')}
              </AriaButton>
            ) : null}

            {/* Delete — ghost, on hover */}
            <div className="opacity-0 group-hover/hol:opacity-100 transition-opacity shrink-0">
              <Button
                variant="ghost"
                className="!text-red-500/60 data-[hovered]:!text-red-600 !px-1.5"
                onPress={() => setDeleteTarget({ id: holiday.id, name: holiday.name })}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add holiday */}
      <button
        type="button"
        onClick={() => setAddDialogOpen(true)}
        className="w-full rounded-lg border border-dashed border-black/10 dark:border-white/10 py-2.5 text-xs text-black/30 dark:text-white/30 hover:text-black/50 dark:hover:text-white/50 hover:border-black/20 dark:hover:border-white/20 transition-colors cursor-pointer"
      >
        + {t('holidays.addHoliday', 'Add holiday')}
      </button>

      {/* Moon sighting note */}
      <p className="text-[10px] text-black/20 dark:text-white/20">
        * {t('holidays.moonSightingNote', 'Islamic dates estimated until government announces based on moon sighting')}
      </p>

      {/* Add Holiday Dialog */}
      <AddHolidayDialog isOpen={addDialogOpen} onClose={() => setAddDialogOpen(false)} year={year} />

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ModalOverlay
          isOpen
          onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
        >
          <Modal className="w-full max-w-sm rounded-2xl bg-white/90 dark:bg-black/90 border border-black/6 dark:border-white/6 p-6 shadow-xl">
            <Dialog className="outline-none" isKeyboardDismissDisabled>
              {() => (
                <div className="space-y-4">
                  <Heading slot="title" className="text-sm font-semibold">Delete Holiday</Heading>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    Remove <strong>{deleteTarget.name}</strong> from the calendar?
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onPress={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
                    <Button
                      variant="primary"
                      onPress={() => deleteMutation.mutate(deleteTarget.id)}
                      isDisabled={deleteMutation.isPending}
                      className="flex-1 !bg-red-600 data-[hovered]:!bg-red-700"
                    >
                      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              )}
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </div>
  )
}

// ─── Add Holiday Dialog ─────────────────────────────────

function AddHolidayDialog({ isOpen, onClose, year }: { isOpen: boolean; onClose: () => void; year: number }) {
  const { t } = useTranslation('admin')
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [type, setType] = useState<'fixed' | 'islamic'>('fixed')
  const [days, setDays] = useState('1')

  const mutation = useMutation({
    mutationFn: () => addHoliday({ data: { name, date, type, days: Number(days) } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] })
      handleClose()
    },
  })

  const handleClose = () => {
    setName('')
    setDate('')
    setType('fixed')
    setDays('1')
    onClose()
  }

  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) handleClose() }}
      isDismissable
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
    >
      <Modal className="w-full max-w-md rounded-2xl bg-white/90 dark:bg-black/90 border border-black/6 dark:border-white/6 p-6 shadow-xl">
        <Dialog className="outline-none" isKeyboardDismissDisabled>
          {() => (
            <div className="space-y-5">
              <Heading slot="title" className="text-sm font-semibold">
                {t('holidays.addHoliday', 'Add Holiday')}
              </Heading>
              <div className="space-y-4">
                <UnderlineInput label="Holiday Name" value={name} onChange={setName} placeholder="e.g. National Day" />
                <div className="space-y-1">
                  <span className="text-[11px] text-black/35 dark:text-white/35">Date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none dark:border-white/[0.04] font-[family-name:var(--font-geist-mono)]"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-black/35 dark:text-white/35">Type</span>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'fixed' | 'islamic')}
                    className="w-full border-b border-black/[0.04] bg-transparent py-1.5 text-[13px] outline-none dark:border-white/[0.04] cursor-pointer"
                  >
                    <option value="fixed">Fixed (Gregorian)</option>
                    <option value="islamic">Islamic (moon sighting)</option>
                  </select>
                </div>
                <UnderlineInput label="Duration (days)" value={days} onChange={setDays} placeholder="1" />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" onPress={handleClose} className="flex-1">Cancel</Button>
                <Button
                  variant="primary"
                  onPress={() => mutation.mutate()}
                  isDisabled={!name || !date || mutation.isPending}
                  className="flex-1"
                >
                  {mutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}
