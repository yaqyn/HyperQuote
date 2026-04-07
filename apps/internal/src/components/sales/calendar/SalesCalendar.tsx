import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, ToggleButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getActivityFeed } from '../../../lib/server/sales-activity'

type CalendarView = 'day' | 'week' | 'month'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  hour?: number
  type: 'customer_meeting' | 'site_visit' | 'quote_deadline' | 'overdue_followup' | 'internal_meeting'
  entityId: string | null
  entityUrl: string | null
}

// Semantic dot colors for DATA only -- not UI chrome
const EVENT_DOT: Record<CalendarEvent['type'], { color: string; label: string }> = {
  customer_meeting: { color: 'bg-blue-500', label: 'Customer Meeting' },
  site_visit: { color: 'bg-green-500', label: 'Site Visit' },
  quote_deadline: { color: 'bg-orange-500', label: 'Quote Deadline' },
  overdue_followup: { color: 'bg-red-500', label: 'Overdue Follow-up' },
  internal_meeting: { color: 'bg-purple-500', label: 'Internal Meeting' },
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7AM - 7PM

function getWeekDates(date: Date): Date[] {
  const start = new Date(date)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const start = new Date(firstDay)
  start.setDate(start.getDate() - startOffset)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatHour(h: number): string {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

// ─── Hover Tooltip ──────────────────────────────────────────

function EventTooltip({ event }: { event: CalendarEvent }) {
  const dot = EVENT_DOT[event.type]
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="pointer-events-none absolute start-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-black/[0.06] bg-white/90 p-3 shadow-lg backdrop-blur-2xl dark:border-white/[0.06] dark:bg-black/90"
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1 size-2 shrink-0 rounded-full ${dot.color}`} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--color-text)]">{event.title}</p>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">{dot.label}</p>
          {event.hour != null && (
            <p className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
              {formatHour(event.hour)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Event Dot (hover to reveal) ────────────────────────────

function EventDot({ event }: { event: CalendarEvent }) {
  const [hovered, setHovered] = useState(false)
  const dot = EVENT_DOT[event.type]

  return (
    <div
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => event.entityUrl && (window.location.href = event.entityUrl)}
        className={`size-2.5 rounded-full transition-transform ${dot.color} ${event.entityUrl ? 'cursor-pointer hover:scale-150' : 'cursor-default'}`}
        aria-label={event.title}
      />
      <AnimatePresence>
        {hovered && <EventTooltip event={event} />}
      </AnimatePresence>
    </div>
  )
}

// ─── Day View — Vertical Timeline ───────────────────────────

function DayView({ events, date }: { events: CalendarEvent[]; date: Date }) {
  const dayEvents = events.filter((e) => isSameDay(e.date, date))

  return (
    <div className="relative">
      {HOURS.map((hour) => {
        const hourEvents = dayEvents.filter((e) => (e.hour ?? e.date.getHours()) === hour)
        return (
          <div key={hour} className="flex min-h-[48px] border-b border-black/[0.03] dark:border-white/[0.03]">
            {/* Time marker */}
            <div className="w-16 shrink-0 py-2 pe-3 text-end">
              <span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
                {formatHour(hour)}
              </span>
            </div>
            {/* Event bars */}
            <div className="flex flex-1 flex-col gap-1 py-1.5 ps-3">
              {hourEvents.map((event) => {
                const dot = EVENT_DOT[event.type]
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => event.entityUrl && (window.location.href = event.entityUrl)}
                    className={`group flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors ${event.entityUrl ? 'cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.03]' : 'cursor-default'}`}
                  >
                    <span className={`size-2 shrink-0 rounded-full ${dot.color}`} />
                    <span className="truncate text-[13px] text-[var(--color-text)]">
                      {event.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Week View — Dot Clusters ───────────────────────────────

function WeekView({ events, currentDate }: { events: CalendarEvent[]; currentDate: Date }) {
  const today = new Date()
  const weekDates = getWeekDates(currentDate)

  return (
    <div className="grid grid-cols-7">
      {weekDates.map((date) => {
        const dayEvents = events.filter((e) => isSameDay(e.date, date))
        const isToday = isSameDay(date, today)

        return (
          <div
            key={date.toISOString()}
            className={[
              'flex min-h-[140px] flex-col border-e border-b border-black/[0.04] p-3 dark:border-white/[0.04]',
              isToday ? 'border-s-2 border-s-[var(--color-primary)]' : '',
            ].join(' ')}
          >
            {/* Day header */}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--color-text-subtle)]">
                {DAYS_OF_WEEK[date.getDay()]}
              </span>
              <span
                className={[
                  'font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums',
                  isToday
                    ? 'flex size-6 items-center justify-center rounded-full bg-[var(--color-primary)] font-semibold text-white'
                    : 'text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                {date.getDate()}
              </span>
            </div>

            {/* Dot cluster */}
            <div className="flex flex-wrap gap-1.5">
              {dayEvents.map((event) => (
                <EventDot key={event.id} event={event} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Month View — Minimal Grid with Dots ────────────────────

function MonthView({ events, currentDate }: { events: CalendarEvent[]; currentDate: Date }) {
  const today = new Date()
  const monthDates = getMonthDates(currentDate)

  return (
    <div>
      {/* Day names */}
      <div className="grid grid-cols-7">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="py-2 text-center text-[11px] font-medium text-[var(--color-text-subtle)]">
            {day}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 border-t border-black/[0.04] dark:border-white/[0.04]">
        {monthDates.map((date) => {
          const isCurrentMonth = date.getMonth() === currentDate.getMonth()
          const isToday = isSameDay(date, today)
          const dayEvents = events.filter((e) => isSameDay(e.date, date))

          return (
            <div
              key={date.toISOString()}
              className={[
                'flex min-h-[72px] flex-col items-center border-b border-e border-black/[0.04] py-2 dark:border-white/[0.04]',
                !isCurrentMonth ? 'opacity-20' : '',
              ].join(' ')}
            >
              {/* Day number */}
              <span
                className={[
                  'font-[family-name:var(--font-geist-mono)] tabular-nums',
                  isToday
                    ? 'flex size-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-[15px] font-bold text-white'
                    : 'text-[13px] text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                {date.getDate()}
              </span>

              {/* Event dots -- no text, just dots */}
              {dayEvents.length > 0 && (
                <div className="mt-1.5 flex gap-1">
                  {dayEvents.slice(0, 4).map((event) => (
                    <EventDot key={event.id} event={event} />
                  ))}
                  {dayEvents.length > 4 && (
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
                      +{dayEvents.length - 4}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────

export function SalesCalendar() {
  const { t } = useTranslation('internal')
  const [view, setView] = useState<CalendarView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()

  const { data } = useQuery({
    queryKey: ['sales-activity-calendar'],
    queryFn: () => getActivityFeed({ data: { page: 1, limit: 50 } }),
    staleTime: 60_000,
  })

  const events: CalendarEvent[] = useMemo(() => {
    const activities = data?.activities ?? []
    const mapped: CalendarEvent[] = []

    for (const activity of activities) {
      const date = new Date(activity.timestamp)
      let type: CalendarEvent['type'] = 'internal_meeting'

      if (activity.type === 'rfq_new') type = 'customer_meeting'
      else if (activity.type === 'delivery_confirmed') type = 'site_visit'
      else if (activity.type === 'quote_sent' || activity.type === 'quote_viewed') type = 'quote_deadline'
      else if (activity.type === 'quote_lost') type = 'overdue_followup'
      else if (activity.type === 'approval_requested') type = 'internal_meeting'

      mapped.push({
        id: activity.id,
        title: activity.description.slice(0, 60),
        date,
        hour: date.getHours(),
        type,
        entityId: activity.entityId,
        entityUrl: activity.actionUrl,
      })
    }

    const addDays = (d: number) => new Date(Date.now() + d * 86_400_000)
    mapped.push(
      { id: 'cal-1', title: 'Al-Nour Construction -- quarterly review', date: addDays(1), hour: 10, type: 'customer_meeting', entityId: 'cust-001', entityUrl: null },
      { id: 'cal-2', title: 'Heliopolis site inspection', date: addDays(2), hour: 14, type: 'site_visit', entityId: 'cust-007', entityUrl: null },
      { id: 'cal-3', title: 'QT-2026-00520 expires', date: addDays(3), hour: 17, type: 'quote_deadline', entityId: 'qt-108', entityUrl: null },
      { id: 'cal-4', title: 'Follow up Maadi Engineering', date: addDays(-1), hour: 9, type: 'overdue_followup', entityId: 'cust-008', entityUrl: null },
      { id: 'cal-5', title: 'Sales team standup', date: addDays(1), hour: 9, type: 'internal_meeting', entityId: null, entityUrl: null },
    )

    return mapped
  }, [data?.activities])

  const navigate = (direction: number) => {
    const next = new Date(currentDate)
    if (view === 'day') next.setDate(next.getDate() + direction)
    else if (view === 'week') next.setDate(next.getDate() + 7 * direction)
    else next.setMonth(next.getMonth() + direction)
    setCurrentDate(next)
  }

  const formatHeader = () => {
    const opts: Intl.DateTimeFormatOptions =
      view === 'day'
        ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
        : { month: 'long', year: 'numeric' }
    return currentDate.toLocaleDateString('en-US', opts)
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-4">
          <h2 className="text-[15px] font-semibold text-[var(--color-text)]">{formatHeader()}</h2>

          <div className="flex items-center gap-1">
            <Button
              onPress={() => navigate(-1)}
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] outline-none transition-colors data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              onPress={() => navigate(1)}
              className="rounded-lg p-1.5 text-[var(--color-text-muted)] outline-none transition-colors data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Today pill */}
          <Button
            onPress={() => setCurrentDate(new Date())}
            className="rounded-full border border-black/[0.08] px-3 py-1 text-[11px] font-medium text-[var(--color-text-muted)] outline-none transition-colors data-[hovered]:bg-black/[0.04] dark:border-white/[0.08] dark:data-[hovered]:bg-white/[0.04]"
          >
            {t('sales.calendar.today', 'Today')}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle -- pill group */}
          <div className="flex rounded-full bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
            {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
              <ToggleButton
                key={v}
                isSelected={view === v}
                onChange={() => setView(v)}
                className={[
                  'rounded-full px-3.5 py-1 text-[11px] font-medium capitalize outline-none transition-colors',
                  view === v
                    ? 'bg-[var(--color-text)] text-white dark:bg-white dark:text-black'
                    : 'text-[var(--color-text-subtle)] data-[hovered]:text-[var(--color-text-muted)]',
                ].join(' ')}
              >
                {v}
              </ToggleButton>
            ))}
          </div>

          <Button
            onPress={() => {
              // Placeholder: open add event form
            }}
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-primary)] px-3.5 py-1.5 text-[11px] font-medium text-white outline-none transition-colors data-[hovered]:bg-[var(--color-primary)]/90"
          >
            <Plus className="size-3" />
            {t('sales.calendar.addEvent', 'Add Event')}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-5 border-b border-black/[0.04] px-5 pb-3 dark:border-white/[0.04]">
        {Object.entries(EVENT_DOT).map(([type, config]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${config.color}`} />
            <span className="text-[11px] text-[var(--color-text-subtle)]">{config.label}</span>
          </div>
        ))}
      </div>

      {/* View content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {view === 'day' && <DayView events={events} date={currentDate} />}
          {view === 'week' && <WeekView events={events} currentDate={currentDate} />}
          {view === 'month' && <MonthView events={events} currentDate={currentDate} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
