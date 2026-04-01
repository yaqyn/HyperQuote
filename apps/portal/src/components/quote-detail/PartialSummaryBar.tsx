import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { useQuoteActionsStore } from '../../stores/quote-actions'

interface PartialSummaryBarProps {
  onSubmit: () => void
  isPending?: boolean
  totalItems: number
}

export function PartialSummaryBar({
  onSubmit,
  isPending,
  totalItems,
}: PartialSummaryBarProps) {
  const { t } = useTranslation('portal')
  const { accepted, rejected, pending } = useQuoteActionsStore((s) => s.getDecisionSummary())
  const canSubmit = useQuoteActionsStore((s) => s.allDecided())

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="sticky bottom-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-4 flex items-center justify-between"
    >
      <span className="text-sm font-medium text-[var(--color-text)]">
        {t('quoteDetail.partialSummary', {
          accepted,
          rejected,
          pending: totalItems - accepted - rejected,
        })}
      </span>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isPending}
        className="bg-[var(--color-primary)] text-white h-10 px-6 rounded-lg cursor-pointer font-semibold text-sm disabled:opacity-50"
      >
        {t('quoteDetail.submitPartialResponse')}
      </button>
    </motion.div>
  )
}
