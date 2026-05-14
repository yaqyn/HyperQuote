import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'
import {
	getReceivingQueue,
	type ReceivingDealRowView,
} from '../../lib/server/warehouse'
import { useWarehouseStore } from '../../stores/warehouse'
import { WarehouseTabSwitch } from './WarehouseTabSwitch'

/**
 * Incoming supplier deals waiting for warehouse inspection. Mirrors
 * the outgoing Loading queue layout — same masthead, same card shape,
 * same tab switch — so the advisor's mental model doesn't flip.
 */
export function WarehouseReceivingQueue() {
	const reduce = useReducedMotion()
	const { data, isLoading } = useQuery({
		queryKey: ['warehouse-receiving-queue'],
		queryFn: () => getReceivingQueue({ data: {} }),
		staleTime: 10_000,
	})

	const selectedDealId = useWarehouseStore((s) => s.selectedDealId)
	const setSelectedDealId = useWarehouseStore((s) => s.setSelectedDealId)

	if (isLoading || !data) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.22em] text-black/40">
					Loading receiving queue…
				</p>
			</div>
		)
	}

	return (
		<div
			className={`h-full w-full flex-col overflow-hidden lg:flex ${
				selectedDealId ? 'hidden' : 'flex'
			}`}
		>
			<motion.header
				initial={reduce ? false : { opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
				className="shrink-0 border-b-2 border-[var(--color-text)] px-4 pt-4 pb-4 sm:px-6 lg:border-b-[3px] lg:px-8 lg:pt-8 lg:pb-5"
			>
				<div className="hidden flex-col items-start gap-3 lg:flex lg:flex-row lg:justify-between lg:gap-8">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.24em] text-black/60 lg:text-[11px] lg:tracking-[0.32em]">
							Dock · Bay 01
						</p>
						<h1 className="mt-1 truncate font-[family-name:var(--font-geist-mono)] text-[22px] font-bold uppercase leading-none tracking-[-0.01em] sm:text-[28px] lg:mt-2 lg:text-[44px] lg:leading-[0.9] lg:tracking-[-0.02em]">
							<span className="lg:block">Receiving</span>
							<span className="lg:hidden"> queue</span>
							<span className="hidden lg:block">queue</span>
						</h1>
					</div>
					<div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:flex lg:flex-wrap lg:gap-x-6 lg:gap-y-3 lg:text-end">
						<StatBlock label="Open" value={data.totals.total} />
						<StatBlock label="Retry" value={data.totals.retrying} accent />
						<StatBlock label="Fresh" value={data.totals.fresh} />
					</div>
				</div>
				<WarehouseTabSwitch />
			</motion.header>

			<div className="flex-1 min-h-0 overflow-y-auto px-0 py-0 lg:px-8 lg:py-6">
				{data.deals.length === 0 ? (
					<EmptyState />
				) : (
					<motion.div
						className="flex flex-col lg:gap-4"
						initial="hidden"
						animate="visible"
						variants={{
							hidden: {},
							visible: {
								transition: { staggerChildren: reduce ? 0 : 0.05 },
							},
						}}
					>
						{data.deals.map((deal) => (
							<DealCard
								key={deal.dealId}
								deal={deal}
								isSelected={deal.dealId === selectedDealId}
								onPress={() => setSelectedDealId(deal.dealId)}
								reduce={!!reduce}
							/>
						))}
					</motion.div>
				)}
			</div>
		</div>
	)
}

function StatBlock({
	label,
	value,
	accent,
}: {
	label: string
	value: number | string
	accent?: boolean
}) {
	return (
		<div className="min-w-0 border border-black/10 px-2 py-2 lg:border-0 lg:px-0 lg:py-0 lg:text-end">
			<span
				className={`font-[family-name:var(--font-geist-mono)] text-[21px] font-bold leading-none tabular-nums lg:text-[44px] ${
					accent ? 'text-[#CC3300]' : 'text-[var(--color-text)]'
				}`}
			>
				{String(value).padStart(2, '0')}
			</span>
			<span className="mt-1 block truncate font-[family-name:var(--font-geist-mono)] text-[8px] font-bold uppercase tracking-[0.14em] text-black/50 lg:text-[10px] lg:tracking-[0.22em]">
				{label}
			</span>
		</div>
	)
}

