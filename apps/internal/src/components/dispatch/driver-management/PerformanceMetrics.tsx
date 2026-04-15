/**
 * 6 metrics in 2x3 grid — large mono numbers + labels.
 * Delivery success rate, on-time %, avg rating, trips today/week/month.
 * Arabic-Indic numerals when locale is Arabic.
 */
import { useTranslation } from 'react-i18next'
import type { DriverPerformance } from '../../../types/dispatch'

interface PerformanceMetricsProps {
  performance: DriverPerformance | null
}

function formatNumber(value: number, locale: string, decimals = 1): string {
  if (locale.startsWith('ar')) {
    return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: decimals }).format(value)
  }
  return value.toFixed(decimals)
}

function getColor(value: number, thresholds: { green: number; yellow: number }, inverse = false): string {
  if (inverse) {
    if (value < thresholds.yellow) return 'text-green-600 dark:text-green-400'
    if (value < thresholds.green) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }
  if (value >= thresholds.green) return 'text-green-600 dark:text-green-400'
  if (value >= thresholds.yellow) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function PerformanceMetrics({ performance }: PerformanceMetricsProps) {
  const { t, i18n } = useTranslation('dispatch')
  const locale = i18n.language

  if (!performance) {
    return (
      <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/[0.06] dark:bg-black/60">
        <h4 className="text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          {t('driver.performance.title', 'Performance')}
        </h4>
        <p className="mt-2 text-sm text-black/30 dark:text-white/30">
          {t('driver.performance.noData', 'No performance data available')}
        </p>
      </div>
    )
  }

  const metrics = [
    {
      label: t('driver.performance.onTimeRate', 'On-Time'),
      value: performance.onTimeRate,
      suffix: '%',
      color: getColor(performance.onTimeRate, { green: 95, yellow: 90 }),
    },
    {
      label: t('driver.performance.podCompliance', 'POD Rate'),
      value: performance.podComplianceRate,
      suffix: '%',
      color: getColor(performance.podComplianceRate, { green: 98, yellow: 95 }),
    },
    {
      label: t('driver.performance.damageRate', 'Damage'),
      value: performance.damageRate,
      suffix: '%',
      color: getColor(performance.damageRate, { green: 5, yellow: 2 }, true),
    },
    {
      label: t('driver.performance.avgDeliveries', 'Avg/Day'),
      value: performance.avgDeliveriesPerDay,
      suffix: '',
      color: '',
    },
    {
      label: t('driver.performance.avgDuration', 'Avg Time'),
      value: performance.avgDeliveryDuration,
      suffix: t('driver.performance.min', 'min'),
      color: '',
    },
  ]

  return (
    <div className="rounded-xl border border-black/[0.06] bg-white/60 p-4 dark:border-white/[0.06] dark:bg-black/60">
      <h4 className="mb-3 text-xs font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
        {t('driver.performance.title', 'Performance')}
      </h4>

      <div className="grid grid-cols-3 gap-4 lg:grid-cols-5">
        {metrics.map((m) => (
          <div key={m.label}>
            <div
              className={`font-[family-name:var(--font-geist-mono)] text-2xl tabular-nums leading-none ${m.color}`}
            >
              {formatNumber(m.value, locale)}
              {m.suffix && (
                <span className="text-xs">{m.suffix}</span>
              )}
            </div>
            <div className="mt-1 text-[11px] text-black/40 dark:text-white/40">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
