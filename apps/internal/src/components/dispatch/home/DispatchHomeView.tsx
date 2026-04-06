import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getDispatchBoard } from '../../../lib/server/dispatch'
import { ConstraintBadge } from '../shared/ConstraintBadge'

// ─── Glass panel wrapper ────────────────────────────────

function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-4 ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * Dispatch home view — today's delivery overview.
 * Summary cards for deliveries, fleet status, alerts, and weather warnings.
 * Spatial glass style, Geist Mono for all numbers.
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
      <div className="p-6 text-center text-black/40 dark:text-white/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* ─── Row 1: Today's Deliveries ──────────────────── */}
      <GlassPanel>
        <h3 className="text-sm font-semibold mb-4">
          {t('home.todayDeliveries', "Today's Deliveries")}
        </h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <MetricCell
            label={t('home.total', 'Total')}
            value={board.todayDeliveries.total}
          />
          <MetricCell
            label={t('home.completed', 'Completed')}
            value={board.todayDeliveries.completed}
            accent="green"
          />
          <MetricCell
            label={t('home.inProgress', 'In Progress')}
            value={board.todayDeliveries.inProgress}
            accent="blue"
          />
          <MetricCell
            label={t('home.pending', 'Pending')}
            value={board.todayDeliveries.pending}
          />
          <MetricCell
            label={t('home.failed', 'Failed')}
            value={board.todayDeliveries.failed}
            accent="red"
          />
        </div>
      </GlassPanel>

      {/* ─── Row 2: Fleet Status + Alerts ───────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Fleet Status */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">
            {t('home.fleetStatus', 'Fleet Status')}
          </h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <MetricCell
              label={t('home.available', 'Available')}
              value={board.fleetStatus.available}
              accent="green"
            />
            <MetricCell
              label={t('home.inTransit', 'In Transit')}
              value={board.fleetStatus.inTransit}
              accent="blue"
            />
            <MetricCell
              label={t('home.loading', 'Loading')}
              value={board.fleetStatus.loading}
            />
            <MetricCell
              label={t('home.atSite', 'At Site')}
              value={board.fleetStatus.atSite}
            />
            <MetricCell
              label={t('home.offline', 'Offline')}
              value={board.fleetStatus.offline}
            />
          </div>
        </GlassPanel>

        {/* Alerts */}
        <GlassPanel>
          <h3 className="text-sm font-semibold mb-4">
            {t('home.alerts', 'Alerts')}
          </h3>
          <div className="space-y-3">
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
            {board.alerts.delayedDeliveries === 0 &&
              board.alerts.failedDeliveries === 0 &&
              board.alerts.driverIssues === 0 &&
              board.alerts.constraintViolations.length === 0 && (
                <p className="text-sm text-black/40 dark:text-white/40">
                  {t('home.noAlerts', 'No active alerts')}
                </p>
              )}
          </div>
        </GlassPanel>
      </div>

      {/* ─── Row 3: Weather Warnings ────────────────────── */}
      {board.weather.khamsinActive && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {t('home.khamsinWarning', 'Khamsin Warning Active')}
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                {t('home.windSpeed', 'Wind speed')}{' '}
                <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
                  {board.weather.windSpeedKmh}
                </span>{' '}
                km/h &mdash;{' '}
                {board.weather.advisory ?? t('home.khamsinAdvisory', 'Sheet material deliveries suspended. Light loads only.')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Non-Khamsin weather info bar */}
      {!board.weather.khamsinActive && (
        <GlassPanel className="flex items-center gap-3">
          <svg
            className="w-4 h-4 text-black/40 dark:text-white/40 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z"
            />
          </svg>
          <span className="text-sm text-black/60 dark:text-white/60">
            {t('home.weather', 'Weather')}:{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {board.weather.temperature}
            </span>
            &deg;C,{' '}
            {t('home.wind', 'Wind')}{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
              {board.weather.windSpeedKmh}
            </span>{' '}
            km/h
          </span>
        </GlassPanel>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────

function MetricCell({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: 'green' | 'blue' | 'red'
}) {
  const colorMap = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-[#2563EB]',
    red: 'text-red-600 dark:text-red-400',
  }

  return (
    <div>
      <div className="text-xs text-black/50 dark:text-white/50 mb-1">{label}</div>
      <div
        className={`text-2xl font-[family-name:var(--font-geist-mono)] tabular-nums ${accent ? colorMap[accent] : ''}`}
      >
        {value}
      </div>
    </div>
  )
}

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
    <div className="flex items-center justify-between">
      <span className="text-sm text-black/70 dark:text-white/70">{label}</span>
      <span
        className={`font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-medium ${
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
