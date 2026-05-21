import { useQuery } from '@tanstack/react-query'
import {
	AlertTriangle,
	BookOpen,
	CheckCircle2,
	CircleDollarSign,
	ReceiptText,
} from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { useMemo, useRef, useState } from 'react'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../lib/internal-live-query'
import {
	type FinanceDealView,
	type FinanceOrderView,
	getFinanceInbox,
} from '../../lib/server/finance'
import { useFinanceStore } from '../../stores/finance'
import {
	EmployeeActionButton,
	EmployeeFilterChip,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'
import { formatDecimalEgp, formatRelativeHoursAgo } from '../shared/formatters'
import { FinancePaymentPanel } from './FinancePaymentPanel'

// ─── Helpers ──────────────────────────────────────────────

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

type FinanceDirection = 'all' | 'in' | 'out'
type LedgerPaymentTone = 'neutral' | 'chase' | 'in' | 'out'
const LEDGER_STATUS_TONE: Record<LedgerPaymentTone, 'success' | 'warning'> = {
	neutral: 'warning',
	chase: 'warning',
	in: 'success',
	out: 'success',
}

// ─── View ────────────────────────────────────────────────

export function FinanceDealsOrdersView() {
	const { data, isError, isLoading } = useQuery({
		queryKey: ['finance-inbox'],
		queryFn: () => getFinanceInbox({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	const [ledgerDirection, setLedgerDirection] =
		useState<FinanceDirection>('all')
	const ledgerInSectionRef = useRef<HTMLElement | null>(null)
	const ledgerOutSectionRef = useRef<HTMLElement | null>(null)
	const selectedOrderId = useFinanceStore((s) => s.selectedOrderId)
	const setSelectedOrderId = useFinanceStore((s) => s.setSelectedOrderId)
	const selectedDealId = useFinanceStore((s) => s.selectedDealId)
	const setSelectedDealId = useFinanceStore((s) => s.setSelectedDealId)

	const { liveOrders, liveDeals } = useMemo(() => {
		if (!data) {
			return {
				liveOrders: [],
				liveDeals: [],
			}
		}
		const unsettledOrders = data.customerOrders
			.filter((o) => o.paymentStatus !== 'paid')
			.sort((a, b) => {
				const aWeight = a.paymentStatus === 'partial' ? 0 : 1
				const bWeight = b.paymentStatus === 'partial' ? 0 : 1
				if (aWeight !== bWeight) return aWeight - bWeight
				if (a.paymentStatus === 'partial' && b.paymentStatus === 'partial') {
					if (a.isDelivered !== b.isDelivered) return a.isDelivered ? -1 : 1
				}
				return a.acceptedHoursAgo - b.acceptedHoursAgo
			})
		const unsettledDeals = data.supplierDeals
			.filter((d) => d.paymentStatus !== 'paid')
			.sort((a, b) => {
				const aWeight = a.paymentStatus === 'partial' ? 0 : 1
				const bWeight = b.paymentStatus === 'partial' ? 0 : 1
				if (aWeight !== bWeight) return aWeight - bWeight
				return a.createdHoursAgo - b.createdHoursAgo
			})
		return {
			liveOrders: unsettledOrders,
			liveDeals: unsettledDeals,
		}
	}, [data])

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

	const ledgerTotal =
		ledgerDirection === 'all'
			? liveOrders.length + liveDeals.length
			: ledgerDirection === 'in'
				? liveOrders.length
				: liveDeals.length

	const liveReceivable = liveOrders.reduce((s, o) => s + o.totalDue, 0)
	const livePayable = liveDeals.reduce((s, d) => s + d.totalDue, 0)
	const handleDirectionSelect = (direction: FinanceDirection) => {
		setLedgerDirection(direction)
		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				const target =
					direction === 'out'
						? ledgerOutSectionRef.current
						: direction === 'in'
							? ledgerInSectionRef.current
							: (ledgerInSectionRef.current ?? ledgerOutSectionRef.current)
				const behavior = window.matchMedia('(prefers-reduced-motion: reduce)')
					.matches
					? 'auto'
					: 'smooth'
				target?.scrollIntoView({ behavior, block: 'start' })
			})
		})
	}

	return (
		<div className="relative">
			<div className="mx-auto flex max-w-[1040px] flex-col px-4 pt-6 pb-16 sm:px-6 lg:px-12 lg:pt-10">
				<LedgerMasthead
					totalOutstanding={data.totals.totalOutstanding}
					chaseCount={data.totals.deliveredPartialCount}
				/>

				<DirectionStrip
					active={ledgerDirection}
					onSelect={handleDirectionSelect}
					inCount={liveOrders.length}
					outCount={liveDeals.length}
				/>

				{ledgerTotal === 0 ? (
					<DirectionEmpty direction={ledgerDirection} />
				) : (
					<>
						{(ledgerDirection === 'all' || ledgerDirection === 'in') &&
							liveOrders.length > 0 && (
								<LedgerSection
									sectionRef={ledgerInSectionRef}
									heading="Money in"
									dek="customer orders"
									count={liveOrders.length}
									emptyCopy="no customer receipts waiting."
								>
									{liveOrders.map((order, idx) => (
										<OrderEntry
											key={order.quoteId}
											index={idx}
											order={order}
											onOpen={setSelectedOrderId}
										/>
									))}
									<SectionTotal
										label="receivable"
										value={liveReceivable}
										tone="in"
									/>
								</LedgerSection>
							)}
						{(ledgerDirection === 'all' || ledgerDirection === 'out') &&
							liveDeals.length > 0 && (
								<LedgerSection
									sectionRef={ledgerOutSectionRef}
									heading="Money out"
									dek="supplier deals"
									count={liveDeals.length}
									emptyCopy="no supplier payments waiting."
								>
									{liveDeals.map((deal, idx) => (
										<DealEntry
											key={deal.dealId}
											index={idx}
											deal={deal}
											onOpen={setSelectedDealId}
										/>
									))}
									<SectionTotal
										label="payable"
										value={livePayable}
										tone="out"
									/>
								</LedgerSection>
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
	return (
		<header className="border-b border-[var(--color-border)] pb-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
					<span className="font-[family-name:var(--font-archivo)] text-[12px] font-semibold text-[var(--color-text-muted)]">
						Waiting for finance
					</span>
					<strong className="break-words font-[family-name:var(--font-geist-mono)] text-[26px] font-semibold leading-none text-[var(--color-text)] tabular-nums sm:text-[34px]">
						{formatDecimalEgp(totalOutstanding)}
					</strong>
					<span className="font-[family-name:var(--font-geist-mono)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
						EGP
					</span>
				</div>
				{chaseCount > 0 && (
					<EmployeeStatusPill
						tone="warning"
						leading={<AlertTriangle aria-hidden="true" size={15} />}
						className="w-fit"
					>
						{chaseCount} delivered order{chaseCount === 1 ? '' : 's'} still need
						balance collection
					</EmployeeStatusPill>
				)}
			</div>
		</header>
	)
}

function DirectionStrip({
	active,
	onSelect,
	inCount,
	outCount,
}: {
	active: FinanceDirection
	onSelect: (direction: FinanceDirection) => void
	inCount: number
	outCount: number
}) {
	const entries: {
		id: FinanceDirection
		label: string
		count: number
	}[] = [
		{ id: 'all', label: 'All', count: inCount + outCount },
		{ id: 'in', label: 'In', count: inCount },
		{ id: 'out', label: 'Out', count: outCount },
	]

	return (
		<fieldset className="sticky top-0 z-10 -mx-4 mt-5 border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 pt-3 pb-4 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pt-0 lg:backdrop-blur-none">
			<legend className="sr-only">Ledger direction</legend>
			<div className="grid grid-cols-3 gap-2">
				{entries.map((entry) => {
					const isAllActive = entry.id === 'all' && active === 'all'
					return (
						<EmployeeFilterChip
							key={entry.id}
							active={entry.id === active}
							count={entry.count}
							tone={isAllActive ? 'primary' : 'neutral'}
							onClick={() => onSelect(entry.id)}
							className={`w-full justify-center ${
								isAllActive
									? 'bg-[var(--color-primary)]/[0.07] text-[var(--color-primary)]'
									: ''
							}`}
						>
							{entry.label}
						</EmployeeFilterChip>
					)
				})}
			</div>
		</fieldset>
	)
}

// ─── Section ─────────────────────────────────────────────

function LedgerSection({
	sectionRef,
	heading,
	dek,
	count,
	emptyCopy,
	children,
}: {
	sectionRef?: Ref<HTMLElement>
	heading: string
	dek: string
	count: number
	emptyCopy: string
	children: ReactNode
}) {
	return (
		<section ref={sectionRef} className="mt-10 scroll-mt-24">
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
				<ul className="-mx-4 flex flex-col sm:-mx-6 lg:mx-0">{children}</ul>
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
		<li className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pt-3 sm:justify-end sm:px-6 lg:px-0">
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
				{formatDecimalEgp(value)}
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

// ─── Entries ─────────────────────────────────────────────

function followUpContext(
	followUp:
		| FinanceOrderView['latestFollowUp']
		| FinanceDealView['latestFollowUp'],
): string | undefined {
	if (!followUp) return undefined
	const due = new Date(followUp.followUpDueAt).toLocaleDateString('en-EG')
	return `${followUp.followUpState} follow-up due ${due}`
}

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
	context?: string
	ageLabel: string
	amount: number
	paymentLabel: string
	paymentTone: LedgerPaymentTone
	actionLabel: string
	actionTone: 'primary' | 'neutral'
	actionKind: 'record' | 'open'
	onPress: () => void
}) {
	const statusTone = LEDGER_STATUS_TONE[paymentTone]
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
						{context && (
							<>
								<span aria-hidden="true" className="opacity-60">
									-
								</span>
								<span className="break-words font-[family-name:var(--font-bricolage)] italic">
									{context}
								</span>
							</>
						)}
						<span aria-hidden="true" className="opacity-60">
							-
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
						{formatDecimalEgp(amount)}
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
					? `Collect ${formatDecimalEgp(order.remainingDue)} EGP balance`
					: `${formatDecimalEgp(order.remainingDue)} EGP balance due`
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
			context={followUpContext(order.latestFollowUp)}
			ageLabel={`accepted ${formatRelativeHoursAgo(order.acceptedHoursAgo)}`}
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
				? `${formatDecimalEgp(deal.remainingDue)} EGP supplier balance`
				: 'Payment needed'
	const paymentTone: 'neutral' | 'out' =
		deal.paymentStatus === 'paid' ? 'out' : 'neutral'

	const productContext =
		deal.itemCount === 1
			? deal.headlineProductName
			: `${deal.headlineProductName} + ${deal.itemCount - 1} more`
	const followUp = followUpContext(deal.latestFollowUp)
	const context = followUp ? `${productContext} · ${followUp}` : productContext

	return (
		<LedgerEntry
			index={index}
			counterparty={deal.supplierName}
			reference={deal.dealId}
			context={context}
			ageLabel={`called ${formatRelativeHoursAgo(deal.createdHoursAgo)}`}
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

function DirectionEmpty({ direction }: { direction: FinanceDirection }) {
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
				{direction === 'in'
					? 'Customer receipts waiting for finance will appear here.'
					: direction === 'out'
						? 'Supplier payments waiting for finance will appear here.'
						: 'Customer receipts and supplier payments waiting for finance will appear here.'}
			</span>
		</div>
	)
}
