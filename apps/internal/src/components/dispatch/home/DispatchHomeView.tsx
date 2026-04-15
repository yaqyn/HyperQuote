import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDispatchBoard } from '../../../lib/server/dispatch'
import { ConstraintBadge } from '../shared/ConstraintBadge'

/**
 * Mission Control — today's dispatch at a glance.
 * 4 hero numbers top, timeline bar below, alerts and weather.
 * Data is the design: big mono numbers, tiny labels.
 */
export function DispatchHomeView() {
  const { t } = useTranslation('dispatch')

  const { data: board } = useQuery({
    queryKey: ['dispatch', 'board'],
    queryFn: () => getDispatchBoard(),
    staleTime: 15_000,
  })

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-black/30 dark:text-white/30">
        {t('common.loading', 'Loading...')}
      </div>
    )
  }

  // Derive hero stats
  const activeRoutes = board.routes.filter(
    (r) => r.status === 'in_progress',
  ).length
  const deliveriesToday = board.todayDeliveries.total
  const onTimePct =
    deliveriesToday > 0
      ? Math.round(
          ((board.todayDeliveries.completed - board.alerts.delayedDeliveries) /
            Math.max(board.todayDeliveries.completed, 1)) *
            100,
        )
      : 100
  const activeDrivers = board.routes.filter((r) => r.driverId).length

  const totalAlerts =
    board.alerts.delayedDeliveries +
    board.alerts.failedDeliveries +
    board.alerts.driverIssues +
    board.alerts.constraintViolations.length

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      {/* Hero stats — 4 large numbers */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <HeroStat
          value={activeRoutes}
          label={t('home.activeRoutes', 'Active Routes')}
        />
        <HeroStat
          value={deliveriesToday}
          label={t('home.deliveriesToday', 'Deliveries Today')}
        />
        <HeroStat
          value={onTimePct}
          label={t('home.onTime', 'On-Time %')}
          suffix="%"
          accent={onTimePct >= 95 ? 'green' : onTimePct >= 85 ? 'amber' : 'red'}
        />
        <HeroStat
          value={activeDrivers}
          label={t('home.activeDrivers', 'Active Drivers')}
        />
      </div>

      {/* Timeline bar — delivery windows clustered */}
      <div className="mt-6">
        <TimelineBar board={board} />
      </div>

      {/* Two-column: delivery breakdown + alerts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Delivery breakdown */}
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/[0.06] dark:bg-black/60">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('home.todayDeliveries', "Today's Deliveries")}
          </h3>
          <div className="flex flex-col gap-2">
            <BreakdownRow
              label={t('home.completed', 'Completed')}
              value={board.todayDeliveries.completed}
              total={deliveriesToday}
              color="bg-green-500"
            />
            <BreakdownRow
              label={t('home.inProgress', 'In Progress')}
              value={board.todayDeliveries.inProgress}
              total={deliveriesToday}
              color="bg-[#2563EB]"
            />
            <BreakdownRow
              label={t('home.pending', 'Pending')}
              value={board.todayDeliveries.pending}
              total={deliveriesToday}
              color="bg-black/20 dark:bg-white/20"
            />
            {board.todayDeliveries.failed > 0 && (
              <BreakdownRow
                label={t('home.failed', 'Failed')}
                value={board.todayDeliveries.failed}
                total={deliveriesToday}
                color="bg-red-500"
              />
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/[0.06] dark:bg-black/60">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
            {t('home.alerts', 'Alerts')}
          </h3>
          {totalAlerts === 0 ? (
            <p className="text-sm text-black/30 dark:text-white/30">
              {t('home.noAlerts', 'No active alerts')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {board.alerts.delayedDeliveries > 0 && (
                <AlertRow
                  label={t('home.delayedDeliveries', 'Delayed deliveries')}
                  count={board.alerts.delayedDeliveries}
                  severity="warning"
                />
              )}
              {board.alerts.failedDeliveries > 0 && (
                <AlertRow
                  label={t('home.failedDeliveries', 'Failed deliveries')}
                  count={board.alerts.failedDeliveries}
                  severity="error"
                />
              )}
              {board.alerts.driverIssues > 0 && (
                <AlertRow
                  label={t('home.driverIssues', 'Driver compliance issues')}
                  count={board.alerts.driverIssues}
                  severity="warning"
                />
              )}
              {board.alerts.constraintViolations.map((v, i) => (
                <ConstraintBadge key={i} violation={{ type: 'cairo_ban', ...v }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Weather / Khamsin */}
      {board.weather.khamsinActive ? (
        <div className="mt-4 rounded-xl border border-red-300/40 bg-red-50/60 p-4 dark:border-red-700/30 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-red-500" aria-hidden="true">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                {t('home.khamsinWarning', 'Khamsin Warning Active')}
              </p>
              <p className="mt-1 text-sm text-red-700/80 dark:text-red-400/80">
                {t('home.windSpeed', 'Wind speed')}{' '}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {board.weather.windSpeedKmh}
                </span>{' '}
                km/h &mdash;{' '}
                {board.weather.advisory ??
                  t('home.khamsinAdvisory', 'Sheet material deliveries suspended. Light loads only.')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white/60 px-4 py-3 dark:border-white/[0.06] dark:bg-black/60">
          <span className="text-black/30 dark:text-white/30">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
            </svg>
          </span>
          <span className="text-sm text-black/50 dark:text-white/50">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {board.weather.temperature}
            </span>
            &deg;C &middot;{' '}
            {t('home.wind', 'Wind')}{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {board.weather.windSpeedKmh}
            </span>{' '}
            km/h
          </span>
        </div>
      )}

      {/* Fleet status strip */}
      <div className="mt-4 flex flex-wrap gap-3 rounded-xl border border-black/[0.06] bg-white/60 px-4 py-3 dark:border-white/[0.06] dark:bg-black/60">
        <FleetStat label={t('home.available', 'Available')} value={board.fleetStatus.available} dot="bg-green-500" />
        <FleetStat label={t('home.inTransit', 'In Transit')} value={board.fleetStatus.inTransit} dot="bg-[#2563EB]" />
        <FleetStat label={t('home.loading', 'Loading')} value={board.fleetStatus.loading} dot="bg-amber-500" />
        <FleetStat label={t('home.atSite', 'At Site')} value={board.fleetStatus.atSite} dot="bg-black/40 dark:bg-white/40" />
        <FleetStat label={t('home.offline', 'Offline')} value={board.fleetStatus.offline} dot="bg-black/20 dark:bg-white/20" />
      </div>
    </div>
  )
}

// ─── Hero Stat ─────────────────────────────────────────

function HeroStat({
  value,
  label,
  suffix = '',
  accent,
}: {
  value: number
  label: string
  suffix?: string
  accent?: 'green' | 'amber' | 'red'
}) {
  const accentClass =
    accent === 'green'
      ? 'text-green-600 dark:text-green-400'
      : accent === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : accent === 'red'
          ? 'text-red-600 dark:text-red-400'
          : ''

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/[0.06] dark:bg-black/60">
      <div
        className={`font-[family-name:var(--font-geist-mono)] text-4xl font-light tabular-nums leading-none ${accentClass}`}
      >
        {value}
        {suffix && <span className="text-lg">{suffix}</span>}
      </div>
      <div className="mt-2 text-xs text-black/40 dark:text-white/40">{label}</div>
    </div>
  )
}

// ─── Timeline Bar ──────────────────────────────────────

function TimelineBar({ board }: { board: ReturnType<typeof getDispatchBoard> extends Promise<infer T> ? T : never }) {
  // Build 24h timeline with delivery windows clustered
  const hours = Array.from({ length: 18 }, (_, i) => i + 6) // 6AM - 11PM

  // Count deliveries per hour from routes
  const hourCounts = new Map<number, number>()
  for (const route of board.routes) {
    for (const stop of route.stops) {
      const h = Number.parseInt(stop.timeWindow.start.split(':')[0] ?? '0', 10)
      hourCounts.set(h, (hourCounts.get(h) ?? 0) + 1)
    }
  }

  const maxCount = Math.max(1, ...hourCounts.values())

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/[0.06] dark:bg-black/60">
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
        Today&apos;s Timeline
      </h3>
      <div className="flex items-end gap-[2px]" style={{ height: 48 }}>
        {hours.map((h) => {
          const count = hourCounts.get(h) ?? 0
          const heightPct = count > 0 ? Math.max(12, (count / maxCount) * 100) : 4
          const isCairoBan = h >= 6 && h < 24 // Cairo truck ban zone

          return (
            <div
              key={h}
              className="group relative flex-1"
              style={{ height: '100%' }}
            >
              <div
                className={`absolute inset-x-0 bottom-0 rounded-sm transition-all ${
                  count > 0
                    ? 'bg-[#2563EB]'
                    : 'bg-black/[0.06] dark:bg-white/[0.06]'
                }`}
                style={{ height: `${heightPct}%` }}
              />
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-7 start-1/2 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-white/80 dark:text-black">
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{h}:00</span>
                {count > 0 && (
                  <span className="ms-1 font-[family-name:var(--font-geist-mono)] tabular-nums">
                    ({count})
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* Hour labels */}
      <div className="mt-1 flex text-[10px] text-black/30 dark:text-white/30">
        <span className="flex-1 font-[family-name:var(--font-geist-mono)] tabular-nums">6</span>
        <span className="flex-1 text-center font-[family-name:var(--font-geist-mono)] tabular-nums">12</span>
        <span className="flex-1 text-end font-[family-name:var(--font-geist-mono)] tabular-nums">23</span>
      </div>
    </div>
  )
}

// ─── Breakdown Row ─────────────────────────────────────

function BreakdownRow({
  label,
  value,
  total,
  color,
}: {
  label: string
  value: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (value / total) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-sm text-black/60 dark:text-white/60">{label}</span>
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums">
        {value}
      </span>
    </div>
  )
}

// ─── Alert Row ─────────────────────────────────────────

function AlertRow({
  label,
  count,
  severity,
}: {
  label: string
  count: number
  severity: 'error' | 'warning'
}) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            severity === 'error' ? 'bg-red-500' : 'bg-amber-500'
          }`}
        />
        <span className="text-sm text-black/70 dark:text-white/70">{label}</span>
      </div>
      <span
        className={`font-[family-name:var(--font-geist-mono)] text-sm tabular-nums font-medium ${
          severity === 'error'
            ? 'text-red-600 dark:text-red-400'
            : 'text-amber-600 dark:text-amber-400'
        }`}
      >
        {count}
      </span>
    </div>
  )
}

// ─── Fleet Stat ────────────────────────────────────────

function FleetStat({
  label,
  value,
  dot,
}: {
  label: string
  value: number
  dot: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-sm text-black/60 dark:text-white/60">{label}</span>
      <span className="font-[family-name:var(--font-geist-mono)] text-sm tabular-nums font-medium">
        {value}
      </span>
    </div>
  )
}
