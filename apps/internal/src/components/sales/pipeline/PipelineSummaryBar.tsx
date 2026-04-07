import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'motion/react'
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

function Metric({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex flex-col items-start">
      <span
        className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[28px] font-semibold leading-none tracking-tight text-black dark:text-white"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-black/30 dark:text-white/30">
        {label}
      </span>
    </div>
  )
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

  // Win rate
  const wonDeals = deals.filter((d) => d.stage === 'won').length
  const closedDeals = deals.filter((d) => d.stage === 'won' || d.stage === 'lost_expired').length
  const winRate = closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0

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

  const formatCompact = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
    return String(value)
  }

  return (
    <div className="px-6 pt-5 pb-2">
      {/* 4 large numbers in a row -- pure typography hierarchy, no cards, no borders */}
      <div className="flex items-end gap-12">
        <Metric
          label={t('sales.pipeline.totalPipeline', 'Total Pipeline')}
          value={formatCompact(totalPipeline)}
        />
        <Metric
          label={t('sales.pipeline.weightedForecast', 'Weighted Forecast')}
          value={formatCompact(Math.round(weightedForecast))}
        />
        <Metric
          label={t('sales.pipeline.activeDeals', 'Active Deals')}
          value={String(activeDeals.length)}
        />
        <Metric
          label={t('sales.pipeline.winRate', 'Win Rate')}
          value={`${winRate}%`}
        />

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="ms-auto text-[10px] uppercase tracking-wider font-medium text-[#2563EB] hover:text-[#2563EB]/70"
        >
          {expanded
            ? t('sales.pipeline.hideAnalytics', 'Hide')
            : t('sales.pipeline.showAnalytics', 'Analytics')}
        </button>
      </div>

      {/* Collapsible analytics */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="mt-5 grid grid-cols-2 gap-12">
              {/* Conversion rates */}
              <div>
                <h4 className="mb-3 text-[10px] uppercase tracking-wider font-medium text-black/30 dark:text-white/30">
                  {t('sales.pipeline.conversionRates', 'Conversion Rates')}
                </h4>
                <div className="space-y-2">
                  {conversionRates.map((cr) => (
                    <div key={cr.from} className="flex items-center justify-between">
                      <span className="text-[12px] text-black/35 dark:text-white/35">
                        {cr.from.replace('_', ' ')} → {cr.to.replace('_', ' ')}
                      </span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px] text-black dark:text-white">
                        {cr.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avg time per stage */}
              <div>
                <h4 className="mb-3 text-[10px] uppercase tracking-wider font-medium text-black/30 dark:text-white/30">
                  {t('sales.pipeline.avgTimePerStage', 'Avg Time per Stage')}
                </h4>
                <div className="space-y-2">
                  {avgTimePerStage.map((s) => (
                    <div key={s.stage} className="flex items-center justify-between">
                      <span className="text-[12px] text-black/35 dark:text-white/35">
                        {s.stage.replace('_', ' ')}
                      </span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[12px] text-black dark:text-white">
                        {s.avgDays}d
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
