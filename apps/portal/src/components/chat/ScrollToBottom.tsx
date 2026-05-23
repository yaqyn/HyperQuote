/**
 * ScrollToBottom — subtle blur pill used when the user scrolls away from
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
					className="relative isolate flex h-9 items-center gap-2 rounded-full bg-white/35 px-3.5 text-[12px] font-semibold text-[var(--p-text)] shadow-none backdrop-blur-sm transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--p-focus-ring)] dark:bg-white/[0.08]"
				>
					<span
						className="absolute -inset-1 -z-10 rounded-full bg-white/30 opacity-70 blur-sm dark:bg-white/15"
						aria-hidden
					/>
					<span aria-hidden>↓</span>
					<span>{t('chat.jumpToLatest', 'Jump to latest')}</span>
				</motion.button>
			)}
		</AnimatePresence>
	)
}
