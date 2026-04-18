/**
 * QuickActionChips — contextual quick replies beneath Lyon's messages.
 *
 * Rendered as quiet mono-small-caps lines separated by em-dashes.
 * Context comes from useChatStore.quickActionContext and selects
 * a different chip set per scenario (home vs after product/order).
 */

import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { QUICK_ACTION_CHIPS } from '../../lib/chat-types'
import { useChatStore } from '../../stores/chat'

interface QuickActionChipsProps {
	sendMessage: (msg: string) => void
}

export function QuickActionChips({ sendMessage }: QuickActionChipsProps) {
	const { t } = useTranslation('portal')
	const context = useChatStore((s) => s.quickActionContext)

	const chipKeys =
		context === 'product' || context === 'order'
			? QUICK_ACTION_CHIPS.afterProduct
			: QUICK_ACTION_CHIPS.home

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.4, delay: 0.2 }}
			className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
		>
			{chipKeys.map((key) => (
				<button
					key={key}
					type="button"
					onClick={() => sendMessage(t(key))}
					className="office-quiet"
				>
					{t(key)}
				</button>
			))}
		</motion.div>
	)
}
