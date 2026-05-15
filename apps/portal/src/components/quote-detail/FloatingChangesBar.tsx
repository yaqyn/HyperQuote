import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useQuoteActionsStore } from '../../stores/quote-actions'

interface FloatingChangesBarProps {
	onDiscard: () => void
	onSubmit: () => void
	isPending?: boolean
}

export function FloatingChangesBar({
	onDiscard,
	onSubmit,
	isPending,
}: FloatingChangesBarProps) {
	const { t } = useTranslation('portal')
	const count = useQuoteActionsStore((s) => s.getModifiedCount())

	if (count === 0) return null

	return (
		<motion.div
			initial={{ y: 20, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.15, ease: 'easeOut' }}
			className="sticky bottom-0 z-30 bg-[var(--color-surface)] border-t border-[var(--color-border)] p-4 flex items-center justify-between"
		>
			<span className="text-sm font-medium text-[var(--color-text)]">
				{t('quoteDetail.itemsModified', { count })}
			</span>
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={onDiscard}
					className="border border-[var(--color-border)] text-[var(--color-text)] h-10 px-4 rounded-lg cursor-pointer text-sm"
				>
					{t('quoteDetail.discard')}
				</button>
				<button
					type="button"
					onClick={onSubmit}
					disabled={isPending}
					className="bg-[var(--color-primary)] text-[var(--color-primary-contrast)] h-10 px-6 rounded-lg cursor-pointer font-semibold text-sm disabled:opacity-50"
				>
					{t('quoteDetail.submitCounterOffer')}
				</button>
			</div>
		</motion.div>
	)
}
