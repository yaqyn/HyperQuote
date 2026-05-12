import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
	type CustomerOrderView,
	getCustomerOrdersList,
} from '../../../lib/server/orders'
import { useProcurementStore } from '../../../stores/procurement'
import {
	EmployeeActionButton,
	EmployeeFilterChip,
	EmployeeSearchField,
} from '../../shared/EmployeeControls'
import { OrderPrepView } from './OrderPrepView'

function formatHoursAgo(hours: number): string {
	if (hours < 1) return 'just now'
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	if (days < 30) return `${days}d ago`
	return `${Math.round(days / 30)}mo ago`
}

function formatUrgency(days: number): string {
	if (days <= 0) return 'urgent · today'
	if (days === 1) return 'needs in a day'
	if (days < 7) return `needs in ${days} days`
	if (days < 30) return `needs in ${days} days`
	return 'scheduled'
}

type StatusFilter = 'all' | 'ready' | 'blocked'

// ─── View ────────────────────────────────────────────────

/**
 * The Commitments — chapter III of the Compendium. Customer orders that
 * have been sold, cleared by finance, and are now the inventory team's
 * promise to keep. Each row reads as a standing commitment: who is
 * waiting, by when, for how many items, and whether the shelf can keep
 * the word given at the quote stage.
 */
export function OrdersView() {
	const activeCategory = useProcurementStore((s) => s.activeCategory)

	const { data, isLoading, isError } = useQuery({
		queryKey: ['customer-orders'],
		queryFn: () => getCustomerOrdersList({ data: {} }),
		staleTime: 30_000,
	})

	const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
	const [search, setSearch] = useState('')
	const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)

	const filtered = useMemo(() => {
		if (!data) return []
		let list = data.orders
		if (statusFilter === 'ready') list = list.filter((o) => o.allReady)
		if (statusFilter === 'blocked') list = list.filter((o) => !o.allReady)
		if (search.trim()) {
			const q = search.trim().toLowerCase()
			list = list.filter(
				(o) =>
					o.customerName.toLowerCase().includes(q) ||
					o.quoteNumber.toLowerCase().includes(q) ||
					(o.customerPoNumber?.toLowerCase().includes(q) ?? false),
			)
		}
		// Blocked first, then the most urgent delivery window.
		return [...list].sort((a, b) => {
			if (a.allReady !== b.allReady) return a.allReady ? 1 : -1
			return a.deliveryUrgencyDays - b.deliveryUrgencyDays
		})
	}, [data, statusFilter, search])

	if (selectedQuoteId) {
		return (
			<OrderPrepView
				quoteId={selectedQuoteId}
				onBack={() => setSelectedQuoteId(null)}
			/>
		)
	}

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
				<p
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '13px' }}
				>
					gathering the commitments…
				</p>
			</div>
		)
	}

	return (
		<div className="animate-folio-turn relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[920px] flex-col px-4 pt-6 pb-16 sm:px-6 lg:px-10 lg:pt-8">
				<CommitmentsMasthead
					totals={data.totals}
					activeCategoryNote={activeCategory !== 'all'}
				/>

				<CommitmentsToolbar
					statusFilter={statusFilter}
					setStatusFilter={setStatusFilter}
					search={search}
					setSearch={setSearch}
					totals={data.totals}
				/>

				{filtered.length > 0 ? (
					<ol className="mt-7 flex flex-col">
						{filtered.map((order, idx) => (
							<CommitmentPlate
								key={order.quoteId}
								index={idx}
								order={order}
								onOpen={setSelectedQuoteId}
							/>
						))}
					</ol>
				) : (
					<CommitmentsEmpty
						hasFilters={statusFilter !== 'all' || !!search.trim()}
					/>
				)}
			</div>
		</div>
	)
}

// ─── Masthead ────────────────────────────────────────────

