import type { Product } from '../../types/entity'
import { DetailSection } from './DetailSection'
import { DetailView } from './DetailView'

interface ProductDetailProps {
	data: Product
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

export function ProductDetail({ data, onBack }: ProductDetailProps) {
	return (
		<DetailView
			title={data.name}
			subtitle={`Category: ${data.category}`}
			onBack={onBack}
			deepLinkUrl={`https://app.hyperquote.net/products/product/${data.id}`}
			deepLinkLabel="View full details in Products"
		>
			{/* SKU */}
			<p className="text-sm text-[var(--color-text-muted)]">
				SKU: <span className="font-mono">{data.sku}</span>
			</p>

			{/* Pricing (internal) */}
			<DetailSection label="Pricing (internal -- not shown to customers)">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">
							Last supplier cost
						</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{formatCurrency(data.pricing.lastSupplierCost)}/bag
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">
							Avg selling price
						</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{formatCurrency(data.pricing.avgSellingPrice)}/bag
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">Avg margin</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{data.pricing.avgMargin}%
						</span>
					</div>
				</div>
			</DetailSection>

			{/* Movement */}
			<DetailSection label="Movement (last 30 days)">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">Units sold</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{new Intl.NumberFormat('en-EG').format(data.movement.unitsSold)}
						</span>
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">Revenue</span>
						<span className="font-mono font-medium text-[var(--color-text)]">
							{formatCurrency(data.movement.revenue)}
						</span>
					</div>
					{data.movement.topCustomers.length > 0 && (
						<div className="flex flex-col gap-1 text-sm">
							<span className="text-[var(--color-text-muted)]">
								Top customers
							</span>
							{data.movement.topCustomers.map((cust) => (
								<div
									key={cust.name}
									className="flex items-center justify-between ps-3"
								>
									<span className="text-[var(--color-text)]">{cust.name}</span>
									<span className="font-mono text-[var(--color-text-muted)]">
										{new Intl.NumberFormat('en-EG').format(cust.units)} units
									</span>
								</div>
							))}
						</div>
					)}
				</div>
			</DetailSection>

			{/* Availability */}
			<DetailSection label="Availability">
				<div className="flex flex-col gap-2">
					<div className="flex flex-col gap-1 text-sm">
						<span className="text-[var(--color-text-muted)]">Suppliers</span>
						{data.availability.suppliers.map((sup) => (
							<div
								key={sup.name}
								className="flex items-center justify-between ps-3"
							>
								<span className="text-[var(--color-text)]">{sup.name}</span>
								<span
									className="text-sm"
									style={{
										color: sup.inStock
											? 'var(--color-success)'
											: 'var(--color-error)',
									}}
								>
									{sup.inStock ? 'In stock' : 'Out of stock'}
								</span>
							</div>
						))}
					</div>
					<div className="flex items-center justify-between text-sm">
						<span className="text-[var(--color-text-muted)]">Lead time</span>
						<span className="text-[var(--color-text)]">
							{data.availability.leadTime}
						</span>
					</div>
				</div>
			</DetailSection>
		</DetailView>
	)
}
