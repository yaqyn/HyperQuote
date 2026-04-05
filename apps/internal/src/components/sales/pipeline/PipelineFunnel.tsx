import { useTranslation } from 'react-i18next'
import type { PipelineDeal, PipelineStage, PipelineStageId } from '../../../types/sales'

interface PipelineFunnelProps {
  stages: PipelineStage[]
  deals: PipelineDeal[]
}

const FUNNEL_STAGE_ORDER: PipelineStageId[] = [
  'rfq_received',
  'reviewing',
  'sourcing',
  'quoting',
  'sent',
  'negotiating',
  'closing',
  'won',
]

const formatValue = (value: number) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

function getBarColor(index: number, total: number): string {
  // Gradient from neutral (top) to blue (bottom/Won)
  const ratio = index / (total - 1)
  if (ratio < 0.3) return 'bg-black/10 dark:bg-white/10'
  if (ratio < 0.6) return 'bg-[#2563EB]/20'
  if (ratio < 0.85) return 'bg-[#2563EB]/40'
  return 'bg-[#2563EB]/70'
}

export function PipelineFunnel({ stages, deals }: PipelineFunnelProps) {
  const { t } = useTranslation('internal')

  // Filter to funnel stages (exclude lost_expired) and compute data
  const funnelStages = FUNNEL_STAGE_ORDER.map((id) => {
    const stage = stages.find((s) => s.id === id)
    return {
      id,
      name: stage?.name ?? id.replace('_', ' '),
      dealCount: stage?.dealCount ?? 0,
      totalValue: stage?.totalValue ?? 0,
    }
  })

  // Find max count for proportional widths
  const maxCount = Math.max(...funnelStages.map((s) => s.dealCount), 1)

  // Compute conversion rates between consecutive stages
  const conversionRates: number[] = []
  for (let i = 0; i < funnelStages.length - 1; i++) {
    const fromCount = funnelStages[i].dealCount
    const toCount = funnelStages[i + 1].dealCount
    conversionRates.push(fromCount > 0 ? Math.round((toCount / fromCount) * 100) : 0)
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
      <h3 className="mb-6 text-sm font-semibold">
        {t('sales.pipeline.funnelChart', 'Funnel Chart')}
      </h3>

      <div className="mx-auto w-full max-w-2xl space-y-1">
        {funnelStages.map((stage, index) => {
          const widthPercent = maxCount > 0
            ? Math.max(20, Math.round((stage.dealCount / maxCount) * 100))
            : 20

          return (
            <div key={stage.id}>
              {/* Stage bar */}
              <div className="flex items-center gap-4">
                <div className="w-32 shrink-0 text-end">
                  <span className="text-xs font-medium text-black/60 dark:text-white/60">
                    {stage.name}
                  </span>
                </div>

                <div className="flex-1">
                  <div
                    className={`flex items-center justify-between rounded-md px-3 py-2 transition-all ${getBarColor(index, funnelStages.length)}`}
                    style={{ width: `${widthPercent}%` }}
                  >
                    <span className="font-[family-name:var(--font-geist-mono)] text-xs font-medium">
                      {stage.dealCount} {t('sales.pipeline.deals', 'deals')}
                    </span>
                    <span className="font-[family-name:var(--font-geist-mono)] text-xs text-black/50 dark:text-white/50">
                      {formatValue(stage.totalValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conversion rate between stages */}
              {index < funnelStages.length - 1 && (
                <div className="flex items-center gap-4 py-0.5">
                  <div className="w-32 shrink-0" />
                  <div className="ps-4">
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-black/30 dark:text-white/30">
                      {conversionRates[index]}% conversion
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Lost/Expired summary */}
      {(() => {
        const lostStage = stages.find((s) => s.id === 'lost_expired')
        if (!lostStage || lostStage.dealCount === 0) return null
        return (
          <div className="mx-auto mt-6 w-full max-w-2xl border-t border-black/10 pt-4 dark:border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-32 shrink-0 text-end">
                <span className="text-xs font-medium text-red-500">
                  {lostStage.name}
                </span>
              </div>
              <div>
                <span className="font-[family-name:var(--font-geist-mono)] text-xs text-red-500">
                  {lostStage.dealCount} {t('sales.pipeline.deals', 'deals')} &middot;{' '}
                  {formatValue(lostStage.totalValue)}
                </span>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