function CommitmentsMasthead({
	totals,
	activeCategoryNote,
}: {
	totals: {
		total: number
		ready: number
		blocked: number
		shortageItems: number
		value: number
	}
	activeCategoryNote: boolean
}) {
	const primaryNumber = totals.blocked > 0 ? totals.blocked : totals.ready
	const primaryNoun =
		totals.blocked > 0
			? totals.blocked === 1
				? 'order waiting on the shelf'
				: 'orders waiting on the shelf'
			: totals.ready === 1
				? 'order ready to release'
				: 'orders ready to release'

	return (
		<header className="flex flex-col border-b border-[var(--rule)] pb-8">
			<div className="flex flex-wrap items-baseline gap-2">
				<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--ink-mid)]">
					The Compendium · The Commitments
				</span>
				{activeCategoryNote && (
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '11.5px' }}
					>
						· the index shelves materials; orders span them all
					</span>
				)}
			</div>

			<div className="mt-5 flex flex-wrap items-end justify-between gap-6">
				<div className="flex items-baseline gap-4">
					<span
						className="animate-compendium-settle compendium-numeral font-[family-name:var(--font-fraunces)] leading-none text-[var(--ink)]"
						style={{
							fontSize: 'clamp(72px, 10vw, 120px)',
							fontWeight: 500,
							letterSpacing: '-0.045em',
						}}
					>
						{primaryNumber}
					</span>
					<span
						className="pb-3 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
						style={{
							fontSize: '16px',
							maxWidth: '220px',
							lineHeight: 1.15,
							letterSpacing: '-0.003em',
						}}
					>
						{primaryNoun}
					</span>
				</div>

				<dl className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
					<CommitStat label="total" value={totals.total} tone="neutral" />
					<CommitStat label="ready" value={totals.ready} tone="fresh" />
					<CommitStat label="blocked" value={totals.blocked} tone="aging" />
					<CommitStat
						label="short items"
						value={totals.shortageItems}
						tone="stale"
					/>
					<CommitStatValue label="EGP value" value={Math.round(totals.value)} />
				</dl>
			</div>
		</header>
	)
}

function CommitStat({
	label,
	value,
	tone,
}: {
	label: string
	value: number
	tone: 'neutral' | 'fresh' | 'aging' | 'stale'
}) {
	const color = {
		neutral: 'var(--ink)',
		fresh: 'var(--compendium-fresh)',
		aging: 'var(--compendium-aging)',
		stale: 'var(--compendium-stale)',
	}[tone]
	return (
		<div className="flex flex-col items-end">
			<dt
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
				style={{ fontSize: '10.5px', letterSpacing: '0.02em' }}
			>
				{label}
			</dt>
			<dd
				className="font-[family-name:var(--font-geist-mono)] text-[20px] font-semibold tabular-nums leading-none"
				style={{ color: value > 0 ? color : 'var(--ink-ghost)' }}
			>
				{value.toString().padStart(2, '0')}
			</dd>
		</div>
	)
}

function CommitStatValue({ label, value }: { label: string; value: number }) {
	return (
		<div className="flex flex-col items-end">
			<dt
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
				style={{ fontSize: '10.5px', letterSpacing: '0.02em' }}
			>
				{label}
			</dt>
			<dd className="font-[family-name:var(--font-geist-mono)] text-[16px] tabular-nums leading-none text-[var(--ink)]">
				{value.toLocaleString('en-EG')}
			</dd>
		</div>
	)
}

// ─── Toolbar ─────────────────────────────────────────────

function CommitmentsToolbar({
	statusFilter,
	setStatusFilter,
	search,
	setSearch,
	totals,
}: {
	statusFilter: StatusFilter
	setStatusFilter: (s: StatusFilter) => void
	search: string
	setSearch: (s: string) => void
	totals: { total: number; ready: number; blocked: number }
}) {
	return (
		<div className="mt-6 flex flex-col gap-3 border-b border-[var(--rule-soft)] pb-4 lg:flex-row lg:items-center lg:gap-4">
			<EmployeeSearchField
				value={search}
				onChange={setSearch}
				label="Search orders"
				placeholder="Search customer, quote number, or PO"
				className="lg:flex-1"
			/>

			<div className="flex flex-wrap gap-2">
				<EmployeeFilterChip
					count={totals.total}
					active={statusFilter === 'all'}
					onClick={() => setStatusFilter('all')}
				>
					All orders
				</EmployeeFilterChip>
				<EmployeeFilterChip
					count={totals.ready}
					active={statusFilter === 'ready'}
					onClick={() => setStatusFilter('ready')}
					tone="success"
				>
					Ready
				</EmployeeFilterChip>
				<EmployeeFilterChip
					count={totals.blocked}
					active={statusFilter === 'blocked'}
					onClick={() => setStatusFilter('blocked')}
					tone="warning"
				>
					Blocked
				</EmployeeFilterChip>
			</div>
		</div>
	)
}

// ─── Plate ───────────────────────────────────────────────

