import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	Clock,
	Loader2,
	MapPin,
	Phone,
} from 'lucide-react'
import { useState } from 'react'
import {
	approveOrderForWarehouse,
	getCustomerOrderDetail,
	type OrderLineItemView,
} from '../../../lib/server/orders'
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../../shared/EmployeeControls'
import { RefillPanel } from '../stock/RefillPanel'

interface OrderPrepViewProps {
	quoteId: string
	onBack: () => void
}

export function OrderPrepView({ quoteId, onBack }: OrderPrepViewProps) {
	const qc = useQueryClient()
	const { data, isLoading, isError } = useQuery({
		queryKey: ['customer-order-detail', quoteId],
		queryFn: () => getCustomerOrderDetail({ data: { quoteId } }),
		staleTime: 10_000,
	})

	const [refillSlug, setRefillSlug] = useState<string | null>(null)

	const approveMutation = useMutation({
		mutationFn: approveOrderForWarehouse,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['customer-orders'] })
			qc.invalidateQueries({ queryKey: ['customer-order-detail', quoteId] })
			qc.invalidateQueries({ queryKey: ['stock-overview'] })
			onBack()
		},
	})

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center px-6 text-center">
				<div className="max-w-sm rounded-md border border-red-600/20 bg-red-600/[0.04] px-4 py-3">
					<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-red-700 dark:text-red-300">
						Order prep could not load.
					</p>
					<p className="mt-1 text-[12px] text-[var(--color-text-subtle)]">
						Return to orders and reopen this one before approving it.
					</p>
					<EmployeeActionButton
						tone="neutral"
						size="sm"
						leading={<ArrowLeft size={13} strokeWidth={2.4} />}
						onClick={onBack}
						className="mt-3"
					>
						Back to orders
					</EmployeeActionButton>
				</div>
			</div>
		)
	}

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center text-[13px] text-[var(--color-text-subtle)]">
				{isLoading ? 'Loading order…' : 'Order not found or already approved.'}
			</div>
		)
	}

	const shortages = data.items.filter((i) => i.status === 'shortage')
	const readyItems = data.items.filter((i) => i.status === 'ready')
	const approveOrder = () =>
		approveMutation.mutate({ data: { quoteId: data.quoteId } })
	const deliveryNeed =
		data.deliveryUrgencyDays <= 0
			? 'needs today'
			: `needs in ${data.deliveryUrgencyDays}d`

	return (
		<div className="relative flex h-full flex-col bg-[var(--color-surface)] dark:bg-[#0A0A0A]">
			<div
				className="flex-1 min-h-0 overflow-y-auto px-4 py-5 sm:px-6"
				data-module-content
			>
				<div className="mx-auto flex max-w-[1080px] flex-col gap-6">
					{/* Back bar */}
					<button
						type="button"
						onClick={onBack}
						className="inline-flex w-fit items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-subtle)] transition-colors hover:text-[var(--color-text)]"
					>
						<ArrowLeft size={12} strokeWidth={2} />
						Back to orders
					</button>

					{/* Header */}
					<header className="flex flex-col items-start gap-4 border-b border-black/[0.04] pb-5 dark:border-white/[0.04] sm:flex-row sm:justify-between sm:gap-8">
						<div>
							<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--color-text-subtle)]">
								Order prep
							</p>
							<h1 className="mt-1 text-[22px] font-semibold text-[var(--color-text)]">
								{data.customerName}
							</h1>
							<div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--color-text-muted)]">
								<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
									{data.quoteNumber}
								</span>
								{data.customerPoNumber && (
									<span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
										PO {data.customerPoNumber}
									</span>
								)}
								<span className="inline-flex items-center gap-1">
									<MapPin size={10} strokeWidth={2} />
									{data.deliveryCity || '—'}
								</span>
								<span className="inline-flex items-center gap-1">
									<Clock size={10} strokeWidth={2} />
									{deliveryNeed}
								</span>
							</div>
						</div>

						<div className="flex flex-col items-start gap-2 sm:items-end">
							{data.allReady ? (
								<EmployeeStatusPill
									tone="success"
									leading={<CheckCircle2 size={14} strokeWidth={2.5} />}
								>
									Ready to ship · every item in stock
								</EmployeeStatusPill>
							) : (
								<EmployeeStatusPill
									tone="warning"
									leading={<AlertTriangle size={14} strokeWidth={2.5} />}
								>
									{shortages.length} item{shortages.length !== 1 ? 's' : ''}{' '}
									short
								</EmployeeStatusPill>
							)}
						</div>
					</header>

					{/* Shortages block — only if something's missing */}
					{shortages.length > 0 && (
						<section>
							<div className="mb-3 flex flex-wrap items-center gap-2">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
									Missing from inventory · {shortages.length}
								</span>
								<span className="h-px flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
								<span className="text-[10px] text-[var(--color-text-subtle)]">
									Refill each to unblock the order
								</span>
							</div>
							<div className="flex flex-col">
								{shortages.map((item) => (
									<ShortageRow
										key={item.productSlug}
										item={item}
										onRefill={() => setRefillSlug(item.productSlug)}
									/>
								))}
							</div>
						</section>
					)}

					{/* Ready items — collapsible summary */}
					{readyItems.length > 0 && (
						<section>
							<div className="mb-3 flex flex-wrap items-center gap-2">
								<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">
									Ready · {readyItems.length}
								</span>
								<span className="h-px flex-1 bg-black/[0.06] dark:bg-white/[0.06]" />
							</div>
							<div className="flex flex-col">
								{readyItems.map((item) => (
									<ReadyRow key={item.productSlug} item={item} />
								))}
							</div>
						</section>
					)}
				</div>
			</div>

			<div className="shrink-0 border-t border-black/[0.06] bg-[var(--color-surface)] px-4 py-3 dark:border-white/[0.08] dark:bg-[#0A0A0A] sm:px-6">
				<div className="mx-auto flex max-w-[1080px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<EmployeeActionButton
						tone="neutral"
						size="sm"
						leading={<ArrowLeft size={13} strokeWidth={2.4} />}
						onClick={onBack}
						fullWidthOnMobile
					>
						Back to orders
					</EmployeeActionButton>
					{data.allReady ? (
						<EmployeeStatusPill
							tone="success"
							leading={<CheckCircle2 size={14} strokeWidth={2.5} />}
							className="justify-center"
						>
							Ready · {readyItems.length} item
							{readyItems.length === 1 ? '' : 's'} in stock
						</EmployeeStatusPill>
					) : (
						<EmployeeStatusPill
							tone="warning"
							leading={<AlertTriangle size={14} strokeWidth={2.5} />}
							className="justify-center"
						>
							Refill {shortages.length} item
							{shortages.length === 1 ? '' : 's'} before warehouse
						</EmployeeStatusPill>
					)}
					<EmployeeActionButton
						tone="success"
						leading={
							approveMutation.isPending ? (
								<Loader2 size={13} strokeWidth={2.5} className="animate-spin" />
							) : (
								<CheckCircle2 size={14} strokeWidth={2.5} />
							)
						}
						disabled={!data.allReady || approveMutation.isPending}
						onClick={approveOrder}
						fullWidthOnMobile
					>
						Approve & ship to warehouse
					</EmployeeActionButton>
				</div>
			</div>

			{/* Shared refill slide-in — same pattern used in Inventory tab */}
			<RefillPanel
				productSlug={refillSlug}
				onClose={() => {
					setRefillSlug(null)
					// Refresh stock snapshot so readiness updates after deal is sealed.
					qc.invalidateQueries({ queryKey: ['customer-order-detail', quoteId] })
				}}
			/>
		</div>
	)
}

