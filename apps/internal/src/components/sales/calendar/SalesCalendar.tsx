import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, ToggleButton } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { getActivityFeed } from '../../../lib/server/sales-activity'

type CalendarView = 'week' | 'day' | 'month'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  type: 'customer_meeting' | 'site_visit' | 'quote_deadline' | 'overdue_followup' | 'internal_meeting'
  entityId: string | null
  entityUrl: string | null
}

const EVENT_COLORS: Record<CalendarEvent['type'], { bg: string; text: string; label: string }> = {
  customer_meeting: { bg: 'bg-blue-500/15', text: 'text-blue-600 dark:text-blue-400', label: 'Customer Meeting' },
  site_visit: { bg: 'bg-green-500/15', text: 'text-green-600 dark:text-green-400', label: 'Site Visit' },
  quote_deadline: { bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', label: 'Quote Deadline' },
  overdue_followup: { bg: 'bg-red-500/15', text: 'text-red-600 dark:text-red-400', label: 'Overdue Follow-up' },
  internal_meeting: { bg: 'bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400', label: 'Internal Meeting' },
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
  // 6 weeks grid
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function SalesCalendar() {
  const { t } = useTranslation('internal')
  const [view, setView] = useState<CalendarView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = new Date()

  // Fetch activity events and map to calendar events
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
        type,
        entityId: activity.entityId,
        entityUrl: activity.actionUrl,
      })
    }

    // Add some mock future events
    const addDays = (d: number) => new Date(Date.now() + d * 86_400_000)
    mapped.push(
      { id: 'cal-1', title: 'Al-Nour Construction -- quarterly review', date: addDays(1), type: 'customer_meeting', entityId: 'cust-001', entityUrl: null },
      { id: 'cal-2', title: 'Heliopolis site inspection', date: addDays(2), type: 'site_visit', entityId: 'cust-007', entityUrl: null },
      { id: 'cal-3', title: 'QT-2026-00520 expires', date: addDays(3), type: 'quote_deadline', entityId: 'qt-108', entityUrl: null },
      { id: 'cal-4', title: 'Follow up Maadi Engineering', date: addDays(-1), type: 'overdue_followup', entityId: 'cust-008', entityUrl: null },
      { id: 'cal-5', title: 'Sales team standup', date: addDays(1), type: 'internal_meeting', entityId: null, entityUrl: null },
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
        : view === 'week'
          ? { month: 'long', year: 'numeric' }
          : { month: 'long', year: 'numeric' }
    return currentDate.toLocaleDateString('en-US', opts)
  }

  const getEventsForDate = (date: Date) => events.filter((e) => isSameDay(e.date, date))

  const renderEvent = (event: CalendarEvent) => {
    const colors = EVENT_COLORS[event.type]
    return (
      <button
        key={event.id}
        type="button"
        onClick={() => event.entityUrl && (window.location.href = event.entityUrl)}
        className={`w-full truncate rounded px-1.5 py-0.5 text-start text-[11px] leading-tight ${colors.bg} ${colors.text} ${event.entityUrl ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
        title={event.title}
      >
        {event.title}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{formatHeader()}</h2>
          <div className="flex gap-1">
            <Button
              onPress={() => navigate(-1)}
              className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              onPress={() => navigate(1)}
              className="rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              onPress={() => setCurrentDate(new Date())}
              className="rounded-md px-2 py-1 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5"
            >
              {t('sales.calendar.today', 'Today')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-black/10 dark:border-white/10">
            {(['week', 'day', 'month'] as CalendarView[]).map((v) => (
              <ToggleButton
                key={v}
                isSelected={view === v}
                onChange={() => setView(v)}
                className={`px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  view === v
                    ? 'bg-[#2563EB] text-white'
                    : 'text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/5'
                }`}
              >
                {v}
              </ToggleButton>
            ))}
          </div>

          <Button
            onPress={() => {
              // Placeholder: open add event form
            }}
            className="flex items-center gap-1 rounded-lg bg-[#2563EB] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2563EB]/90"
          >
            <Plus className="size-3.5" />
            {t('sales.calendar.addEvent', 'Add Event')}
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`size-2.5 rounded-full ${colors.bg} ${colors.text}`} />
            <span className="text-xs text-black/50 dark:text-white/50">{colors.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {view === 'day' && (
        <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
          <div className="flex flex-col gap-2">
            {getEventsForDate(currentDate).length === 0 ? (
              <p className="py-8 text-center text-sm text-black/30 dark:text-white/30">
                {t('sales.calendar.noEvents', 'No events for this day')}
              </p>
            ) : (
              getEventsForDate(currentDate).map(renderEvent)
            )}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10">
          {getWeekDates(currentDate).map((date) => (
            <div
              key={date.toISOString()}
              className={`flex min-h-[120px] flex-col bg-white p-2 dark:bg-black ${
                isSameDay(date, today)
                  ? 'ring-2 ring-inset ring-[#2563EB]/40'
                  : ''
              }`}
            >
              <div className="mb-1 flex items-center gap-1">
                <span className="text-xs text-black/40 dark:text-white/40">
                  {DAYS_OF_WEEK[date.getDay()]}
                </span>
                <span
                  className={`font-[family-name:var(--font-geist-mono)] text-xs tabular-nums ${
                    isSameDay(date, today)
                      ? 'rounded-full bg-[#2563EB] px-1.5 text-white'
                      : 'text-black/70 dark:text-white/70'
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {getEventsForDate(date).slice(0, 3).map(renderEvent)}
                {getEventsForDate(date).length > 3 && (
                  <span className="text-[10px] text-black/40 dark:text-white/40">
                    +{getEventsForDate(date).length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'month' && (
        <div>
          {/* Day names header */}
          <div className="grid grid-cols-7 gap-px mb-px">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="py-1 text-center text-xs font-medium text-black/40 dark:text-white/40">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10">
            {getMonthDates(currentDate).map((date) => {
              const isCurrentMonth = date.getMonth() === currentDate.getMonth()
              return (
                <div
                  key={date.toISOString()}
                  className={`flex min-h-[80px] flex-col bg-white p-1.5 dark:bg-black ${
                    !isCurrentMonth ? 'opacity-30' : ''
                  } ${isSameDay(date, today) ? 'ring-2 ring-inset ring-[#2563EB]/40' : ''}`}
                >
                  <span
                    className={`mb-0.5 font-[family-name:var(--font-geist-mono)] text-xs tabular-nums ${
                      isSameDay(date, today)
                        ? 'rounded-full bg-[#2563EB] px-1 text-white'
                        : 'text-black/60 dark:text-white/60'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {getEventsForDate(date).slice(0, 2).map(renderEvent)}
                    {getEventsForDate(date).length > 2 && (
                      <span className="text-[10px] text-black/40 dark:text-white/40">
                        +{getEventsForDate(date).length - 2}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
