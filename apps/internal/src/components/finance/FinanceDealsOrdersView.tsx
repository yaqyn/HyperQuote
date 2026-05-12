import { useQuery } from '@tanstack/react-query'
import {
	AlertTriangle,
	BookOpen,
	CheckCircle2,
	CircleDollarSign,
	ReceiptText,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
	type FinanceDealView,
	type FinanceOrderView,
	getFinanceInbox,
} from '../../lib/server/finance'
import { type FinanceInboxFilter, useFinanceStore } from '../../stores/finance'
import {
	EmployeeActionButton,
	EmployeeFilterChip,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
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
	unpaid: 'Need payment',
	partial: 'Balance due',
	paid: 'Settled',
}

// ─── View ────────────────────────────────────────────────

export function FinanceDealsOrdersView() {
	const { data, isError, isLoading } = useQuery({
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

	if (isError) {
		return (
			<FinanceStateMessage
				title="Ledger did not open"
				copy="Refresh and try again. No payment record was changed."
			/>
		)
	}

	if (isLoading || !data) {
		return (
			<FinanceStateMessage
				title="Opening ledger"
				copy="Loading customer receipts and supplier payments."
			/>
		)
	}

	const totalFiltered = filteredOrders.length + filteredDeals.length

	const receivable = filteredOrders.reduce((s, o) => s + o.totalDue, 0)
	const payable = filteredDeals.reduce((s, d) => s + d.totalDue, 0)
	const netBalance = receivable - payable

	return (
		<div className="relative h-full overflow-y-auto">
			<div className="mx-auto flex max-w-[1040px] flex-col px-4 pt-6 pb-16 sm:px-6 lg:px-12 lg:pt-10">
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

function FinanceStateMessage({ title, copy }: { title: string; copy: string }) {
	return (
		<div className="flex h-full items-center justify-center px-5">
			<div className="max-w-[360px] text-center">
				<p
					className="font-[family-name:var(--font-bricolage)] font-semibold text-[var(--color-text)]"
					style={{ fontSize: '16px' }}
				>
					{title}
				</p>
				<p
					className="mt-1 font-[family-name:var(--font-bricolage)] text-[var(--color-text-subtle)]"
					style={{ fontSize: '12.5px', lineHeight: 1.5 }}
				>
					{copy}
				</p>
			</div>
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
		<header className="flex flex-col border-b border-[var(--color-border)] pb-7 sm:pb-10">
			<div className="flex flex-col items-start gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
				<span
					className="font-[family-name:var(--font-jetbrains-mono)] font-semibold uppercase"
					style={{
						fontSize: '10.5px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.22em',
					}}
				>
					Finance · live ledger
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

			<div className="mt-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex min-w-0 flex-col">
					<span
						className="font-[family-name:var(--font-bricolage)] font-semibold text-[var(--color-text)]"
						style={{ fontSize: '16px' }}
					>
						Total waiting for finance
					</span>
					<span
						className="mt-2 max-w-full break-words font-[family-name:var(--font-archivo-black)] text-[42px] leading-none text-[var(--color-text)] tabular-nums sm:text-[68px] lg:text-[96px]"
						style={{
							fontFeatureSettings: '"tnum" on, "lnum" on',
						}}
					>
						{formatEgp(totalOutstanding)}
					</span>
					<div className="mt-2 flex items-baseline gap-2">
						<span
							className="font-[family-name:var(--font-bricolage)] text-[var(--color-text-muted)]"
							style={{ fontSize: '13px' }}
						>
							EGP across customer receipts and supplier payments
						</span>
					</div>
				</div>

				{chaseCount > 0 && (
					<EmployeeStatusPill
						tone="warning"
						leading={<AlertTriangle aria-hidden="true" size={15} />}
						className="lg:max-w-[260px]"
					>
						{chaseCount} delivered order{chaseCount === 1 ? '' : 's'} still need
						balance collection
					</EmployeeStatusPill>
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
		tone: 'primary' | 'warning' | 'success'
	}[] = [
		{ id: 'unpaid', count: unpaid, tone: 'primary' },
		{
			id: 'partial',
			count: partial,
			tone: chase > 0 ? 'warning' : 'primary',
		},
		{ id: 'paid', count: paid, tone: 'success' },
	]

	return (
		<fieldset className="mt-5 flex min-w-0 flex-col gap-3 border-b border-[var(--color-border)] pb-4">
			<legend className="sr-only">Payment state</legend>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
				{entries.map((entry) => (
					<EmployeeFilterChip
						key={entry.id}
						active={entry.id === active}
						count={entry.count}
						tone={entry.tone}
						onClick={() => onSelect(entry.id)}
						className="w-full justify-between"
					>
						{FILTER_COPY[entry.id]}
					</EmployeeFilterChip>
				))}
			</div>
			{chase > 0 && active === 'partial' && (
				<EmployeeStatusPill
					tone="warning"
					leading={<AlertTriangle aria-hidden="true" size={14} />}
				>
					{chase} delivered balance{chase === 1 ? '' : 's'} should be collected
					first
				</EmployeeStatusPill>
			)}
		</fieldset>
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
	children: ReactNode
}) {
	return (
		<section className="mt-10">
			<div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-[var(--color-border)] pb-2">
				<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
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
		<li className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-3 sm:justify-end">
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
		<section className="mt-14 flex flex-col items-start sm:items-end">
			<div
				aria-hidden="true"
				className="mb-4 h-[2px] w-48"
				style={{
					background: `linear-gradient(to right, transparent, var(--color-border))`,
				}}
			/>
			<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
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
	actionTone,
	actionKind,
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
	actionTone: 'primary' | 'neutral'
	actionKind: 'record' | 'open'
	onPress: () => void
}) {
	const statusTone: 'success' | 'warning' = {
		neutral: 'warning',
		chase: 'warning',
		in: 'success',
		out: 'success',
	}[paymentTone]
	const ActionIcon = actionKind === 'record' ? ReceiptText : BookOpen

	return (
		<li className="border-t border-[var(--color-border)] first:border-t-0">
			<div className="ledger-row grid gap-3 rounded-md px-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start lg:grid-cols-[32px_minmax(0,1.35fr)_minmax(0,1fr)_auto_152px] lg:items-center lg:gap-x-5">
				<span
					className="hidden font-[family-name:var(--font-jetbrains-mono)] tabular-nums lg:block"
					style={{
						fontSize: '10.5px',
						color: 'var(--color-text-subtle)',
						letterSpacing: '0.06em',
					}}
				>
					{toRoman(index + 1).padStart(3, ' ')}
				</span>

				<div className="min-w-0">
					<div className="flex items-start gap-2 lg:block">
						<span
							className="mt-1 shrink-0 font-[family-name:var(--font-jetbrains-mono)] tabular-nums lg:hidden"
							style={{
								fontSize: '10.5px',
								color: 'var(--color-text-subtle)',
								letterSpacing: '0.06em',
							}}
						>
							{toRoman(index + 1).padStart(3, ' ')}
						</span>
						<p
							className="break-words font-[family-name:var(--font-bricolage)]"
							style={{
								fontSize: '15px',
								fontWeight: 600,
								color: 'var(--color-text)',
							}}
						>
							{counterparty}
						</p>
					</div>
					<p
						className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
						style={{
							fontSize: '10.5px',
							color: 'var(--color-text-subtle)',
						}}
					>
						<span
							className="break-all font-[family-name:var(--font-jetbrains-mono)] tabular-nums"
							style={{ letterSpacing: '0.04em' }}
						>
							{reference}
						</span>
						<span aria-hidden="true" className="opacity-60">
							·
						</span>
						<span className="break-words font-[family-name:var(--font-bricolage)] italic">
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

				<EmployeeStatusPill
					tone={statusTone}
					leading={
						paymentTone === 'in' || paymentTone === 'out' ? (
							<CheckCircle2 aria-hidden="true" size={14} />
						) : (
							<CircleDollarSign aria-hidden="true" size={14} />
						)
					}
					className="w-full sm:col-span-2 sm:w-auto lg:col-span-1"
				>
					<span className="font-[family-name:var(--font-bricolage)]">
						{paymentLabel}
					</span>
				</EmployeeStatusPill>

				<div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 sm:justify-end lg:justify-start">
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

				<EmployeeActionButton
					tone={actionTone}
					size="sm"
					leading={<ActionIcon aria-hidden="true" size={14} />}
					fullWidthOnMobile
					onClick={onPress}
					className="sm:col-span-2 lg:col-span-1 lg:w-full"
				>
					{actionLabel}
				</EmployeeActionButton>
			</div>
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
			? 'Paid in full'
			: order.paymentStatus === 'partial'
				? urgent
					? `Collect ${formatEgp(order.remainingDue)} EGP balance`
					: `${formatEgp(order.remainingDue)} EGP balance due`
				: 'Collect 50% to release order'
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
			actionLabel={
				order.paymentStatus === 'paid' ? 'Open record' : 'Record receipt'
			}
			actionTone={order.paymentStatus === 'paid' ? 'neutral' : 'primary'}
			actionKind={order.paymentStatus === 'paid' ? 'open' : 'record'}
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
			? 'Paid in full'
			: deal.paymentStatus === 'partial'
				? `${formatEgp(deal.remainingDue)} EGP supplier balance`
				: 'Pay 50% to release deal'
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
			actionLabel={
				deal.paymentStatus === 'paid' ? 'Open record' : 'Record payment'
			}
			actionTone={deal.paymentStatus === 'paid' ? 'neutral' : 'primary'}
			actionKind={deal.paymentStatus === 'paid' ? 'open' : 'record'}
			onPress={() => onOpen(deal.dealId)}
		/>
	)
}

// ─── Empty ──────────────────────────────────────────────

function LedgerEmpty({ filter }: { filter: FinanceInboxFilter }) {
	const copy =
		filter === 'unpaid'
			? 'New accepted quotes and supplier deals will appear here when payment is needed.'
			: filter === 'partial'
				? 'Partial payments stay here until the remaining balance is recorded.'
				: 'Settled customer receipts and supplier payments will collect here.'

	return (
		<div className="mt-16 flex flex-col items-center gap-2 border-y border-dashed border-[var(--color-border)] py-14">
			<span
				className="font-[family-name:var(--font-bricolage)] font-semibold text-[var(--color-text)]"
				style={{ fontSize: '20px' }}
			>
				No records here
			</span>
			<span
				className="max-w-[420px] text-center font-[family-name:var(--font-bricolage)] text-[var(--color-text-subtle)]"
				style={{ fontSize: '12.5px', lineHeight: 1.5 }}
			>
				{copy}
			</span>
		</div>
	)
}
