/**
 * AI reorder suggestion card.
 * Contextual card above AI chat input (not a chat message).
 * Background: var(--color-info-bg), rounded-xl, p-12px.
 * Dismissed suggestions don't reappear for 7 days (localStorage cooldown).
 * Maximum 1 visible at a time.
 */

import { X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface AIReorderSuggestionProps {
	productId: string
	productName: string
	daysSinceOrder: number
	onReorder: (productId: string) => void
}

const COOLDOWN_DAYS = 7

function getDismissKey(productId: string) {
	return `hq-reorder-dismissed-${productId}`
}

function isDismissed(productId: string): boolean {
	try {
		const stored = localStorage.getItem(getDismissKey(productId))
		if (!stored) return false
		const dismissedDate = new Date(stored)
		const now = new Date()
		const diffMs = now.getTime() - dismissedDate.getTime()
		const diffDays = diffMs / (1000 * 60 * 60 * 24)
		return diffDays < COOLDOWN_DAYS
	} catch {
		return false
	}
}

function dismiss(productId: string) {
	try {
		localStorage.setItem(getDismissKey(productId), new Date().toISOString())
	} catch {
		// localStorage not available
	}
}

export function AIReorderSuggestion({
	productId,
	productName,
	daysSinceOrder,
	onReorder,
}: AIReorderSuggestionProps) {
	const { t } = useTranslation('portal')

	const [hidden, setHidden] = useState(false)

	useEffect(() => {
		if (isDismissed(productId)) setHidden(true)
	}, [productId])

	const handleDismiss = useCallback(() => {
		dismiss(productId)
		setHidden(true)
	}, [productId])

	const handleReorder = useCallback(() => {
		onReorder(productId)
	}, [productId, onReorder])

	if (hidden) return null

	return (
		<div className="relative flex flex-col gap-3 rounded-xl bg-[var(--color-info-bg)] p-3 pe-12 sm:flex-row sm:items-center sm:pe-3">
			<p className="min-w-0 flex-1 break-words text-sm text-[var(--color-text)]">
				{t('tracking.aiSuggestion', {
					product: productName,
					days: daysSinceOrder,
				})}
			</p>

			<Button
				onPress={handleReorder}
				className="h-11 w-full shrink-0 cursor-pointer rounded-lg bg-[var(--color-primary)] px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 sm:h-9 sm:w-auto"
			>
				{t('tracking.reorder')}
			</Button>

			<Button
				onPress={handleDismiss}
				aria-label={t('window.close')}
				className="absolute end-2 top-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] sm:static sm:h-8 sm:w-8"
			>
				<X size={12} />
			</Button>
		</div>
	)
}
