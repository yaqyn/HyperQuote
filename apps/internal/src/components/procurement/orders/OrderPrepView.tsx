import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	AlertTriangle,
	ArrowLeft,
	CheckCircle2,
	Loader2,
	PackagePlus,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'
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

function formatUrgency(days: number): string {
	if (days <= 0) return 'Today'
	if (days === 1) return 'Tomorrow'
	return `${days} days`
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
						Back
					</EmployeeActionButton>
				</div>
			</div>
		)
	}

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="font-[family-name:var(--font-archivo)] text-[13px] text-[var(--ink-mid)]">
					{isLoading ? 'Loading order...' : 'Order not found.'}
				</p>
			</div>
		)
	}

	const shortages = data.items.filter((item) => item.status === 'shortage')
	const readyItems = data.items.filter((item) => item.status === 'ready')
	const approveOrder = () =>
		approveMutation.mutate({ data: { quoteId: data.quoteId } })

	return (
		<div className="compendium-theme flex h-full flex-col bg-[var(--folio)] text-[var(--ink)]">
			<header className="shrink-0 border-b border-[var(--rule-soft)] px-4 py-3 sm:px-6 lg:py-4">
				<div className="hidden flex-wrap items-start justify-between gap-3 lg:flex">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-mid)]">
							Order prep
						</p>
						<h2 className="mt-1 min-w-0 break-words font-[family-name:var(--font-archivo)] text-[20px] font-semibold leading-6 text-[var(--ink)]">
							{data.customerName}
						</h2>
						<p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--ink-mid)]">
							<span>{data.quoteNumber}</span>
							{data.customerPoNumber && (
								<>
									<span aria-hidden="true" className="opacity-60">
										·
									</span>
									<span>PO {data.customerPoNumber}</span>
								</>
							)}
							<span aria-hidden="true" className="opacity-60">
								·
							</span>
							<span>{data.deliveryCity || 'No city'}</span>
						</p>
					</div>

					<EmployeeStatusPill
						tone={data.allReady ? 'success' : 'warning'}
						leading={
							data.allReady ? (
								<CheckCircle2 size={14} strokeWidth={2.5} />
							) : (
								<AlertTriangle size={14} strokeWidth={2.5} />
							)
						}
						className="shrink-0"
					>
						{data.allReady ? 'Ready' : `${shortages.length} short`}
					</EmployeeStatusPill>
				</div>

				<div className="grid grid-cols-3 overflow-hidden rounded-md border border-[var(--rule-soft)] lg:mt-4">
					<OrderMetric
						label="Needed"
						value={formatUrgency(data.deliveryUrgencyDays)}
					/>
					<OrderMetric
						label="Items"
						value={`${data.readyCount}/${data.itemCount}`}
						middle
					/>
					<OrderMetric
						label="Value"
						value={`${Math.round(data.totalValue).toLocaleString('en-EG')} EGP`}
					/>
				</div>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 sm:px-6">
				{shortages.length > 0 && (
					<OrderSection title={`Shortages · ${shortages.length}`}>
						<ol className="-mx-4 overflow-hidden border-y border-[var(--rule-soft)] sm:mx-0 sm:rounded-md sm:border">
							{shortages.map((item, index) => (
								<ShortageRow
									key={item.productSlug}
									item={item}
									index={index}
									onRefill={() => setRefillSlug(item.productSlug)}
								/>
							))}
						</ol>
					</OrderSection>
				)}

				{readyItems.length > 0 && (
					<OrderSection title={`Ready · ${readyItems.length}`}>
						<ol className="-mx-4 overflow-hidden border-y border-[var(--rule-soft)] sm:mx-0 sm:rounded-md sm:border">
							{readyItems.map((item, index) => (
								<ReadyRow key={item.productSlug} item={item} index={index} />
							))}
						</ol>
					</OrderSection>
				)}
			</div>

			<footer className="shrink-0 border-t border-[var(--rule-soft)] bg-[var(--folio)] px-4 py-4 sm:px-6">
				<div className="flex flex-col gap-3">
					<p className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-mid)]">
						{data.allReady
							? 'All order lines are available. Inventory can release this order to warehouse.'
							: `Refill ${shortages.length} short item${shortages.length === 1 ? '' : 's'} before warehouse release.`}
					</p>
					<div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
						<EmployeeActionButton
							tone="neutral"
							leading={<ArrowLeft size={14} strokeWidth={2.4} />}
							onClick={onBack}
							disabled={approveMutation.isPending}
							aria-label="Back to orders"
						>
							Back
						</EmployeeActionButton>
						<EmployeeActionButton
							tone="success"
							leading={
								approveMutation.isPending ? (
									<Loader2
										size={13}
										strokeWidth={2.5}
										className="animate-spin"
									/>
								) : (
									<CheckCircle2 size={14} strokeWidth={2.5} />
								)
							}
							disabled={!data.allReady || approveMutation.isPending}
							onClick={approveOrder}
							fullWidthOnMobile
						>
							Approve for warehouse
						</EmployeeActionButton>
					</div>
				</div>
			</footer>

			<RefillPanel
				productSlug={refillSlug}
				onClose={() => {
					setRefillSlug(null)
					qc.invalidateQueries({ queryKey: ['customer-order-detail', quoteId] })
				}}
			/>
		</div>
	)
}

