import { useTranslation } from 'react-i18next'
import type { PipelineDeal, PipelineStage } from '../../../types/sales'

interface PipelineFunnelProps {
  stages: PipelineStage[]
  deals: PipelineDeal[]
}

export function PipelineFunnel({ stages, deals }: PipelineFunnelProps) {
  const { t } = useTranslation('internal')

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-black/40 dark:text-white/40">
        {t('sales.pipeline.funnelPlaceholder', 'Funnel chart — coming in Task 2')}
      </p>
    </div>
  )
}
