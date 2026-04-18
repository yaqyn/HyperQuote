import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
	type FinanceDealView,
	type FinanceOrderView,
	getFinanceInbox,
} from '../../lib/server/finance'
import { type FinanceInboxFilter, useFinanceStore } from '../../stores/finance'
import { FinancePaymentPanel } from './FinancePaymentPanel'

// ─── Helpers ──────────────────────────────────────────────

function formatHoursAgo(hours: number): string {
	if (hours < 1) return 'just now'
	if (hours < 24) return `${hours}h ago`
	const days = Math.round(hours / 24)
	if (days < 30) return `${days}d ago`
	return `${Math.round(days / 30)}mo ago`
}

function formatEgp(n: number): string {
	return Math.round(n).toLocaleString('en-EG')
}

function toRoman(n: number): string {
	const map: [number, string][] = [
		[10, 'x'],
		[9, 'ix'],
		[5, 'v'],
		[4, 'iv'],
		[1, 'i'],
	]
	let out = ''
	let rest = n
	for (const [val, letters] of map) {
		while (rest >= val) {
			out += letters
			rest -= val
		}
	}
	return out
}

const FILTER_COPY: Record<FinanceInboxFilter, string> = {
	unpaid: 'unpaid',
	partial: 'partial',
	paid: 'paid',
}

// ─── View ────────────────────────────────────────────────

export function FinanceDealsOrdersView() {
	const { data, isLoading } = useQuery({
		queryKey: ['finance-inbox'],
		queryFn: () => getFinanceInbox({ data: {} }),
		staleTime: 30_000,
	})

	const inboxFilter = useFinanceStore((s) => s.inboxFilter)
	const setInboxFilter = useFinanceStore((s) => s.setInboxFilter)
	const selectedOrderId = useFinanceStore((s) => s.selectedOrderId)
	const setSelectedOrderId = useFinanceStore((s) => s.setSelectedOrderId)
	const selectedDealId = useFinanceStore((s) => s.selectedDealId)
	const setSelectedDealId = useFinanceStore((s) => s.setSelectedDealId)

	const { filteredOrders, filteredDeals } = useMemo(() => {
		if (!data) return { filteredOrders: [], filteredDeals: [] }
		const orders = data.customerOrders
			.filter((o) => o.paymentStatus === inboxFilter)
			.sort((a, b) => {
				if (inboxFilter === 'partial') {
					if (a.isDelivered !== b.isDelivered) return a.isDelivered ? -1 : 1
				}
				return a.acceptedHoursAgo - b.acceptedHoursAgo
			})
		const deals = data.supplierDeals
			.filter((d) => d.paymentStatus === inboxFilter)
			.sort((a, b) => a.createdHoursAgo - b.createdHoursAgo)
		return { filteredOrders: orders, filteredDeals: deals }
	}, [data, inboxFilter])

	if (isLoading || !data) {
		return (
			<div className="flex h-full items-center justify-center">
				<p
					className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-subtle)]"
					style={{ fontSize: '14px', letterSpacing: '-0.008em' }}
				>
					opening the ledger…
				</p>
			</div>
		)
	}

	const totalFiltered = filteredOrders.length + filteredDeals.length

	const receivable = filteredOrders.reduce((s, o) => s + o.totalDue, 0)
	const payable = filteredDeals.reduce((s, d) => s + d.totalDue, 0)
	const netBalance = receivable - payable

	return (
		<div className="relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[1040px] flex-col px-12 pt-10 pb-16">
				<LedgerMasthead
					totalOutstanding={data.totals.totalOutstanding}
					chaseCount={data.totals.deliveredPartialCount}
				/>

				<FilterStrip
					active={inboxFilter}
					onSelect={setInboxFilter}
					unpaid={data.totals.customerUnpaid + data.totals.supplierUnpaid}
					partial={data.totals.customerPartial + data.totals.supplierPartial}
					paid={data.totals.customerPaid + data.totals.supplierPaid}
					chase={data.totals.deliveredPartialCount}
				/>

				{totalFiltered === 0 ? (
					<LedgerEmpty filter={inboxFilter} />
				) : (
					<>
						<LedgerSection
							heading="Money in"
							dek="customer orders"
							count={filteredOrders.length}
							emptyCopy="no customer orders in this state."
						>
							{filteredOrders.map((order, idx) => (
								<OrderEntry
									key={order.quoteId}
									index={idx}
									order={order}
									onOpen={setSelectedOrderId}
								/>
							))}
							{filteredOrders.length > 0 && (
								<SectionTotal
									label={inboxFilter === 'paid' ? 'settled in' : 'receivable'}
									value={receivable}
									tone="in"
								/>
							)}
						</LedgerSection>

						<LedgerSection
							heading="Money out"
							dek="supplier deals"
							count={filteredDeals.length}
							emptyCopy="no supplier deals in this state."
						>
							{filteredDeals.map((deal, idx) => (
								<DealEntry
									key={deal.dealId}
									index={idx}
									deal={deal}
									onOpen={setSelectedDealId}
								/>
							))}
							{filteredDeals.length > 0 && (
								<SectionTotal
									label={inboxFilter === 'paid' ? 'settled out' : 'payable'}
									value={payable}
									tone="out"
								/>
							)}
						</LedgerSection>

						{filteredOrders.length > 0 && filteredDeals.length > 0 && (
							<NetBalance value={netBalance} filter={inboxFilter} />
						)}
					</>
				)}
			</div>

			<FinancePaymentPanel
				isOpen={selectedOrderId !== null || selectedDealId !== null}
				orderId={selectedOrderId}
				dealId={selectedDealId}
				onClose={() => {
					setSelectedOrderId(null)
					setSelectedDealId(null)
				}}
			/>
		</div>
	)
}