// ─── Shortage row ────────────────────────────────────────

function ShortageRow({
	item,
	onRefill,
}: {
	item: OrderLineItemView
	onRefill: () => void
}) {
	// On-hand visualized against required so the user sees how much is missing
	const onHandPct =
		item.requiredQty > 0 ? (item.stockLevel / item.requiredQty) * 100 : 0
	return (
		<div className="relative flex flex-col items-start gap-3 border-b border-black/[0.04] py-3 pr-3 pl-8 dark:border-white/[0.04] md:grid md:grid-cols-[14px_minmax(0,1.6fr)_minmax(160px,1.2fr)_minmax(180px,1.4fr)_130px] md:items-center md:gap-4 md:px-3">
			<div className="absolute left-3 top-4 h-2 w-2 rounded-full bg-amber-500 md:static" />

			<div className="min-w-0">
				<p className="text-[12.5px] font-medium leading-snug text-[var(--color-text)]">
					{item.productName}
				</p>
				<p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
					{item.productSku}
				</p>
			</div>

			{/* Required vs available */}
			<div className="flex w-full flex-col md:col-auto">
				<div className="flex items-baseline gap-1">
					<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
						{item.stockLevel.toLocaleString('en-EG')}
					</span>
					<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-subtle)]">
						/ {item.requiredQty.toLocaleString('en-EG')}
					</span>
					<span className="text-[10px] text-[var(--color-text-subtle)]">
						{item.unit}
					</span>
				</div>
				<div className="mt-1 relative h-1 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.08]">
					<div
						className="absolute inset-y-0 start-0 rounded-full bg-amber-500"
						style={{ width: `${Math.min(100, onHandPct)}%` }}
					/>
				</div>
			</div>

			{/* Shortage callout */}
			<div className="flex items-center gap-2 md:col-auto">
				<span
					aria-hidden="true"
					className="inline-block h-6 w-0.5 rounded-full bg-red-500/60"
				/>
				<div>
					<p className="font-[family-name:var(--font-geist-mono)] text-[14px] font-semibold tabular-nums text-red-600 dark:text-red-400">
						−{item.shortage.toLocaleString('en-EG')}
					</p>
					<p className="text-[9px] uppercase tracking-wider text-[var(--color-text-subtle)]">
						short · {item.unit}
					</p>
				</div>
			</div>

			{/* Refill action */}
			<EmployeeActionButton
				size="sm"
				leading={<Phone size={13} strokeWidth={2.5} />}
				onClick={onRefill}
				fullWidthOnMobile
				className="md:col-auto md:w-full"
			>
				Refill
			</EmployeeActionButton>
		</div>
	)
}

