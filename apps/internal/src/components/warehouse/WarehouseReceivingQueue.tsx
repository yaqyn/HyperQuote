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
		<div className="flex h-full w-full flex-col overflow-hidden">
			<motion.header
				initial={reduce ? false : { opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
				className="shrink-0 border-b-[3px] border-[#0A0A0A] px-8 pt-8 pb-5"
			>
				<div className="flex items-start justify-between gap-8">
					<div>
						<p className="font-[family-name:var(--font-geist-mono)] text-[11px] font-bold uppercase tracking-[0.32em] text-black/60">
							Dock · Bay 01
						</p>
						<h1 className="mt-2 font-[family-name:var(--font-geist-mono)] text-[44px] font-bold uppercase leading-[0.9] tracking-[-0.02em]">
							Receiving
							<br />
							queue
						</h1>
					</div>
					<div className="grid grid-cols-3 gap-6 text-end">
						<StatBlock label="Open" value={data.totals.total} />
						<StatBlock label="Retry" value={data.totals.retrying} accent />
						<StatBlock label="Fresh" value={data.totals.fresh} />
					</div>
				</div>
				<WarehouseTabSwitch />
			</motion.header>

			<div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
				{data.deals.length === 0 ? (
					<EmptyState />
				) : (
					<motion.div
						className="flex flex-col gap-4"
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
		<div className="flex flex-col items-end">
			<span
				className={`font-[family-name:var(--font-geist-mono)] text-[44px] font-bold leading-none tabular-nums ${
					accent ? 'text-[#CC3300]' : 'text-[#0A0A0A]'
				}`}
			>
				{String(value).padStart(2, '0')}
			</span>
			<span className="mt-1 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em] text-black/50">
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
	const stageColor = isRetry ? '#CC3300' : '#0A0A0A'
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
			className={`group relative w-full border-[3px] bg-white text-start ${
				isSelected
					? 'border-[#0A0A0A] shadow-[8px_8px_0_0_#0A0A0A]'
					: 'border-[#0A0A0A]/20 hover:border-[#0A0A0A]/60 hover:shadow-[4px_4px_0_0_#0A0A0A]'
			}`}
			style={{ minHeight: '128px' }}
		>
			<div className="flex items-center justify-between">
				<span
					className="inline-flex h-9 items-center px-3 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em]"
					style={{
						backgroundColor: stageColor,
						color: isRetry ? '#F4F4EC' : '#F4F4EC',
					}}
				>
					{stageLabel}
				</span>
				<span className="inline-flex h-9 items-center px-3 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
					{deal.paymentStatus.toUpperCase()}
				</span>
			</div>

			<div className="px-6 pb-5 pt-3">
				<div className="grid grid-cols-[1fr,auto] gap-x-8 gap-y-3 items-end">
					<div className="min-w-0">
						<p className="truncate text-[22px] font-bold leading-tight text-[#0A0A0A]">
							{deal.supplierName}
						</p>
						<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/55">
							{deal.dealId} ·{' '}
							{deal.itemCount === 1
								? deal.headlineProductName
								: `${deal.headlineProductName} +${deal.itemCount - 1}`}
						</p>
					</div>

					<div className="text-end">
						<div className="flex items-baseline gap-1 justify-end">
							<span className="font-[family-name:var(--font-geist-mono)] text-[26px] font-bold leading-none tabular-nums">
								{deal.receivedCount}
							</span>
							<span className="font-[family-name:var(--font-geist-mono)] text-[16px] font-bold text-black/35">
								/{deal.itemCount}
							</span>
						</div>
						<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.2em] text-black/50">
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

				<div className="mt-2 flex items-center justify-between font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-black/50">
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