// ─── Masthead ────────────────────────────────────────────

function LedgerMasthead({
	totalOutstanding,
	chaseCount,
}: {
	totalOutstanding: number
	chaseCount: number
}) {
	const today = new Date()
	const date = today
		.toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
		})
		.toLowerCase()

	return (
		<header className="flex flex-col border-b border-[var(--color-border)] pb-10">
			<div className="flex items-baseline justify-between gap-4">
				<span
					className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
					style={{
						fontSize: '10.5px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.22em',
					}}
				>
					The Ledger · intake
				</span>
				<span
					className="font-[family-name:var(--font-bricolage)] italic"
					style={{
						fontSize: '11px',
						color: 'var(--color-text-subtle)',
					}}
					suppressHydrationWarning
				>
					{date}
				</span>
			</div>

			<div className="mt-8 flex flex-wrap items-end justify-between gap-6">
				<div className="flex flex-col">
					<span
						className="font-[family-name:var(--font-archivo-black)] tabular-nums leading-[0.92] text-[var(--color-text)]"
						style={{
							fontSize: 'clamp(68px, 9vw, 108px)',
							letterSpacing: '-0.045em',
							fontFeatureSettings: '"tnum" on, "lnum" on',
						}}
					>
						{formatEgp(totalOutstanding)}
					</span>
					<div className="mt-3 flex items-baseline gap-2">
						<span
							className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-muted)]"
							style={{ fontSize: '14px', letterSpacing: '-0.004em' }}
						>
							EGP outstanding across both books
						</span>
					</div>
				</div>

				{chaseCount > 0 && (
					<div
						className="flex flex-col items-end border-l-2 pl-5"
						style={{ borderColor: 'var(--ledger-chase)' }}
					>
						<span
							className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
							style={{
								fontSize: '9.5px',
								letterSpacing: '0.22em',
								color: 'var(--ledger-chase)',
							}}
						>
							chase
						</span>
						<span
							className="mt-1 font-[family-name:var(--font-archivo-black)] tabular-nums leading-none"
							style={{
								fontSize: '32px',
								letterSpacing: '-0.025em',
								color: 'var(--ledger-chase)',
							}}
						>
							{chaseCount}
						</span>
						<span
							className="mt-1 font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-muted)]"
							style={{ fontSize: '11px' }}
						>
							delivered · partial paid
						</span>
					</div>
				)}
			</div>
		</header>
	)
}

// ─── Filter strip ────────────────────────────────────────

