/**
 * Payment method display — read-only.
 * Customer pays via bank transfer or cash. No credit system.
 */

const PAYMENT_METHODS = [
	{ id: 'bank_transfer', label: 'Bank Transfer' },
	{ id: 'cash', label: 'Cash' },
] as const

export function PaymentTerms() {
	return (
		<div className="flex items-center gap-3">
			<span className="text-[13px] text-black/40 dark:text-white/40">
				Payment via
			</span>
			{PAYMENT_METHODS.map((method) => (
				<span
					key={method.id}
					className="rounded-full bg-black/[0.05] px-3 py-1 text-[13px] font-medium text-[var(--color-text)] dark:bg-white/[0.06]"
				>
					{method.label}
				</span>
			))}
		</div>
	)
}
