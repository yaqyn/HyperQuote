import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
	type CustomerOrderView,
	getCustomerOrdersList,
} from '../../../lib/server/orders'
import { EmployeeSearchField } from '../../shared/EmployeeControls'
import { SlidePanel } from '../../shared/SlidePanel'
import { OrderPrepView } from './OrderPrepView'

function formatHoursAgo(hours: number): string {
	if (hours < 1) return 'just now'
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	if (days < 30) return `${days}d ago`
	return `${Math.round(days / 30)}mo ago`
}

function formatUrgency(days: number): string {
	if (days <= 0) return 'Today'
	if (days === 1) return 'Tomorrow'
	return `${days} days`
}

export function OrdersView() {
	const { data, isLoading, isError } = useQuery({
		queryKey: ['customer-orders'],
		queryFn: () => getCustomerOrdersList({ data: {} }),
		staleTime: 30_000,
	})

	const [search, setSearch] = useState('')
	const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
	const selectedOrder =
		data?.orders.find((order) => order.quoteId === selectedQuoteId) ?? null

	const filtered = useMemo(() => {
		if (!data) return []
		let list = data.orders
		if (search.trim()) {
			const q = search.trim().toLowerCase()
			list = list.filter(
				(order) =>
					order.customerName.toLowerCase().includes(q) ||
					order.quoteNumber.toLowerCase().includes(q) ||
					(order.customerPoNumber?.toLowerCase().includes(q) ?? false),
			)
		}
		return [...list].sort((a, b) => {
			if (a.allReady !== b.allReady) return a.allReady ? 1 : -1
			if (a.deliveryUrgencyDays !== b.deliveryUrgencyDays) {
				return a.deliveryUrgencyDays - b.deliveryUrgencyDays
			}
			return b.acceptedHoursAgo - a.acceptedHoursAgo
		})
	}, [data, search])

	if (isError) {
		return (
			<div className="flex h-full items-center justify-center px-6 text-center">
				<div className="max-w-sm rounded-md border border-red-600/20 bg-red-600/[0.04] px-4 py-3">
					<p className="font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-red-700 dark:text-red-300">
						Orders could not load.
					</p>
					<p className="mt-1 text-[12px] text-[var(--color-text-subtle)]">
						Refresh before approving anything for warehouse.
					</p>
				</div>
			</div>
		)
	}

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p className="font-[family-name:var(--font-archivo)] text-[13px] text-[var(--ink-mid)]">
					Loading orders...
				</p>
			</div>
		)
	}

	return (
		<div className="animate-folio-turn relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[1040px] flex-col px-4 pt-4 pb-16 sm:px-6 lg:px-8">
				<OrdersToolbar search={search} setSearch={setSearch} />

				{filtered.length > 0 ? (
					<div className="-mx-4 mt-4 overflow-hidden border-y border-[var(--rule-soft)] bg-[var(--folio)] sm:mx-0 sm:rounded-md sm:border">
						<OrdersHeader />
						<ol>
							{filtered.map((order, index) => (
								<OrderRow
									key={order.quoteId}
									index={index}
									order={order}
									onOpen={setSelectedQuoteId}
								/>
							))}
						</ol>
					</div>
				) : (
					<OrdersEmpty hasSearch={search.trim().length > 0} />
				)}
			</div>

			<SlidePanel
				isOpen={selectedQuoteId !== null}
				onClose={() => setSelectedQuoteId(null)}
				maxWidth={760}
				panelKey="orders-prep-panel"
				ariaLabel="Prepare customer order"
				scope="procurement"
				mobileTitle={selectedOrder?.customerName ?? 'Order prep'}
				mobileSubtitle={selectedOrder?.quoteNumber}
			>
				{selectedQuoteId && (
					<OrderPrepView
						quoteId={selectedQuoteId}
						onBack={() => setSelectedQuoteId(null)}
					/>
				)}
			</SlidePanel>
		</div>
	)
}

function OrdersToolbar({
	search,
	setSearch,
}: {
	search: string
	setSearch: (value: string) => void
}) {
	return (
		<div className="pb-2">
			<EmployeeSearchField
				value={search}
				onChange={setSearch}
				label="Search orders"
				placeholder="Search customer, quote, or PO"
				className="max-w-3xl"
			/>
		</div>
	)
}