function FilterStrip({
	active,
	onSelect,
	unpaid,
	partial,
	paid,
	chase,
}: {
	active: FinanceInboxFilter
	onSelect: (f: FinanceInboxFilter) => void
	unpaid: number
	partial: number
	paid: number
	chase: number
}) {
	const entries: {
		id: FinanceInboxFilter
		count: number
		attention: number
	}[] = [
		{ id: 'unpaid', count: unpaid, attention: unpaid },
		{ id: 'partial', count: partial, attention: chase },
		{ id: 'paid', count: paid, attention: 0 },
	]

	return (
		<div
			className="mt-6 flex items-center gap-8 border-b border-[var(--color-border)] pb-4"
			role="tablist"
			aria-label="Payment state"
		>
			{entries.map((entry) => {
				const isActive = entry.id === active
				return (
					<button
						key={entry.id}
						type="button"
						role="tab"
						aria-selected={isActive}
						onClick={() => onSelect(entry.id)}
						className="group inline-flex items-baseline gap-2 outline-none"
					>
						<span
							aria-hidden="true"
							className="h-[7px] w-[7px] rounded-full transition-colors"
							style={{
								background: isActive
									? 'var(--color-primary)'
									: entry.attention > 0
										? 'var(--ledger-chase)'
										: 'var(--color-text-subtle)',
								opacity: isActive ? 1 : 0.4,
							}}
						/>
						<span
							className="font-[family-name:var(--font-bricolage)] transition-colors"
							style={{
								fontSize: '14px',
								fontWeight: isActive ? 600 : 400,
								fontStyle: isActive ? 'normal' : 'italic',
								letterSpacing: '-0.008em',
								color: isActive
									? 'var(--color-text)'
									: 'var(--color-text-muted)',
							}}
						>
							{FILTER_COPY[entry.id]}
						</span>
						<span
							className="font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
							style={{
								fontSize: '11px',
								color: isActive
									? 'var(--color-primary)'
									: 'var(--color-text-subtle)',
								letterSpacing: '0.04em',
							}}
						>
							{entry.count.toString().padStart(2, '0')}
						</span>
					</button>
				)
			})}
		</div>
	)
}

// ─── Section ─────────────────────────────────────────────

function LedgerSection({
	heading,
	dek,
	count,
	emptyCopy,
	children,
}: {
	heading: string
	dek: string
	count: number
	emptyCopy: string
	children: React.ReactNode
}) {
	return (
		<section className="mt-10">
			<div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-2">
				<div className="flex items-baseline gap-2">
					<h3
						className="font-[family-name:var(--font-bricolage)] text-[var(--color-text)]"
						style={{
							fontSize: '17px',
							fontWeight: 600,
							letterSpacing: '-0.012em',
						}}
					>
						{heading}
					</h3>
					<span
						className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-muted)]"
						style={{ fontSize: '12px' }}
					>
						· {dek}
					</span>
				</div>
				<span
					className="font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
					style={{
						fontSize: '11px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.06em',
					}}
				>
					{count.toString().padStart(2, '0')}
				</span>
			</div>

			{count === 0 ? (
				<p
					className="py-6 font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-subtle)]"
					style={{ fontSize: '12.5px' }}
				>
					{emptyCopy}
				</p>
			) : (
				<ul className="flex flex-col">{children}</ul>
			)}
		</section>
	)
}

function SectionTotal({
	label,
	value,
	tone,
}: {
	label: string
	value: number
	tone: 'in' | 'out'
}) {
	return (
		<li className="mt-1 flex items-baseline justify-end gap-3 pt-3">
			<span
				className="font-[family-name:var(--font-bricolage)] italic"
				style={{
					fontSize: '11.5px',
					color: 'var(--color-text-muted)',
					letterSpacing: '0.002em',
				}}
			>
				{label}
			</span>
			<span aria-hidden="true" className="h-px w-16 bg-[var(--color-border)]" />
			<span
				className="ledger-double-rule pb-1 font-[family-name:var(--font-jetbrains-mono)] font-semibold tabular-nums"
				style={{
					fontSize: '20px',
					color: tone === 'in' ? 'var(--ledger-in)' : 'var(--ledger-out)',
					letterSpacing: '-0.02em',
				}}
			>
				{formatEgp(value)}
			</span>
			<span
				className="font-[family-name:var(--font-jetbrains-mono)] uppercase"
				style={{
					fontSize: '10px',
					color: 'var(--color-text-subtle)',
					letterSpacing: '0.14em',
				}}
			>
				EGP
			</span>
		</li>
	)
}

// ─── Net balance ─────────────────────────────────────────

