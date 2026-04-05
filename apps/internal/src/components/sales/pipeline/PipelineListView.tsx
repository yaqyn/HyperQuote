import { useTranslation } from 'react-i18next'

export function PipelineListView() {
  const { t } = useTranslation('internal')

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-black/40 dark:text-white/40">
        {t('sales.pipeline.listViewPlaceholder', 'List view — coming in Task 2')}
      </p>
    </div>
  )
}
