import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
	type CustomerOrderView,
	getCustomerOrdersList,
} from '../../../lib/server/orders'
import { useProcurementStore } from '../../../stores/procurement'
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

	const { data, isLoading } = useQuery({
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
			<div className="mx-auto flex max-w-[920px] flex-col px-10 pt-8 pb-16">
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
		<div className="mt-6 flex flex-col gap-3 border-b border-[var(--rule-soft)] pb-3">
			<div className="flex items-center gap-5">
				<div className="flex flex-1 items-baseline gap-2">
					<span
						className="font-[family-name:var(--font-fraunces)] italic text-[var(--ink-mid)]"
						style={{ fontSize: '11.5px' }}
					>
						find
					</span>
					<input
						type="search"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="a customer, quote number, or PO"
						className="w-full bg-transparent font-[family-name:var(--font-fraunces)] text-[14px] text-[var(--ink)] outline-none placeholder:font-[family-name:var(--font-fraunces)] placeholder:italic placeholder:text-[var(--ink-ghost)]"
					/>
					{search && (
						<button
							type="button"
							onClick={() => setSearch('')}
							className="font-[family-name:var(--font-fraunces)] italic text-[11px] text-[var(--ink-mid)] hover:text-[var(--ink)]"
						>
							clear
						</button>
					)}
				</div>
			</div>

			<div className="flex items-center gap-5">
				<StatusChip
					label="all"
					count={totals.total}
					active={statusFilter === 'all'}
					onPress={() => setStatusFilter('all')}
				/>
				<StatusChip
					label="ready"
					count={totals.ready}
					active={statusFilter === 'ready'}
					onPress={() => setStatusFilter('ready')}
					tone="fresh"
				/>
				<StatusChip
					label="blocked"
					count={totals.blocked}
					active={statusFilter === 'blocked'}
					onPress={() => setStatusFilter('blocked')}
					tone="aging"
				/>
			</div>
		</div>
	)
}

function StatusChip({
	label,
	count,
	active,
	onPress,
	tone = 'neutral',
}: {
	label: string
	count: number
	active: boolean
	onPress: () => void
	tone?: 'neutral' | 'fresh' | 'aging'
}) {
	const color = {
		neutral: 'var(--ink)',
		fresh: 'var(--compendium-fresh)',
		aging: 'var(--compendium-aging)',
	}[tone]
	return (
		<button
			type="button"
			onClick={onPress}
			aria-pressed={active}
			className="group inline-flex items-baseline gap-1.5 outline-none"
		>
			<span
				className="font-[family-name:var(--font-fraunces)] transition-colors"
				style={{
					fontSize: '12.5px',
					fontStyle: active ? 'normal' : 'italic',
					fontWeight: active ? 600 : 400,
					color: active ? color : 'var(--ink-soft)',
					letterSpacing: active ? '-0.005em' : '0',
				}}
			>
				{label}
			</span>
			<span
				className="font-[family-name:var(--font-geist-mono)] text-[10.5px] tabular-nums"
				style={{ color: active ? color : 'var(--ink-mid)' }}
			>
				{count.toString().padStart(2, '0')}
			</span>
		</button>
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
		<li
			className="relative grid items-start border-t border-[var(--rule-soft)] py-5"
			style={{
				gridTemplateColumns: '22px 1fr auto auto',
				columnGap: '24px',
			}}
		>
			{/* Left margin */}
			<div className="relative pt-1">
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
				<div className="mt-3 flex items-center gap-3">
					<div
						className="compendium-strata flex-1"
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
			<div className="flex flex-col items-end pt-1">
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
			<div className="flex items-center pt-2">
				<button
					type="button"
					onClick={() => onOpen(order.quoteId)}
					className="group inline-flex items-baseline gap-1.5 border-b border-transparent pb-0.5 outline-none"
				>
					<span
						className="font-[family-name:var(--font-fraunces)] italic"
						style={{
							fontSize: '13.5px',
							letterSpacing: '-0.005em',
							fontWeight: blocked ? 500 : 400,
							color: blocked ? 'var(--ink)' : 'var(--ink-mid)',
						}}
					>
						{blocked ? 'check shortage' : 'approve'}
					</span>
					<span
						aria-hidden="true"
						className="transition-transform group-hover:translate-x-[3px]"
						style={{
							fontFamily: 'var(--font-fraunces)',
							fontStyle: 'italic',
							fontSize: '14px',
							color: accent,
						}}
					>
						→
					</span>
				</button>
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
