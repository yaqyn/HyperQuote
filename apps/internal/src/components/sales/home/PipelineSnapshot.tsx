import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'

export function PipelineSnapshot() {
  const { t } = useTranslation('internal')
  const setActiveTab = useSalesStore((s) => s.setActiveTab)

  const { data } = useQuery({
    queryKey: ['sales-pipeline-snapshot'],
    queryFn: () => getSalesPipeline({ data: {} }),
    staleTime: 60_000,
  })

  const stages = data?.stages ?? []
  const deals = data?.deals ?? []

  // Exclude won/lost from active pipeline
  const activeStages = stages.filter(
    (s) => s.id !== 'won' && s.id !== 'lost_expired',
  )
  const totalPipeline = activeStages.reduce((sum, s) => sum + s.totalValue, 0)

  // Weighted forecast: sum of dealValue * winProbability / 100
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

  return (
    <Button
      onPress={() => setActiveTab('pipeline')}
      className="w-full rounded-xl border border-black/10 p-4 text-start transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
    >
      <h3 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
        {t('sales.home.pipelineSnapshot', 'Pipeline Snapshot')}
      </h3>

      {/* Summary row */}
      <div className="mb-4 flex items-baseline gap-6">
        <div>
          <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums">
            EGP {formatValue(totalPipeline)}
          </span>
          <span className="ms-1 text-xs text-black/50 dark:text-white/50">
            {t('sales.home.totalPipeline', 'total pipeline')}
          </span>
        </div>
        <div>
          <span className="font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums">
            EGP {formatValue(weightedForecast)}
          </span>
          <span className="ms-1 text-xs text-black/50 dark:text-white/50">
            {t('sales.home.weightedForecast', 'weighted forecast')}
          </span>
        </div>
        <div>
          <span className="font-[family-name:var(--font-geist-mono)] text-lg tabular-nums">
            {activeDealCount}
          </span>
          <span className="ms-1 text-xs text-black/50 dark:text-white/50">
            {t('sales.home.activeDeals', 'active deals')}
          </span>
        </div>
      </div>

      {/* Mini funnel: horizontal bar per stage */}
      <div className="flex flex-col gap-1.5">
        {activeStages
          .filter((s) => s.dealCount > 0)
          .map((stage) => {
            const widthPercent = totalPipeline > 0
              ? Math.max(8, (stage.totalValue / totalPipeline) * 100)
              : 0
            return (
              <div key={stage.id} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-black/60 dark:text-white/60">
                  {stage.name}
                </span>
                <div className="flex-1">
                  <div
                    className="h-4 rounded bg-[#2563EB]/20"
                    style={{ width: `${widthPercent}%` }}
                  >
                    <div className="flex h-full items-center ps-1.5">
                      <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/70 dark:text-white/70">
                        {stage.dealCount}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="font-[family-name:var(--font-geist-mono)] w-16 shrink-0 text-end text-xs tabular-nums text-black/50 dark:text-white/50">
                  {formatValue(stage.totalValue)}
                </span>
              </div>
            )
          })}
      </div>
    </Button>
  )
}
