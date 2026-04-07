import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'

export function PipelineSnapshot() {
  const setActiveTab = useSalesStore((s) => s.setActiveTab)

  const { data } = useQuery({
    queryKey: ['sales-pipeline-snapshot'],
    queryFn: () => getSalesPipeline({ data: {} }),
    staleTime: 60_000,
  })

  const stages = data?.stages ?? []
  const deals = data?.deals ?? []

  const activeStages = stages.filter(
    (s) => s.id !== 'won' && s.id !== 'lost_expired',
  )
  const totalPipeline = activeStages.reduce((sum, s) => sum + s.totalValue, 0)
  const weightedForecast = deals
    .filter((d) => d.stage !== 'won' && d.stage !== 'lost_expired')
    .reduce((sum, d) => sum + d.dealValue * (d.winProbability / 100), 0)
  const activeDealCount = deals.filter(
    (d) => d.stage !== 'won' && d.stage !== 'lost_expired',
  ).length

  const formatValue = (v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
    return String(v)
  }

  const maxStageValue = Math.max(...activeStages.map((s) => s.totalValue), 1)

  return (
    <Button
      onPress={() => setActiveTab('rfq-inbox')}
      className="w-full rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] p-5 text-start transition-all duration-150 cursor-pointer outline-none pressed:scale-[0.995]"
    >
      {/* Header */}
      <p className="text-xs font-medium text-[var(--color-text-subtle)] uppercase tracking-wider mb-4">
        Pipeline Snapshot
      </p>

      {/* Summary metrics */}
      <div className="flex items-baseline gap-8 mb-6">
        <div>
          <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums text-[var(--color-text)]">
            EGP {formatValue(totalPipeline)}
          </span>
          <span className="ml-2 text-xs text-[var(--color-text-subtle)]">
            total pipeline
          </span>
        </div>
        <div>
          <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums text-[var(--color-text)]">
            EGP {formatValue(weightedForecast)}
          </span>
          <span className="ml-2 text-xs text-[var(--color-text-subtle)]">
            weighted forecast
          </span>
        </div>
        <div>
          <span className="font-[family-name:var(--font-geist-mono)] text-lg tabular-nums text-[var(--color-text)]">
            {activeDealCount}
          </span>
          <span className="ml-2 text-xs text-[var(--color-text-subtle)]">
            active deals
          </span>
        </div>
      </div>

      {/* Stage bars */}
      <div className="flex flex-col gap-2">
        {activeStages
          .filter((s) => s.dealCount > 0)
          .map((stage) => {
            const widthPercent = Math.max(4, (stage.totalValue / maxStageValue) * 100)
            return (
              <div key={stage.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs text-[var(--color-text-muted)]">
                  {stage.name}
                </span>
                <div className="flex-1 h-5 rounded bg-black/[0.03] dark:bg-white/[0.03]">
                  <div
                    className="h-full rounded bg-[var(--color-primary)]/15 flex items-center pl-2"
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-medium tabular-nums text-[var(--color-text-muted)]">
                      {stage.dealCount}
                    </span>
                  </div>
                </div>
                <span className="font-[family-name:var(--font-geist-mono)] w-14 shrink-0 text-end text-xs tabular-nums text-[var(--color-text-subtle)]">
                  {formatValue(stage.totalValue)}
                </span>
              </div>
            )
          })}
      </div>
    </Button>
  )
}
