/**
 * Post-submit confirmation view.
 * Shows the direct quote-request submission result.
 */

import { useNavigate } from '@tanstack/react-router'
import { CheckCircle } from 'lucide-react'
import { Button } from 'react-aria-components/Button'
import { useTranslation } from 'react-i18next'

interface SubmitConfirmationProps {
	reference: string
}

export function SubmitConfirmation({ reference }: SubmitConfirmationProps) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()

	return (
		<div className="flex flex-col items-center justify-center gap-6 py-16 px-6">
			{/* Success icon */}
			<div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-primary)]/10">
				<CheckCircle size={32} className="text-[var(--color-primary)]" />
			</div>

			{/* Heading */}
			<h2 className="text-xl font-semibold text-[var(--color-text)] text-center">
				{t('quoteBuilder.successHeading')}
			</h2>

			{/* Reference */}
			<p className="text-sm font-mono text-[var(--color-text-muted)]">
				{t('quoteBuilder.successReference', { ref: reference })}
			</p>

			{/* Body */}
			<p className="text-sm text-[var(--color-text-muted)] text-center max-w-md">
				{t('quoteBuilder.successBody')}
			</p>

			{/* Actions */}
			<div className="flex items-center gap-3">
				{/* Back to Orders -- always shown */}
				<Button
					onPress={() => navigate({ to: '/orders' })}
					className="h-11 px-6 rounded-xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text)] transition-opacity cursor-pointer hover:bg-[var(--color-surface)]"
				>
					{t('quoteBuilder.backToOrders')}
				</Button>

				<Button
					onPress={() => navigate({ to: '/orders' })}
					className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold transition-opacity cursor-pointer"
				>
					{t('quoteBuilder.trackQuote')}
				</Button>
			</div>
		</div>
	)
}
