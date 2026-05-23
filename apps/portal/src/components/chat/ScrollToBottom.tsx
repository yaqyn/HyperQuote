/**
 * ScrollToBottom — compact blue pill used when the user scrolls away from
 * the latest chat message.
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
					className="relative isolate flex h-9 items-center gap-2 rounded-full bg-[var(--p-accent)] px-3.5 text-[12px] font-semibold text-[var(--p-accent-contrast)] shadow-[0_14px_32px_rgba(37,99,235,0.28)] transition-colors hover:bg-[var(--p-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-focus-ring)]"
				>
					<span
						className="absolute -inset-2 -z-10 rounded-full bg-[var(--p-accent)] opacity-30 blur-xl"
						aria-hidden
					/>
					<span aria-hidden>↓</span>
					<span>{t('chat.jumpToLatest', 'Jump to latest')}</span>
				</motion.button>
			)}
		</AnimatePresence>
	)
}
