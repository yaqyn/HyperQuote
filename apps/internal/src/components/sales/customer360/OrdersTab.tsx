import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getCustomer360 } from '../../../lib/server/sales-customers'

interface OrdersTabProps {
	customerId: string
	enabled: boolean
}

export function OrdersTab({ customerId, enabled }: OrdersTabProps) {
	const { t } = useTranslation('internal')
	const [expandedId, setExpandedId] = useState<string | null>(null)

	const { data, isLoading } = useQuery({
		queryKey: ['customer-360', 'orders', customerId],
		queryFn: () => getCustomer360({ data: { customerId } }),
		staleTime: 120_000,
		enabled,
		select: (d) => d.orders,
	})

	if (!enabled) return null
	if (isLoading) return <TabSkeleton />
	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-48 text-[13px] text-black/30 dark:text-white/30">
				{t('sales.customer360.orders.noOrders')}
			</div>
		)
	}

	return (
		<div className="p-6">
			{/* Order rows — same pattern as quotes: clean expandable list */}
			<div className="space-y-0">
				{data.map((order) => (
					<div key={order.id}>
						<button
							type="button"
							onClick={() =>
								setExpandedId(expandedId === order.id ? null : order.id)
							}
							className="w-full text-start flex items-center gap-4 py-3 border-b border-black/[0.04] dark:border-white/[0.04] last:border-b-0 hover:bg-black/[0.01] dark:hover:bg-white/[0.02] transition-colors"
						>
							{/* Order number */}
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] font-medium text-[#2563EB] w-[100px] shrink-0">
								{order.orderNumber}
							</span>

							{/* Date */}
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-black/40 dark:text-white/40 w-[90px] shrink-0">
								{new Date(order.createdAt).toLocaleDateString()}
							</span>

							{/* Total */}
							<span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[13px] text-[var(--color-text)] dark:text-white flex-1">
								{formatCurrency(order.total)}
							</span>

							{/* Status pill */}
							<span className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/50 dark:text-white/50 capitalize">
								{order.status.replace(/_/g, ' ')}
							</span>
						</button>

						{/* Expanded details */}
						{expandedId === order.id && (
							<div className="ps-[100px] py-3 flex gap-6 text-[11px] border-b border-black/[0.04] dark:border-white/[0.04]">
								<div>
									<span className="text-black/30 dark:text-white/30">
										{t('sales.customer360.orders.delivery')}
									</span>
									<p className="text-[13px] text-[var(--color-text)] dark:text-white capitalize mt-0.5">
										{order.deliveryStatus.replace(/_/g, ' ')}
									</p>
								</div>
								<div>
									<span className="text-black/30 dark:text-white/30">
										{t('sales.customer360.orders.payment')}
									</span>
									<p className="text-[13px] text-[var(--color-text)] dark:text-white capitalize mt-0.5">
										{order.paymentStatus.replace(/_/g, ' ')}
									</p>
								</div>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	)
}

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-EG', {
		style: 'currency',
		currency: 'EGP',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

function TabSkeleton() {
	return (
		<div className="p-6 space-y-3 animate-pulse">
			{Array.from({ length: 4 }, (_, i) => `skeleton-${i}`).map((key) => (
				<div
					key={key}
					className="h-10 rounded bg-black/[0.03] dark:bg-white/[0.03]"
				/>
			))}
		</div>
	)
}
