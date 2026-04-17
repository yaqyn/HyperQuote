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
		<div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] space-y-3">
			<h3 className="text-base font-semibold text-[var(--color-text)]">
				{t('tracking.paymentInstructions')}
			</h3>

			<div className="space-y-2">
				{/* Bank name */}
				<div className="flex justify-between items-center">
					<span className="text-sm text-[var(--color-text-muted)]">
						{t('tracking.bankName')}
					</span>
					<span className="text-sm font-medium text-[var(--color-text)]">
						{bankName}
					</span>
				</div>

				{/* IBAN with copy */}
				<div className="flex justify-between items-center">
					<span className="text-sm text-[var(--color-text-muted)]">IBAN</span>
					<div className="flex items-center gap-2">
						<span className="font-mono text-sm text-[var(--color-text)]">
							{iban}
						</span>
						<Button
							onPress={handleCopyIBAN}
							aria-label={t('tracking.copyIBAN')}
							className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors cursor-pointer"
						>
							{copied ? <Check size={14} /> : <Copy size={14} />}
						</Button>
					</div>
				</div>

				{/* Reference */}
				<div className="flex justify-between items-center">
					<span className="text-sm text-[var(--color-text-muted)]">
						{t('tracking.reference')}
					</span>
					<span className="font-mono text-sm text-[var(--color-text)]">
						{reference}
					</span>
				</div>

				{/* Amount */}
				<div className="flex justify-between items-center pt-2 border-t border-[var(--color-border)]">
					<span className="text-sm font-medium text-[var(--color-text)]">
						{t('tracking.amount')}
					</span>
					<span className="font-mono text-sm font-semibold text-[var(--color-text)]">
						{currency} {formattedAmount}
					</span>
				</div>
			</div>
		</div>
	)
}
