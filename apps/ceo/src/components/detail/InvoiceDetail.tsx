import type { Invoice } from '../../types/entity'
import { DetailSection } from './DetailSection'
import { DetailView } from './DetailView'

interface InvoiceDetailProps {
	data: Invoice
	onBack: () => void
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat('en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value)
}

function formatDate(dateStr: string): string {
	return new Date(dateStr).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function InvoiceDetail({ data, onBack }: InvoiceDetailProps) {
	return (
		<DetailView
			title={`Invoice ${data.reference}`}
			subtitle={data.customer}
			onBack={onBack}
			deepLinkUrl={`https://app.hyperquote.net/finance/invoice/${data.id}`}
			deepLinkLabel="View full details in Finance"
			actions={
				<>
					<button
						type="button"
						className="text-sm font-medium text-[var(--color-text)]"
					>
						View invoice PDF
					</button>
					<button
						type="button"
						className="text-sm font-medium text-[var(--color-text)]"
					>
						Route to Finance
					</button>
				</>
			}
		>
			{/* Dates */}
			<div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
				<span>
					Issued:{' '}
					<span className="font-mono">{formatDate(data.issuedDate)}</span>
				</span>
				<span>|</span>
				<span>
					Due: <span className="font-mono">{formatDate(data.dueDate)}</span>
				</span>
			</div>

			{/* Amounts */}
			<DetailSection label="Amount">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">Amount</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{formatCurrency(data.amount)}
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">VAT (14%)</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{formatCurrency(data.vat)}
						</span>
					</div>
					<div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2 text-sm">
						<span className="font-medium text-[var(--color-text)]">Total</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{formatCurrency(data.total)}
						</span>
					</div>
				</div>
			</DetailSection>

			{/* Payment status */}
			<DetailSection label="Payment status">
				<div className="flex flex-col gap-2">
					{data.payments.map((payment) => (
						<div
							key={`${payment.date}-${payment.method}-${payment.amount}`}
							className="flex items-center justify-between text-sm"
						>
							<span className="text-[var(--color-text-muted)]">
								Received (
								<span className="font-mono">{formatDate(payment.date)}</span>,{' '}
								{payment.method})
							</span>
							<span className="font-mono font-medium text-[var(--color-text)]">
								{formatCurrency(payment.amount)}
							</span>
						</div>
					))}
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">Outstanding</span>
						<span
							className="font-mono font-medium"
							style={{
								color:
									data.daysUntilDue < 0
										? 'var(--color-error)'
										: data.daysUntilDue < 7
											? 'var(--color-warning)'
											: 'var(--color-text)',
							}}
						>
							{formatCurrency(data.outstanding)}
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">
							Days until due
						</span>
						<span className="font-mono text-[var(--color-text)]">
							{data.daysUntilDue}
						</span>
					</div>
				</div>
			</DetailSection>

			{/* ETA submission */}
			<DetailSection label="ETA submission">
				<div className="text-sm text-[var(--color-text)]">
					Submitted{' '}
					<span className="font-mono">
						{formatDate(data.etaSubmission.date)}
					</span>
					, reference:{' '}
					<span className="font-mono">{data.etaSubmission.ref}</span>
				</div>
			</DetailSection>
		</DetailView>
	)
}
