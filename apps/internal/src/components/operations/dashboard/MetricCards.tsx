import { TrendingUp, TrendingDown } from 'lucide-react'
import type { OperationsMetrics } from '../../../types/operations'

interface MetricCardsProps {
  metrics: OperationsMetrics
}

export function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* Card 1 — Orders in progress */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 h-20 flex flex-col justify-between">
        <span className="text-[11px] font-normal text-black/50 dark:text-white/50">
          Orders in progress
        </span>
        <div className="flex items-center gap-2">
          <span className="font-geist-mono text-2xl font-semibold">
            {metrics.ordersInProgress}
          </span>
          {metrics.ordersInProgressTrend === 'up' ? (
            <TrendingUp size={14} className="text-green-600" />
          ) : (
            <TrendingDown size={14} className="text-red-600" />
          )}
          <span className="text-[11px] font-normal text-black/40 dark:text-white/40">
            vs last week
          </span>
        </div>
      </div>

      {/* Card 2 — Deliveries today */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 h-20 flex flex-col justify-between">
        <span className="text-[11px] font-normal text-black/50 dark:text-white/50">
          Deliveries today
        </span>
        <div className="flex flex-col gap-1">
          <span className="font-geist-mono text-xl font-medium">
            {metrics.deliveriesToday} / {metrics.deliveriesTotal}
          </span>
          <div className="h-1 w-full rounded-full bg-black/5 dark:bg-white/5">
            <div
              className="h-1 rounded-full bg-[#2563EB]"
              style={{
                width: metrics.deliveriesTotal > 0
                  ? `${(metrics.deliveriesToday / metrics.deliveriesTotal) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Card 3 — SLA breaches active */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 h-20 flex flex-col justify-between">
        <span className="text-[11px] font-normal text-black/50 dark:text-white/50">
          SLA breaches active
        </span>
        <span
          className={`font-geist-mono text-2xl font-semibold ${
            metrics.slaBreaches > 0 ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {metrics.slaBreaches}
        </span>
      </div>

      {/* Card 4 — Bottleneck alert */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 h-20 flex flex-col justify-between">
        <span className="text-[11px] font-normal text-black/50 dark:text-white/50">
          Bottleneck alert
        </span>
        {metrics.bottleneckStage ? (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{metrics.bottleneckStage}</span>
            <span className="font-geist-mono text-xs font-normal text-black/40 dark:text-white/40">
              {metrics.bottleneckStuckCount} stuck
            </span>
          </div>
        ) : (
          <span className="text-sm font-medium text-green-600">All clear</span>
        )}
      </div>
    </div>
  )
}
