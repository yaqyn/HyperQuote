import { CurrencyDisplay } from '@hyperquote/ui/display/CurrencyDisplay'
import { useTranslation } from 'react-i18next'

interface SubtotalsSectionProps {
	subtotal: number
	deliveryFee: number
	taxAmount: number
	total: number
	paymentTerms: string
	validUntil: string
}

export function SubtotalsSection({
	subtotal,
	deliveryFee,
	taxAmount,
	total,
	paymentTerms,
	validUntil,
}: SubtotalsSectionProps) {
	const { t } = useTranslation('portal')

	return (
		<div className="flex flex-col items-end gap-4">
			{/* Totals rows */}
			<div className="flex flex-col gap-1 w-full max-w-xs">
				{/* Subtotal */}
				<div className="flex justify-between">
					<span className="text-sm text-[var(--color-text-muted)]">
						{t('quoteDetail.subtotal')}
					</span>
					<span className="font-mono text-sm">
						<CurrencyDisplay value={subtotal} />
					</span>
				</div>

				{/* Delivery fee */}
				<div className="flex justify-between">
					<span className="text-sm text-[var(--color-text-muted)]">
						{t('quoteDetail.deliveryFee')}
					</span>
					{deliveryFee === 0 ? (
						<span className="text-sm text-[var(--color-success)]">
							{t('quoteDetail.freeDelivery')}
						</span>
					) : (
						<span className="font-mono text-sm">
							<CurrencyDisplay value={deliveryFee} />
						</span>
					)}
				</div>

				{/* VAT 14% */}
				<div className="flex justify-between">
					<span className="text-sm text-[var(--color-text-muted)]">
						{t('quoteDetail.vat')}
					</span>
					<span className="font-mono text-sm">
						<CurrencyDisplay value={taxAmount} />
					</span>
				</div>

				{/* Divider */}
				<div className="border-t border-[var(--color-border)] my-2" />

				{/* Total */}
				<div className="flex justify-between">
					<span className="font-semibold text-base text-[var(--color-text)]">
						{t('quoteDetail.total')}
					</span>
					<span className="font-mono text-lg font-semibold">
						<CurrencyDisplay value={total} />
					</span>
				</div>
			</div>

			{/* Payment terms */}
			<div className="w-full max-w-xs bg-[var(--color-surface)] rounded-lg p-4">
				<span className="text-sm text-[var(--color-text)]">{paymentTerms}</span>
			</div>

			{/* Price disclaimer */}
			<p className="text-[13px] text-[var(--color-text-muted)] italic max-w-xs text-end">
				{t('quoteDetail.priceDisclaimer', { date: validUntil })}
			</p>
		</div>
	)
}