function NetBalance({
	value,
	filter,
}: {
	value: number
	filter: FinanceInboxFilter
}) {
	const noun =
		filter === 'paid'
			? 'net settled'
			: value >= 0
				? 'net receivable'
				: 'net payable'
	const displayValue = Math.abs(value)

	return (
		<section className="mt-14 flex flex-col items-end">
			<div
				aria-hidden="true"
				className="mb-4 h-[2px] w-48"
				style={{
					background: `linear-gradient(to right, transparent, var(--color-border))`,
				}}
			/>
			<div className="flex items-baseline gap-3">
				<span
					className="font-[family-name:var(--font-bricolage)] italic"
					style={{
						fontSize: '13px',
						color: 'var(--color-text-muted)',
						letterSpacing: '0.002em',
					}}
				>
					{noun}
				</span>
				<span
					className="font-[family-name:var(--font-archivo-black)] tabular-nums leading-none"
					style={{
						fontSize: '34px',
						color:
							filter === 'paid'
								? 'var(--color-text)'
								: value >= 0
									? 'var(--ledger-in)'
									: 'var(--ledger-out)',
						letterSpacing: '-0.028em',
					}}
				>
					{formatEgp(displayValue)}
				</span>
				<span
					className="font-[family-name:var(--font-jetbrains-mono)] uppercase"
					style={{
						fontSize: '11px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.14em',
					}}
				>
					EGP
				</span>
			</div>
		</section>
	)
}

// ─── Entries ─────────────────────────────────────────────

function LedgerEntry({
	index,
	counterparty,
	reference,
	context,
	ageLabel,
	amount,
	paymentLabel,
	paymentTone,
	actionLabel,
	onPress,
}: {
	index: number
	counterparty: string
	reference: string
	context: string
	ageLabel: string
	amount: number
	paymentLabel: string
	paymentTone: 'neutral' | 'chase' | 'in' | 'out'
	actionLabel: string
	onPress: () => void
}) {
	const toneColor = {
		neutral: 'var(--color-text)',
		chase: 'var(--ledger-chase)',
		in: 'var(--ledger-in)',
		out: 'var(--ledger-out)',
	}[paymentTone]

	return (
		<li>
			<button
				type="button"
				onClick={onPress}
				className="ledger-row group/row grid w-full items-baseline py-4 ps-4 text-start outline-none"
				style={{
					gridTemplateColumns: '32px minmax(0,1.4fr) minmax(0,1fr) auto 80px',
					columnGap: '20px',
				}}
			>
				<span
					className="font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
					style={{
						fontSize: '10.5px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.06em',
					}}
				>
					{toRoman(index + 1).padStart(3, ' ')}
				</span>

				<div className="min-w-0">
					<p
						className="truncate font-[family-name:var(--font-bricolage)]"
						style={{
							fontSize: '15px',
							fontWeight: 500,
							color: 'var(--color-text)',
							letterSpacing: '-0.01em',
						}}
					>
						{counterparty}
					</p>
					<p
						className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0"
						style={{
							fontSize: '10.5px',
							color: 'var(--color-text-subtle)',
						}}
					>
						<span
							className="font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
							style={{ letterSpacing: '0.04em' }}
						>
							{reference}
						</span>
						<span aria-hidden="true" className="opacity-60">
							·
						</span>
						<span className="font-[family-name:var(--font-bricolage)] italic">
							{context}
						</span>
						<span aria-hidden="true" className="opacity-60">
							·
						</span>
						<span
							className="font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
							style={{ letterSpacing: '0.04em' }}
						>
							{ageLabel}
						</span>
					</p>
				</div>

				<div className="flex flex-col items-start">
					<span
						className="font-[family-name:var(--font-bricolage)] italic transition-colors"
						style={{
							fontSize: '12px',
							color: toneColor,
							letterSpacing: '-0.002em',
						}}
					>
						{paymentLabel}
					</span>
				</div>

				<div className="flex items-baseline gap-1.5">
					<span
						className="font-[family-name:var(--font-jetbrains-mono)] font-semibold tabular-nums"
						style={{
							fontSize: '18px',
							color: 'var(--color-text)',
							letterSpacing: '-0.018em',
						}}
					>
						{formatEgp(amount)}
					</span>
					<span
						className="font-[family-name:var(--font-jetbrains-mono)] uppercase"
						style={{
							fontSize: '9.5px',
							color: 'var(--color-text-subtle)',
							letterSpacing: '0.14em',
						}}
					>
						EGP
					</span>
				</div>

				<div className="flex items-baseline justify-end gap-1.5 pe-4">
					<span
						className="font-[family-name:var(--font-bricolage)] italic transition-colors"
						style={{
							fontSize: '12.5px',
							color: 'var(--color-text-muted)',
							letterSpacing: '-0.005em',
						}}
					>
						{actionLabel}
					</span>
					<span
						aria-hidden="true"
						className="transition-transform group-hover/row:translate-x-[3px]"
						style={{
							fontFamily: 'var(--font-bricolage)',
							fontStyle: 'italic',
							fontSize: '13px',
							color: 'var(--color-primary)',
						}}
					>
						→
					</span>
				</div>
			</button>
		</li>
	)
}

