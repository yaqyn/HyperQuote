/**
 * ScrollToBottom — a margin glyph, not a floating pill.
 *
 * Shows a short downward arrow + small mono label. Used only when the
 * user has scrolled up past the threshold in ChatMessages.
 */

import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

interface ScrollToBottomProps {
	show: boolean
	onClick: () => void
}

export function ScrollToBottom({ show, onClick }: ScrollToBottomProps) {
	const { t } = useTranslation('portal')

	return (
		<AnimatePresence>
			{show && (
				<motion.button
					type="button"
					initial={{ opacity: 0, y: 4 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 4 }}
					transition={{ duration: 0.15 }}
					onClick={onClick}
					aria-label={t('chat.jumpToLatest', 'Jump to latest')}
					className="office-quiet flex items-center gap-2"
				>
					<span aria-hidden>↓</span>
					<span>{t('chat.jumpToLatest', 'Jump to latest')}</span>
				</motion.button>
			)}
		</AnimatePresence>
	)
}
