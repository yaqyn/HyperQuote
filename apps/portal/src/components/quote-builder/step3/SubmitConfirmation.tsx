/**
 * Post-submit confirmation view.
 * Shows success message after quote submission or approval submission.
 * isApproval: shows approval-specific text without "Track Quote" button.
 */

import { useNavigate } from '@tanstack/react-router'
import { CheckCircle } from 'lucide-react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'

interface SubmitConfirmationProps {
	reference: string
	requestId: string
	isApproval?: boolean
}

export function SubmitConfirmation({
	reference,
	isApproval,
}: SubmitConfirmationProps) {
	const { t } = useTranslation('portal')
	const navigate = useNavigate()

	// Extract the sequence number from reference (e.g., "QR-2026-00123" -> "00123")
	const refSeq = reference.split('-').pop() ?? reference

	return (
		<div className="flex flex-col items-center justify-center gap-6 py-16 px-6">
			{/* Success icon */}
			<div className="flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-primary)]/10">
				<CheckCircle size={32} className="text-[var(--color-primary)]" />
			</div>

			{/* Heading */}
			<h2 className="text-xl font-semibold text-[var(--color-text)] text-center">
				{isApproval
					? t('quoteBuilder.approvalSuccessHeading')
					: t('quoteBuilder.successHeading')}
			</h2>

			{/* Reference */}
			{!isApproval && (
				<p className="text-sm font-mono text-[var(--color-text-muted)]">
					{t('quoteBuilder.successReference', { ref: refSeq })}
				</p>
			)}

			{/* Body */}
			<p className="text-sm text-[var(--color-text-muted)] text-center max-w-md">
				{isApproval
					? t('quoteBuilder.approvalSuccessBody')
					: t('quoteBuilder.successBody')}
			</p>

			{/* Actions */}
			<div className="flex items-center gap-3">
				{/* Back to Orders -- always shown */}
				<Button
					onPress={() => navigate({ to: '/orders' })}
					className={[
						'h-11 px-6 rounded-xl text-sm font-semibold transition-opacity cursor-pointer',
						isApproval
							? 'bg-[var(--color-primary)] text-[var(--color-primary-contrast)]'
							: 'border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface)]',
					].join(' ')}
				>
					{t('quoteBuilder.backToOrders')}
				</Button>

				{/* Track Quote -- only for direct submissions */}
				{!isApproval && (
					<Button
						onPress={() => navigate({ to: '/orders' })}
						className="h-11 px-6 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-contrast)] text-sm font-semibold transition-opacity cursor-pointer"
					>
						{t('quoteBuilder.trackQuote')}
					</Button>
				)}
			</div>
		</div>
	)
}