function OrderEntry({
	index,
	order,
	onOpen,
}: {
	index: number
	order: FinanceOrderView
	onOpen: (id: string) => void
}) {
	const urgent = order.paymentStatus === 'partial' && order.isDelivered
	const paymentLabel =
		order.paymentStatus === 'paid'
			? 'settled'
			: order.paymentStatus === 'partial'
				? urgent
					? 'delivered · chase'
					: `${formatEgp(order.remainingDue)} EGP remaining`
				: '50% due now · book and release'
	const paymentTone: 'neutral' | 'chase' | 'in' = urgent
		? 'chase'
		: order.paymentStatus === 'paid'
			? 'in'
			: 'neutral'

	const reference = order.customerPoNumber
		? `${order.quoteNumber} · ${order.customerPoNumber}`
		: order.quoteNumber

	return (
		<LedgerEntry
			index={index}
			counterparty={order.customerName}
			reference={reference}
			context={order.deliveryCity || 'no city'}
			ageLabel={`accepted ${formatHoursAgo(order.acceptedHoursAgo)}`}
			amount={order.totalDue}
			paymentLabel={paymentLabel}
			paymentTone={paymentTone}
			actionLabel={order.paymentStatus === 'paid' ? 'open' : 'record'}
			onPress={() => onOpen(order.quoteId)}
		/>
	)
}

function DealEntry({
	index,
	deal,
	onOpen,
}: {
	index: number
	deal: FinanceDealView
	onOpen: (id: string) => void
}) {
	const paymentLabel =
		deal.paymentStatus === 'paid'
			? 'settled'
			: deal.paymentStatus === 'partial'
				? `${formatEgp(deal.remainingDue)} EGP remaining`
				: '50% due now · release the deal'
	const paymentTone: 'neutral' | 'out' =
		deal.paymentStatus === 'paid' ? 'out' : 'neutral'

	const context =
		deal.itemCount === 1
			? deal.headlineProductName
			: `${deal.headlineProductName} + ${deal.itemCount - 1} more`

	return (
		<LedgerEntry
			index={index}
			counterparty={deal.supplierName}
			reference={deal.dealId}
			context={context}
			ageLabel={`called ${formatHoursAgo(deal.createdHoursAgo)}`}
			amount={deal.totalDue}
			paymentLabel={paymentLabel}
			paymentTone={paymentTone}
			actionLabel={deal.paymentStatus === 'paid' ? 'open' : 'record'}
			onPress={() => onOpen(deal.dealId)}
		/>
	)
}

// ─── Empty ──────────────────────────────────────────────

function LedgerEmpty({ filter }: { filter: FinanceInboxFilter }) {
	const copy =
		filter === 'unpaid'
			? 'the unpaid column is empty. accepted quotes and fresh deals land here first.'
			: filter === 'partial'
				? 'no entries in the partial column. fifty-percent collections show up here until they settle.'
				: 'the settled column is empty. completed payments accumulate here.'

	return (
		<div className="mt-16 flex flex-col items-center gap-2 border-y border-dashed border-[var(--color-border)] py-14">
			<span
				className="font-[family-name:var(--font-bricolage)] italic text-[var(--color-text)]"
				style={{ fontSize: '20px', letterSpacing: '-0.012em' }}
			>
				nothing on this page.
			</span>
			<span
				className="max-w-[420px] text-center font-[family-name:var(--font-bricolage)] italic text-[var(--color-text-subtle)]"
				style={{ fontSize: '12.5px', lineHeight: 1.5 }}
			>
				{copy}
			</span>
		</div>
	)
}