// ─── Ready row ────────────────────────────────────────────

function ReadyRow({ item }: { item: OrderLineItemView }) {
	return (
		<div className="relative flex flex-col items-start gap-2 border-b border-black/[0.04] py-2.5 pr-3 pl-8 dark:border-white/[0.04] md:grid md:grid-cols-[14px_minmax(0,1.6fr)_minmax(160px,1.2fr)_minmax(180px,1.4fr)_130px] md:items-center md:gap-4 md:px-3">
			<div className="absolute left-3 top-3.5 h-2 w-2 rounded-full bg-emerald-500 md:static" />

			<div className="min-w-0">
				<p className="text-[12px] leading-snug text-[var(--color-text)]">
					{item.productName}
				</p>
				<p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
					{item.productSku}
				</p>
			</div>

			<div className="flex items-baseline gap-1 md:col-auto">
				<span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-[var(--color-text)]">
					{item.requiredQty.toLocaleString('en-EG')}
				</span>
				<span className="text-[10px] text-[var(--color-text-subtle)]">
					{item.unit}
				</span>
			</div>

			<div className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)] md:col-auto">
				on hand {item.stockLevel.toLocaleString('en-EG')}
			</div>

			<div className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)] md:col-auto md:text-end">
				{item.lineTotal.toLocaleString('en-EG')} EGP
			</div>
		</div>
	)
}
