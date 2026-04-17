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
import { RefillPanel } from '../stock/RefillPanel'

interface OrderPrepViewProps {
	quoteId: string
	onBack: () => void
}

export function OrderPrepView({ quoteId, onBack }: OrderPrepViewProps) {
	const qc = useQueryClient()
	const { data, isLoading } = useQuery({
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

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center text-[13px] text-[var(--color-text-subtle)]">
				{isLoading ? 'Loading order…' : 'Order not found or already approved.'}
			</div>
		)
	}

	const shortages = data.items.filter((i) => i.status === 'shortage')
	const readyItems = data.items.filter((i) => i.status === 'ready')

	return (
		<div className="relative flex h-full flex-col bg-[var(--color-surface)] dark:bg-[#0A0A0A]">
			<div
				className="flex-1 min-h-0 overflow-y-auto px-6 py-5"
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
					<header className="flex items-start justify-between gap-8 border-b border-black/[0.04] pb-5 dark:border-white/[0.04]">
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
									needs in {data.deliveryUrgencyDays}d
								</span>
							</div>
						</div>

						<div className="flex flex-col items-end gap-2">
							{/* Readiness hero */}
							{data.allReady ? (
								<div className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/[0.08] px-3 py-2 text-emerald-700 dark:text-emerald-400">
									<CheckCircle2 size={14} strokeWidth={2.5} />
									<span className="text-[12px] font-semibold">
										Ready to ship · every item in stock
									</span>
								</div>
							) : (
								<div className="inline-flex items-center gap-2 rounded-lg bg-amber-500/[0.1] px-3 py-2 text-amber-700 dark:text-amber-400">
									<AlertTriangle size={14} strokeWidth={2.5} />
									<span className="text-[12px] font-semibold">
										{shortages.length} item{shortages.length !== 1 ? 's' : ''}{' '}
										short
									</span>
								</div>
							)}

							<button
								type="button"
								disabled={!data.allReady || approveMutation.isPending}
								onClick={() =>
									approveMutation.mutate({ data: { quoteId: data.quoteId } })
								}
								className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
									data.allReady
										? 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60'
										: 'cursor-not-allowed border border-black/[0.08] text-[var(--color-text-subtle)] dark:border-white/[0.1]'
								}`}
							>
								{approveMutation.isPending && (
									<Loader2
										size={12}
										strokeWidth={2.5}
										className="animate-spin"
									/>
								)}
								Approve & ship to warehouse
							</button>
						</div>
					</header>

					{/* Shortages block — only if something's missing */}
					{shortages.length > 0 && (
						<section>
							<div className="mb-3 flex items-center gap-2">
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
							<div className="mb-3 flex items-center gap-2">
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
		<div
			className="grid items-center gap-4 border-b border-black/[0.04] px-3 py-3 dark:border-white/[0.04]"
			style={{
				gridTemplateColumns:
					'14px minmax(0,1.6fr) minmax(160px,1.2fr) minmax(180px,1.4fr) 130px',
			}}
		>
			<div className="h-2 w-2 rounded-full bg-amber-500" />

			<div className="min-w-0">
				<p className="truncate text-[12.5px] font-medium text-[var(--color-text)]">
					{item.productName}
				</p>
				<p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
					{item.productSku}
				</p>
			</div>

			{/* Required vs available */}
			<div className="flex flex-col">
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
			<div className="flex items-center gap-2">
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
			<button
				type="button"
				onClick={onRefill}
				className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-primary)] py-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[var(--color-primary)]/90"
			>
				<Phone size={10} strokeWidth={2.5} />
				Refill
			</button>
		</div>
	)
}

// ─── Ready row ────────────────────────────────────────────

function ReadyRow({ item }: { item: OrderLineItemView }) {
	return (
		<div
			className="grid items-center gap-4 border-b border-black/[0.04] px-3 py-2.5 dark:border-white/[0.04]"
			style={{
				gridTemplateColumns:
					'14px minmax(0,1.6fr) minmax(160px,1.2fr) minmax(180px,1.4fr) 130px',
			}}
		>
			<div className="h-2 w-2 rounded-full bg-emerald-500" />

			<div className="min-w-0">
				<p className="truncate text-[12px] text-[var(--color-text)]">
					{item.productName}
				</p>
				<p className="truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
					{item.productSku}
				</p>
			</div>

			<div className="flex items-baseline gap-1">
				<span className="font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums text-[var(--color-text)]">
					{item.requiredQty.toLocaleString('en-EG')}
				</span>
				<span className="text-[10px] text-[var(--color-text-subtle)]">
					{item.unit}
				</span>
			</div>

			<div className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
				on hand {item.stockLevel.toLocaleString('en-EG')}
			</div>

			<div className="text-end font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--color-text-muted)]">
				{item.lineTotal.toLocaleString('en-EG')} EGP
			</div>
		</div>
	)
}
