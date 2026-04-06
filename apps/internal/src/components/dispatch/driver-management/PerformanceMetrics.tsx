/**
 * Driver performance scorecard — spatial glass cards.
 * On-time rate, POD compliance, damage rate, avg deliveries/day, avg duration.
 * Geist Mono for all numbers. Arabic-Indic numerals when locale is Arabic.
 */
import { useTranslation } from 'react-i18next'
import type { DriverPerformance } from '../../../types/dispatch'

interface PerformanceMetricsProps {
  performance: DriverPerformance | null
}

function getThresholdColor(value: number, thresholds: { green: number; yellow: number }, inverse = false): string {
  if (inverse) {
    // Lower is better (damage rate)
    if (value < thresholds.yellow) return 'text-green-600 dark:text-green-400'
    if (value < thresholds.green) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }
  // Higher is better
  if (value >= thresholds.green) return 'text-green-600 dark:text-green-400'
  if (value >= thresholds.yellow) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function formatNumber(value: number, locale: string, decimals = 1): string {
  if (locale.startsWith('ar')) {
    return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: decimals }).format(value)
  }
  return value.toFixed(decimals)
}

export function PerformanceMetrics({ performance }: PerformanceMetricsProps) {
  const { t, i18n } = useTranslation('dispatch')
  const locale = i18n.language

  if (!performance) {
    return (
      <div className="flex flex-col gap-3">
        <h4 className="text-sm font-semibold text-black/80 dark:text-white/80">
          {t('driver.performance.title', 'Performance Scorecard')}
        </h4>
        <p className="text-sm text-black/40 dark:text-white/40">
          {t('driver.performance.noData', 'No performance data available')}
        </p>
      </div>
    )
  }

  const metrics = [
    {
      label: t('driver.performance.onTimeRate', 'On-Time Rate'),
      value: performance.onTimeRate,
      suffix: '%',
      color: getThresholdColor(performance.onTimeRate, { green: 95, yellow: 90 }),
    },
    {
      label: t('driver.performance.podCompliance', 'POD Compliance'),
      value: performance.podComplianceRate,
      suffix: '%',
      color: getThresholdColor(performance.podComplianceRate, { green: 98, yellow: 95 }),
    },
    {
      label: t('driver.performance.damageRate', 'Damage Rate'),
      value: performance.damageRate,
      suffix: '%',
      color: getThresholdColor(performance.damageRate, { green: 5, yellow: 2 }, true),
    },
    {
      label: t('driver.performance.avgDeliveries', 'Avg Deliveries/Day'),
      value: performance.avgDeliveriesPerDay,
      suffix: '',
      color: '',
    },
    {
      label: t('driver.performance.avgDuration', 'Avg Duration'),
      value: performance.avgDeliveryDuration,
      suffix: t('driver.performance.min', 'min'),
      color: '',
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-black/80 dark:text-white/80">
        {t('driver.performance.title', 'Performance Scorecard')}
      </h4>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-black/60 backdrop-blur-sm p-3"
          >
            <span className="text-xs text-black/50 dark:text-white/50 block mb-1">
              {metric.label}
            </span>
            <span
              className={`text-xl font-[family-name:var(--font-geist-mono)] tabular-nums ${metric.color}`}
            >
              {formatNumber(metric.value, locale)}
              {metric.suffix && (
                <span className="text-sm ms-0.5">{metric.suffix}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
