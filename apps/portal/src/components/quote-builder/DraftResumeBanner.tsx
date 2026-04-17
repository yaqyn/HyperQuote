/**
 * Banner shown when user returns to quote builder with an existing draft.
 * "Continue where you left off?" with Continue and Start Fresh options.
 */
import { motion } from 'motion/react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface DraftResumeBannerProps {
	onStartFresh: () => void
}

export function DraftResumeBanner({ onStartFresh }: DraftResumeBannerProps) {
	const { t } = useTranslation('portal')

	return (
		<motion.div
			initial={{ opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]"
		>
			<span className="text-sm text-[var(--color-text)]">
				{t('quoteBuilder.draftBanner')}
			</span>
			<div className="flex items-center gap-3">
				<Button
					onPress={onStartFresh}
					className="text-[13px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
				>
					{t('quoteBuilder.startFresh')}
				</Button>
			</div>
		</motion.div>
	)
}
