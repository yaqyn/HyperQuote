import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PipelineDeal, PipelineStage } from '../../../types/sales'

interface PipelineSummaryBarProps {
  stages: PipelineStage[]
  deals: PipelineDeal[]
  target?: number
}

const WIN_PROBABILITY_BY_STAGE: Record<string, number> = {
  rfq_received: 0.1,
  reviewing: 0.2,
  sourcing: 0.3,
  quoting: 0.45,
  sent: 0.55,
  negotiating: 0.65,
  closing: 0.8,
  won: 1.0,
  lost_expired: 0,
}

export function PipelineSummaryBar({ stages, deals, target = 50_000_000 }: PipelineSummaryBarProps) {
  const { t } = useTranslation('internal')
  const [expanded, setExpanded] = useState(false)

  // Total pipeline: sum of all non-won/non-lost deals
  const activeDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost_expired')
  const totalPipeline = activeDeals.reduce((sum, d) => sum + d.dealValue, 0)

  // Weighted forecast: each deal value * win probability
  const weightedForecast = activeDeals.reduce(
    (sum, d) => sum + d.dealValue * (d.winProbability / 100),
    0,
  )

  const gap = target - weightedForecast
  const gapIsPositive = gap > 0

  // Conversion rates per stage
  const stageOrder = [
    'rfq_received', 'reviewing', 'sourcing', 'quoting',
    'sent', 'negotiating', 'closing', 'won',
  ]
  const conversionRates = stageOrder.slice(0, -1).map((stage, i) => {
    const fromCount = stages.find((s) => s.id === stage)?.dealCount ?? 0
    const toCount = stages.find((s) => s.id === stageOrder[i + 1])?.dealCount ?? 0
    return {
      from: stage,
      to: stageOrder[i + 1],
      rate: fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0,
    }
  })

  // Avg days in stage (from deal data)
  const avgTimePerStage = stageOrder.map((stageId) => {
    const stageDeals = deals.filter((d) => d.stage === stageId)
    const avgDays =
      stageDeals.length > 0
        ? Math.round(stageDeals.reduce((s, d) => s + d.daysInStage, 0) / stageDeals.length)
        : 0
    return { stage: stageId, avgDays }
  })

  const formatValue = (value: number) =>
    new Intl.NumberFormat('en-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="border-b border-black/10 dark:border-white/10">
      {/* Main metrics strip */}
      <div className="flex items-center gap-6 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('sales.pipeline.totalPipeline', 'Total Pipeline')}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
            {formatValue(totalPipeline)}
          </span>
        </div>

        <div className="h-8 w-px bg-black/10 dark:bg-white/10" />

        <div className="flex flex-col">
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('sales.pipeline.weightedForecast', 'Weighted Forecast')}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
            {formatValue(Math.round(weightedForecast))}
          </span>
        </div>

        <div className="h-8 w-px bg-black/10 dark:bg-white/10" />

        <div className="flex flex-col">
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('sales.pipeline.target', 'Target')}
          </span>
          <span className="font-[family-name:var(--font-geist-mono)] text-sm font-semibold">
            {formatValue(target)}
          </span>
        </div>

        <div className="h-8 w-px bg-black/10 dark:bg-white/10" />

        <div className="flex flex-col">
          <span className="text-xs text-black/50 dark:text-white/50">
            {t('sales.pipeline.gap', 'Gap')}
          </span>
          <span
            className={`font-[family-name:var(--font-geist-mono)] text-sm font-semibold ${
              gapIsPositive ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {gapIsPositive ? '-' : '+'}
            {formatValue(Math.abs(gap))}
          </span>
        </div>

        <div className="ms-auto">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[#2563EB] hover:underline"
          >
            {expanded
              ? t('sales.pipeline.hideAnalytics', 'Hide Analytics')
              : t('sales.pipeline.showAnalytics', 'Show Analytics')}
          </button>
        </div>
      </div>

      {/* Collapsible analytics panel */}
      {expanded && (
        <div className="border-t border-black/5 px-4 py-3 dark:border-white/5">
          <div className="grid grid-cols-2 gap-6">
            {/* Conversion rates */}
            <div>
              <h4 className="mb-2 text-xs font-medium text-black/50 dark:text-white/50">
                {t('sales.pipeline.conversionRates', 'Conversion Rates')}
              </h4>
              <div className="space-y-1">
                {conversionRates.map((cr) => (
                  <div key={cr.from} className="flex items-center justify-between text-xs">
                    <span className="text-black/60 dark:text-white/60">
                      {cr.from.replace('_', ' ')} &rarr; {cr.to.replace('_', ' ')}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)]">{cr.rate}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Avg time per stage */}
            <div>
              <h4 className="mb-2 text-xs font-medium text-black/50 dark:text-white/50">
                {t('sales.pipeline.avgTimePerStage', 'Avg Time per Stage')}
              </h4>
              <div className="space-y-1">
                {avgTimePerStage.map((s) => (
                  <div key={s.stage} className="flex items-center justify-between text-xs">
                    <span className="text-black/60 dark:text-white/60">
                      {s.stage.replace('_', ' ')}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)]">
                      {s.avgDays}d
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
