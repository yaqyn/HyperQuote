/**
 * Order row — data is the design. No border, no card.
 * Just a pressable row with a bottom divider.
 * Geist Mono for all numbers. RTL-aware chevron.
 */

import { ChevronRight } from 'lucide-react'
import { Button } from 'react-aria-components'
import type { Order, OrderStatus, OrderType } from '../../types/order'

/** Default status derived from type when explicit status isn't provided. */
const DEFAULT_STATUS_BY_TYPE: Record<OrderType, OrderStatus> = {
	saved: 'draft',
	submitted: 'submitted',
	confirmed: 'order_confirmed',
}

/** Uppercase status label */
function getStatusLabel(status: OrderStatus): string {
	const labels: Record<OrderStatus, string> = {
		draft: 'DRAFT',
		submitted: 'SUBMITTED',
		quote_ready: 'QUOTE READY',
		negotiating: 'NEGOTIATING',
		accepted: 'ACCEPTED',
		order_confirmed: 'CONFIRMED',
		being_prepared: 'PREPARING',
		out_for_delivery: 'IN TRANSIT',
		delivered: 'DELIVERED',
		expired: 'EXPIRED',
		cancelled: 'CANCELLED',
	}
	return labels[status]
}

/** Format amount as EGP with thousands separator */
function formatAmount(amount: number): string {
	return `EGP ${new Intl.NumberFormat('en-EG').format(amount)}`
}

interface OrderCardProps {
	order: Order
	onPress?: () => void
}

export function OrderCard({ order, onPress }: OrderCardProps) {
	const formattedDate = new Date(order.date).toLocaleDateString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
	})

	return (
		<Button
			onPress={onPress}
			className="flex items-center justify-between w-full py-4 border-b border-[var(--color-border)] text-start cursor-pointer transition-colors duration-100 hover:bg-[var(--color-surface)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 rounded-sm"
		>
			<div className="flex flex-col gap-1 min-w-0 flex-1">
				{/* Row 1: Reference + Status */}
				<div className="flex items-center gap-3">
					<span className="font-mono text-sm text-[var(--color-text)]">
						{order.reference}
					</span>
					<span className="text-[13px] uppercase tracking-widest text-[var(--color-text-muted)]">
						{getStatusLabel(order.status ?? DEFAULT_STATUS_BY_TYPE[order.type])}
					</span>
				</div>

				{/* Row 2: Item count + Description */}
				<p className="text-[13px] text-[var(--color-text-muted)] truncate">
					<span className="font-mono">{order.itemCount}</span> items
					{order.description ? ` · ${order.description}` : ''}
				</p>

				{/* Row 3: Date + Amount */}
				<div className="flex items-center gap-3">
					<span className="font-mono text-[13px] text-[var(--color-text-muted)]">
						{formattedDate}
					</span>
					{order.amount != null && (
						<span className="font-mono text-[13px] text-[var(--color-text-muted)]">
							{formatAmount(order.amount)}
						</span>
					)}
				</div>
			</div>

			{/* Chevron — barely there */}
			<ChevronRight
				size={14}
				strokeWidth={1.5}
				className="shrink-0 ms-3 text-[var(--color-text-muted)]/40 rtl:rotate-180"
			/>
		</Button>
	)
}