function OrdersHeader() {
	return (
		<div className="hidden grid-cols-[2rem_minmax(0,1fr)_8rem_9rem_5rem] gap-4 border-b border-[var(--rule-soft)] px-4 py-2 md:grid">
			<span aria-hidden="true" />
			<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				Customer
			</span>
			<span className="text-end font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				Needed
			</span>
			<span className="text-end font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				Value
			</span>
			<span className="text-end font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
				Action
			</span>
		</div>
	)
}

function OrderRow({
	index,
	order,
	onOpen,
}: {
	index: number
	order: CustomerOrderView
	onOpen: (quoteId: string) => void
}) {
	const blocked = !order.allReady
	const urgent = order.deliveryUrgencyDays <= 0
	const toneColor = blocked
		? 'var(--compendium-attention)'
		: urgent
			? 'var(--color-primary)'
			: 'var(--compendium-fresh)'
	const rowTone = index % 2 === 0 ? 'bg-[var(--folio)]' : 'bg-black/[0.018]'

	return (
		<li
			className={`border-b border-b-[var(--rule-soft)] last:border-b-0 ${rowTone}`}
		>
			<div className="grid w-full gap-3 border-x border-x-transparent p-4 transition-colors hover:border-x-[var(--ink-ghost)] md:grid-cols-[2rem_minmax(0,1fr)_8rem_9rem_5rem] md:items-center">
				<button
					type="button"
					onClick={() => onOpen(order.quoteId)}
					className="flex items-center gap-2 text-start outline-none md:block"
				>
					<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-[var(--ink-mid)]">
						{(index + 1).toString().padStart(2, '0')}
					</span>
					<span
						aria-hidden="true"
						className="h-2 w-2 rounded-full md:mt-2 md:block"
						style={{ background: toneColor }}
					/>
				</button>

				<button
					type="button"
					onClick={() => onOpen(order.quoteId)}
					className="min-w-0 text-start outline-none"
				>
					<span className="md:hidden font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						Customer
					</span>
					<h3 className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[15px] font-semibold leading-5 text-[var(--ink)]">
						{order.customerName}
					</h3>
					<p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						<span>{order.quoteNumber}</span>
						<span aria-hidden="true" className="opacity-60">
							·
						</span>
						<span>
							{order.readyCount}/{order.itemCount} ready
						</span>
						<span aria-hidden="true" className="opacity-60">
							·
						</span>
						<span>{formatHoursAgo(order.acceptedHoursAgo)} old</span>
					</p>
				</button>

				<button
					type="button"
					onClick={() => onOpen(order.quoteId)}
					className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-start outline-none md:flex-col md:items-end md:gap-1"
				>
					<span className="font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						Needed
					</span>
					<span
						className="font-[family-name:var(--font-geist-mono)] text-[13px] font-semibold tabular-nums"
						style={{ color: toneColor }}
					>
						{formatUrgency(order.deliveryUrgencyDays)}
					</span>
				</button>

				<button
					type="button"
					onClick={() => onOpen(order.quoteId)}
					className="flex flex-col items-start text-start outline-none md:items-end"
				>
					<span className="md:hidden font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-mid)]">
						Value
					</span>
					<span className="font-[family-name:var(--font-geist-mono)] text-[16px] font-semibold leading-none tabular-nums text-[var(--ink)]">
						{Math.round(order.totalValue).toLocaleString('en-EG')}
					</span>
					<span className="mt-1 font-[family-name:var(--font-archivo)] text-[11px] text-[var(--ink-mid)]">
						EGP
					</span>
				</button>

				<div className="flex items-center justify-between gap-3 md:justify-end">
					<span
						className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold"
						style={{ color: toneColor }}
					>
						{blocked ? `${order.shortageCount} short` : 'Ready'}
					</span>
					<button
						type="button"
						onClick={() => onOpen(order.quoteId)}
						className="shrink-0 font-[family-name:var(--font-archivo)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] outline-none transition-colors hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30"
					>
						Open
					</button>
				</div>
			</div>
		</li>
	)
}

function OrdersEmpty({ hasSearch }: { hasSearch: boolean }) {
	return (
		<div className="mt-16 flex flex-col items-center gap-2 border-y border-dashed border-[var(--rule-soft)] py-14">
			<span className="font-[family-name:var(--font-archivo)] text-[18px] font-semibold text-[var(--ink)]">
				No orders found
			</span>
			<span className="font-[family-name:var(--font-archivo)] text-[12px] text-[var(--ink-soft)]">
				{hasSearch
					? 'Clear the search to see more orders.'
					: 'Finance-cleared customer orders will appear here.'}
			</span>
		</div>
	)
}
