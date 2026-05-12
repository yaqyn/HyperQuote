/**
 * Payment instructions card with copyable IBAN.
 * Heading, bank name, IBAN in Geist Mono, reference, amount.
 * Copy button copies IBAN to clipboard with toast feedback.
 */

import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { toast } from '../../lib/toast'

interface PaymentInstructionsCardProps {
	bankName: string
	iban: string
	reference: string
	amount: number
	currency: string
}

export function PaymentInstructionsCard({
	bankName,
	iban,
	reference,
	amount,
	currency,
}: PaymentInstructionsCardProps) {
	const { t } = useTranslation('portal')
	const [copied, setCopied] = useState(false)

	const handleCopyIBAN = async () => {
		try {
			await navigator.clipboard.writeText(iban)
			setCopied(true)
			toast.success(t('tracking.ibanCopied'))
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// Fallback for older browsers
			const textarea = document.createElement('textarea')
			textarea.value = iban
			document.body.appendChild(textarea)
			textarea.select()
			document.execCommand('copy')
			document.body.removeChild(textarea)
			setCopied(true)
			toast.success(t('tracking.ibanCopied'))
			setTimeout(() => setCopied(false), 2000)
		}
	}

	const formattedAmount = new Intl.NumberFormat('en-EG', {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(amount)

	return (
		<div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
			<h3 className="break-words text-base font-semibold text-[var(--color-text)]">
				{t('tracking.paymentInstructions')}
			</h3>

			<div className="space-y-2">
				{/* Bank name */}
				<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<span className="text-sm text-[var(--color-text-muted)]">
						{t('tracking.bankName')}
					</span>
					<span className="break-words text-sm font-medium text-[var(--color-text)] sm:text-end">
						{bankName}
					</span>
				</div>

				{/* IBAN with copy */}
				<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<span className="text-sm text-[var(--color-text-muted)]">IBAN</span>
					<div className="flex min-w-0 items-center gap-2">
						<span className="min-w-0 flex-1 break-all font-mono text-sm text-[var(--color-text)] sm:text-end">
							{iban}
						</span>
						<Button
							onPress={handleCopyIBAN}
							aria-label={t('tracking.copyIBAN')}
							className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary)]/10 sm:h-8 sm:w-8"
						>
							{copied ? <Check size={14} /> : <Copy size={14} />}
						</Button>
					</div>
				</div>

				{/* Reference */}
				<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
					<span className="text-sm text-[var(--color-text-muted)]">
						{t('tracking.reference')}
					</span>
					<span className="break-all font-mono text-sm text-[var(--color-text)] sm:text-end">
						{reference}
					</span>
				</div>

				{/* Amount */}
				<div className="flex flex-col gap-1 border-t border-[var(--color-border)] pt-2 sm:flex-row sm:items-center sm:justify-between">
					<span className="text-sm font-medium text-[var(--color-text)]">
						{t('tracking.amount')}
					</span>
					<span className="break-all font-mono text-sm font-semibold text-[var(--color-text)] sm:text-end">
						{currency} {formattedAmount}
					</span>
				</div>
			</div>
		</div>
	)
}