function EmptyState() {
	return (
		<div className="flex h-full min-h-[280px] flex-col items-center justify-center border-[3px] border-dashed border-black/15 p-10">
			<span
				aria-hidden="true"
				className="font-[family-name:var(--font-geist-mono)] text-[60px] font-bold leading-none text-black/20"
			>
				—
			</span>
			<p className="mt-4 font-[family-name:var(--font-geist-mono)] text-[13px] font-bold uppercase tracking-[0.2em] text-black/45">
				No incoming deliveries
			</p>
			<p className="mt-2 text-center text-[12px] leading-relaxed text-black/45 max-w-[320px]">
				Deals show up here once finance clears a partial payment. When a
				supplier truck arrives, tap the card to start inspecting.
			</p>
		</div>
	)
}

function DealCard({
	deal,
	isSelected,
	onPress,
	reduce,
}: {
	deal: ReceivingDealRowView
	isSelected: boolean
	onPress: () => void
	reduce: boolean
}) {
	const receivedPct =
		deal.itemCount > 0
			? Math.round((deal.receivedCount / deal.itemCount) * 100)
			: 0
	const isRetry = deal.previousAttemptCount > 0
	const stageColor = isRetry ? '#CC3300' : 'var(--color-text)'
	const stageLabel = isRetry
		? `Retry · attempt ${deal.previousAttemptCount + 1}`
		: 'Fresh arrival'

	return (
		<motion.button
			type="button"
			onClick={onPress}
			variants={{
				hidden: { opacity: 0, y: 12 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.32, ease: [0.2, 0.8, 0.2, 1] },
				},
			}}
			whileHover={reduce ? undefined : { y: -2 }}
			whileTap={reduce ? undefined : { scale: 0.995 }}
			transition={{ type: 'spring', stiffness: 420, damping: 32 }}
			className={`group relative w-full border-y-2 border-x-0 bg-[var(--color-surface)] text-start lg:border-[3px] ${
				isSelected
					? 'border-[var(--color-text)] lg:shadow-[8px_8px_0_0_var(--color-text)]'
					: 'border-[var(--color-text)]/15 lg:hover:border-[var(--color-text)]/60 lg:hover:shadow-[4px_4px_0_0_var(--color-text)]'
			}`}
			style={{ minHeight: '112px' }}
		>
			<div className="flex flex-wrap items-center justify-between gap-y-1">
				<span
					className="inline-flex h-8 items-center px-3 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.16em] lg:h-9 lg:text-[10px] lg:tracking-[0.22em]"
					style={{
						backgroundColor: stageColor,
						color: '#FFFFFF',
					}}
				>
					{stageLabel}
				</span>
				<span className="inline-flex h-8 items-center px-3 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 lg:h-9 lg:text-[10px] lg:tracking-[0.18em]">
					{deal.paymentStatus.toUpperCase()}
				</span>
			</div>

			<div className="px-4 pb-4 pt-3 sm:px-6 lg:pb-5">
				<div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 lg:gap-x-8">
					<div className="min-w-0">
						<p className="truncate text-[17px] font-bold leading-tight text-[var(--color-text)] lg:text-[22px]">
							{deal.supplierName}
						</p>
						<p className="mt-1 truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/55 lg:text-[11px]">
							{deal.dealId} ·{' '}
							{deal.itemCount === 1
								? deal.headlineProductName
								: `${deal.headlineProductName} +${deal.itemCount - 1}`}
						</p>
					</div>

					<div className="text-end">
						<div className="flex items-baseline justify-end gap-1">
							<span className="font-[family-name:var(--font-geist-mono)] text-[21px] font-bold leading-none tabular-nums lg:text-[26px]">
								{deal.receivedCount}
							</span>
							<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-bold text-black/35 lg:text-[16px]">
								/{deal.itemCount}
							</span>
						</div>
						<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[8px] font-bold uppercase tracking-[0.16em] text-black/50 lg:text-[9px] lg:tracking-[0.2em]">
							received
						</p>
					</div>
				</div>

				<div className="mt-4 flex items-center gap-3">
					<div className="relative h-[6px] flex-1 bg-black/10">
						<motion.div
							className="absolute start-0 top-0 h-full"
							initial={{ width: 0 }}
							animate={{ width: `${receivedPct}%` }}
							transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
							style={{ backgroundColor: '#0A5C2E' }}
						/>
					</div>
					<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold tabular-nums text-black/50 w-8 text-end">
						{receivedPct}%
					</span>
				</div>

				<div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-black/50">
					<span>
						{deal.pendingCount} pending
						{deal.previousAttemptCount > 0 &&
							` · ${deal.previousAttemptCount} prior attempt${deal.previousAttemptCount !== 1 ? 's' : ''}`}
					</span>
					<span className="font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums font-bold">
						{Math.round(deal.totalDue).toLocaleString('en-EG')} EGP
					</span>
				</div>
			</div>
		</motion.button>
	)
}
