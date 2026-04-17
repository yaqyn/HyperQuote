import type { Supplier } from '../../types/entity'
import { DetailSection } from './DetailSection'
import { DetailView } from './DetailView'

interface SupplierDetailProps {
	data: Supplier
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
		year: 'numeric',
	})
}

export function SupplierDetail({ data, onBack }: SupplierDetailProps) {
	return (
		<DetailView
			title={data.name}
			subtitle={`Supplier since: ${formatDate(data.supplierSince)}`}
			onBack={onBack}
			deepLinkUrl={`https://app.hyperquote.net/procurement/supplier/${data.id}`}
			deepLinkLabel="View full details in Procurement"
			actions={
				<button
					type="button"
					className="text-sm font-medium text-[var(--color-text)]"
				>
					Route to Procurement
				</button>
			}
		>
			{/* Contact */}
			<DetailSection label="Contact">
				<div className="flex flex-col gap-1.5 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-[var(--color-text)]">
							Primary: {data.primaryContact.name}
						</span>
						<a
							href={`tel:${data.primaryContact.phone.replace(/\s/g, '')}`}
							className="font-medium text-[var(--color-text)]"
						>
							Call
						</a>
					</div>
					<span className="text-[var(--color-text-muted)]">
						Category: {data.category}
					</span>
				</div>
			</DetailSection>

			{/* Performance */}
			<DetailSection label="Performance (last 12 months)">
				<div className="grid grid-cols-2 gap-4">
					<div className="flex flex-col gap-0.5">
						<span className="text-sm text-[var(--color-text-muted)]">
							Total PO value
						</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{formatCurrency(data.performance.totalPOValue)}
						</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-sm text-[var(--color-text-muted)]">
							On-time delivery
						</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{data.performance.onTimeRate}%
						</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-sm text-[var(--color-text-muted)]">
							Quality issues
						</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{data.performance.qualityIssues}
						</span>
					</div>
					<div className="flex flex-col gap-0.5">
						<span className="text-sm text-[var(--color-text-muted)]">
							Active POs
						</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{data.performance.activePOs}
						</span>
					</div>
				</div>
			</DetailSection>

			{/* Terms */}
			<DetailSection label="Terms">
				<div className="flex flex-col gap-1.5 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-[var(--color-text-muted)]">Payment</span>
						<span className="text-[var(--color-text)]">
							{data.terms.payment}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--color-text-muted)]">
							Early payment discount
						</span>
						<span className="text-[var(--color-text)]">
							{data.terms.earlyDiscount}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[var(--color-text-muted)]">
							Minimum order
						</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{formatCurrency(data.terms.minimumOrder)}
						</span>
					</div>
				</div>
			</DetailSection>
		</DetailView>
	)
}
