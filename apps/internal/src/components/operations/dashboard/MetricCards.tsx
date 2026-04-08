import type { OperationsMetrics } from '../../../types/operations'

interface MetricCardsProps {
  metrics: OperationsMetrics
}

/**
 * 4 large numbers in a horizontal strip. NOT cards.
 * Numbers 28px mono, labels 10px uppercase.
 * On-Time colored by health threshold.
 */
export function MetricCards({ metrics }: MetricCardsProps) {
  // Derive on-time rate from deliveries
  const onTimeRate = metrics.deliveriesTotal > 0
    ? Math.round((metrics.deliveriesToday / metrics.deliveriesTotal) * 100)
    : 100

  // Color by health: green >95%, yellow >85%, red below
  const onTimeColor = onTimeRate > 95
    ? 'text-green-600'
    : onTimeRate > 85
      ? 'text-yellow-600'
      : 'text-red-600'

  // Bottleneck stage display
  const bottleneckDisplay = metrics.bottleneckStage
    ? metrics.bottleneckStage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : 'None'

  return (
    <div className="flex items-start gap-14">
      {/* SLA Breaches — urgent, always first */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          SLA Breaches
        </span>
        <span className={`font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold leading-none tracking-tight ${
          metrics.slaBreaches > 0 ? 'text-red-600' : 'text-green-600'
        }`}>
          {metrics.slaBreaches}
        </span>
        {metrics.slaBreaches > 0 && (
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-red-600">
            need{metrics.slaBreaches !== 1 ? '' : 's'} attention
          </span>
        )}
      </div>

      {/* Stuck Orders — second urgency */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          Stuck Orders
        </span>
        <span className={`font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold leading-none tracking-tight ${
          metrics.bottleneckStuckCount > 0 ? 'text-red-600' : ''
        }`}>
          {metrics.bottleneckStuckCount}
        </span>
        {metrics.bottleneckStuckCount > 0 && (
          <span className="font-[family-name:var(--font-geist-mono)] text-[11px] text-black/40 dark:text-white/40">
            in {bottleneckDisplay}
          </span>
        )}
      </div>

      {/* Active Orders */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          Active Orders
        </span>
        <span className="font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold leading-none tracking-tight">
          {metrics.ordersInProgress}
        </span>
      </div>

      {/* On-Time Rate */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
          On-Time Rate
        </span>
        <span className={`font-[family-name:var(--font-geist-mono)] text-[28px] font-semibold leading-none tracking-tight ${onTimeColor}`}>
          {onTimeRate}%
        </span>
      </div>
    </div>
  )
}