function CommitmentPlate({
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
	const accent = blocked
		? 'var(--compendium-aging)'
		: urgent
			? 'var(--compendium-brand)'
			: 'var(--compendium-fresh)'

	const readyPct =
		order.itemCount > 0 ? (order.readyCount / order.itemCount) * 100 : 0

	return (
		<li className="relative flex flex-col gap-4 border-t border-[var(--rule-soft)] py-5 pl-8 md:grid md:grid-cols-[22px_minmax(0,1fr)_auto_auto] md:items-start md:gap-x-6 md:gap-y-0 md:pl-0">
			{/* Left margin */}
			<div className="absolute left-0 top-5 md:relative md:left-auto md:top-auto md:pt-1">
				{(blocked || urgent) && (
					<span
						aria-hidden="true"
						className="absolute left-1 top-2 bottom-2 w-[2px]"
						style={{ background: accent }}
					/>
				)}
				<span
					className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-ghost)]"
					style={{ fontSize: '11px' }}
				>
					{(index + 1).toString().padStart(2, '0')}
				</span>
			</div>

			{/* Body */}
			<div className="min-w-0">
				<p
					className="font-[family-name:var(--font-fraunces)] leading-[1.12] text-[var(--ink)]"
					style={{
						fontSize: '19px',
						fontWeight: 500,
						letterSpacing: '-0.015em',
					}}
				>
					{order.customerName}
				</p>
				<p
					className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[var(--ink-mid)]"
					style={{ fontSize: '11px' }}
				>
					<span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.1em]">
						{order.quoteNumber}
					</span>
					{order.customerPoNumber && (
						<>
							<span className="opacity-60">·</span>
							<span className="font-[family-name:var(--font-geist-mono)] uppercase tracking-[0.1em]">
								{order.customerPoNumber}
							</span>
						</>
					)}
					<span className="opacity-60">·</span>
					<span className="font-[family-name:var(--font-fraunces)] italic">
						{order.deliveryCity || 'no delivery city'}
					</span>
					<span className="opacity-60">·</span>
					<span
						className="font-[family-name:var(--font-fraunces)] italic"
						style={{
							color: urgent ? 'var(--compendium-brand)' : 'var(--ink-soft)',
						}}
					>
						{formatUrgency(order.deliveryUrgencyDays)}
					</span>
				</p>

				{/* Readiness band */}
				<div className="mt-3 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
					<div
						className="compendium-strata w-full sm:flex-1"
						aria-hidden="true"
						title={`${order.readyCount} of ${order.itemCount} items in stock`}
					>
						<span
							className="absolute inset-y-0 left-0 transition-[width]"
							style={{
								width: `${readyPct}%`,
								background: blocked
									? 'var(--compendium-aging)'
									: 'var(--compendium-fresh)',
							}}
						/>
					</div>
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '10.5px' }}
					>
						{blocked
							? `${order.shortageCount} of ${order.itemCount} short`
							: `all ${order.itemCount} in stock`}
					</span>
					<span className="font-[family-name:var(--font-geist-mono)] text-[9.5px] tabular-nums text-[var(--ink-mid)]">
						· accepted {formatHoursAgo(order.acceptedHoursAgo)}
					</span>
				</div>
			</div>

			{/* Value */}
			<div className="flex flex-col items-start pt-1 md:col-auto md:items-end">
				<span
					className="compendium-numeral font-[family-name:var(--font-fraunces)] text-[var(--ink)]"
					style={{
						fontSize: '22px',
						fontWeight: 500,
						letterSpacing: '-0.025em',
						lineHeight: 1,
					}}
				>
					{Math.round(order.totalValue).toLocaleString('en-EG')}
				</span>
				<span
					className="mt-1 font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
					style={{ fontSize: '10.5px' }}
				>
					EGP · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
				</span>
			</div>

			{/* Action */}
			<div className="flex items-center pt-1 md:col-auto md:pt-2">
				<EmployeeActionButton
					size="sm"
					tone={blocked ? 'primary' : 'success'}
					leading={
						blocked ? (
							<AlertTriangle size={13} strokeWidth={2.4} />
						) : (
							<CheckCircle2 size={13} strokeWidth={2.4} />
						)
					}
					onClick={() => onOpen(order.quoteId)}
					fullWidthOnMobile
					className="md:w-auto"
				>
					{blocked ? 'Fix shortage' : 'Approve order'}
				</EmployeeActionButton>
			</div>
		</li>
	)
}

// ─── Empty ──────────────────────────────────────────────

function CommitmentsEmpty({ hasFilters }: { hasFilters: boolean }) {
	return (
		<div className="mt-16 flex flex-col items-center gap-2 border-y border-dashed border-[var(--rule-soft)] py-14">
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink)]"
				style={{ fontSize: '22px', letterSpacing: '-0.01em' }}
			>
				{hasFilters
					? 'nothing matches your query.'
					: 'no commitments on the books.'}
			</span>
			<span
				className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-soft)]"
				style={{ fontSize: '12px' }}
			>
				{hasFilters
					? 'clear the filter or search to see more.'
					: 'accepted quotes cleared by finance will arrive here for inventory to release.'}
			</span>
		</div>
	)
}