function OrderMetric({
	label,
	value,
	middle,
}: {
	label: string
	value: string
	middle?: boolean
}) {
	return (
		<div
			className={`px-3 py-2 ${middle ? 'border-x border-[var(--rule-soft)]' : ''}`}
		>
			<span className="block font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				{label}
			</span>
			<span className="mt-1 block break-words font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums text-[var(--ink)]">
				{value}
			</span>
		</div>
	)
}

function OrderSection({
	title,
	children,
}: {
	title: string
	children: ReactNode
}) {
	return (
		<section className="mt-5">
			<div className="mb-2 flex items-center gap-2">
				<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-mid)]">
					{title}
				</span>
				<span
					aria-hidden="true"
					className="h-px flex-1 bg-[var(--rule-soft)]"
				/>
			</div>
			{children}
		</section>
	)
}

function ShortageRow({
	item,
	index,
	onRefill,
}: {
	item: OrderLineItemView
	index: number
	onRefill: () => void
}) {
	const rowTone = index % 2 === 0 ? 'bg-[var(--folio)]' : 'bg-black/[0.018]'
	return (
		<li
			className={`border-b border-[var(--rule-soft)] last:border-b-0 ${rowTone}`}
		>
			<div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_8rem_7rem_auto] md:items-center">
				<div className="min-w-0">
					<h3 className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[14px] font-semibold leading-5 text-[var(--ink)]">
						{item.productName}
					</h3>
					<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						{item.productSku}
					</p>
				</div>
				<OrderQty label="Available" value={item.stockLevel} unit={item.unit} />
				<OrderQty
					label="Short"
					value={item.shortage}
					unit={item.unit}
					tone="attention"
				/>
				<EmployeeActionButton
					size="sm"
					leading={<PackagePlus size={13} strokeWidth={2.4} />}
					onClick={onRefill}
					fullWidthOnMobile
				>
					Refill
				</EmployeeActionButton>
			</div>
		</li>
	)
}

function ReadyRow({ item, index }: { item: OrderLineItemView; index: number }) {
	const rowTone = index % 2 === 0 ? 'bg-[var(--folio)]' : 'bg-black/[0.018]'
	return (
		<li
			className={`border-b border-[var(--rule-soft)] last:border-b-0 ${rowTone}`}
		>
			<div className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_8rem_7rem] md:items-center">
				<div className="min-w-0">
					<h3 className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[14px] font-semibold leading-5 text-[var(--ink)]">
						{item.productName}
					</h3>
					<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						{item.productSku}
					</p>
				</div>
				<OrderQty label="Required" value={item.requiredQty} unit={item.unit} />
				<OrderQty label="Available" value={item.stockLevel} unit={item.unit} />
			</div>
		</li>
	)
}

function OrderQty({
	label,
	value,
	unit,
	tone,
}: {
	label: string
	value: number
	unit: string
	tone?: 'attention'
}) {
	return (
		<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 md:flex-col md:items-end md:gap-1">
			<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				{label}
			</span>
			<span
				className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums"
				style={{
					color:
						tone === 'attention' ? 'var(--compendium-attention)' : 'var(--ink)',
				}}
			>
				{value.toLocaleString('en-EG')} {unit}
			</span>
		</div>
	)
}
