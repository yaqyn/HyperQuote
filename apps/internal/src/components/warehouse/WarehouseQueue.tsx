import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'
import {
	getWarehouseQueue,
	type WarehouseOrderRowView,
	type WarehouseStage,
} from '../../lib/server/warehouse'
import { useWarehouseStore } from '../../stores/warehouse'
import { WarehouseTabSwitch } from './WarehouseTabSwitch'

/**
 * Queue of orders awaiting warehouse prep. Tablet-optimized cards — big
 * enough for gloved hands, dense enough to show 4-5 at a time without
 * scrolling. Cards stagger in on mount and lift when selected.
 */
export function WarehouseQueue() {
	const reduce = useReducedMotion()
	const { data, isLoading } = useQuery({
		queryKey: ['warehouse-queue'],
		queryFn: () => getWarehouseQueue({ data: {} }),
		staleTime: 10_000,
	})

	const selectedQuoteId = useWarehouseStore((s) => s.selectedQuoteId)
	const setSelectedQuoteId = useWarehouseStore((s) => s.setSelectedQuoteId)

	if (isLoading || !data) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<p className="font-[family-name:var(--font-geist-mono)] text-[12px] uppercase tracking-[0.22em] text-black/40">
					Loading dock queue…
				</p>
			</div>
		)
	}

	return (
		<div className="flex h-full w-full flex-col overflow-hidden">
			{/* Masthead — industrial signage */}
			<motion.header
				initial={reduce ? false : { opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
				className="shrink-0 border-b-[3px] border-[var(--color-text)] px-8 pt-8 pb-5"
			>
				<div className="flex items-start justify-between gap-8">
					<div>
						<p className="font-[family-name:var(--font-geist-mono)] text-[11px] font-bold uppercase tracking-[0.32em] text-black/60">
							Dock · Bay 01
						</p>
						<h1 className="mt-2 font-[family-name:var(--font-geist-mono)] text-[44px] font-bold uppercase leading-[0.9] tracking-[-0.02em]">
							Loading
							<br />
							queue
						</h1>
					</div>
					<div className="grid grid-cols-3 gap-6 text-end">
						<StatBlock label="Open" value={data.totals.total} />
						<StatBlock label="Loading" value={data.totals.loading} accent />
						<StatBlock label="Signoff" value={data.totals.awaitingSignoff} />
					</div>
				</div>
				<WarehouseTabSwitch />
			</motion.header>

			{/* Queue — scrollable column of oversized cards */}
			<div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
				{data.orders.length === 0 ? (
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
						{data.orders.map((order) => (
							<OrderCard
								key={order.quoteId}
								order={order}
								isSelected={order.quoteId === selectedQuoteId}
								onPress={() => setSelectedQuoteId(order.quoteId)}
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
					accent ? 'text-[#E6B400]' : 'text-[var(--color-text)]'
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
				Dock is clear
			</p>
			<p className="mt-2 text-center text-[12px] leading-relaxed text-black/45 max-w-[320px]">
				When inventory approves an order it lands here. Check back in a few
				minutes, or call procurement if you're expecting one.
			</p>
		</div>
	)
}

// ─── Order card ──────────────────────────────────────────

const STAGE_META: Record<
	WarehouseStage,
	{ label: string; accent: string; textOnAccent: string; description: string }
> = {
	unstarted: {
		label: 'Awaiting truck',
		accent: 'var(--color-text)',
		textOnAccent: '#FFFFFF',
		description: 'No truck assigned yet',
	},
	loading: {
		label: 'Loading',
		accent: '#E6B400',
		textOnAccent: 'var(--color-text)',
		description: 'Items going onto trucks',
	},
	awaiting_signoff: {
		label: 'Signoff',
		accent: '#CC3300',
		textOnAccent: '#FFFFFF',
		description: 'Ready for advisor + QA signoff',
	},
	complete: {
		label: 'Complete',
		accent: '#0A5C2E',
		textOnAccent: '#FFFFFF',
		description: 'Signed off',
	},
}

function OrderCard({
	order,
	isSelected,
	onPress,
	reduce,
}: {
	order: WarehouseOrderRowView
	isSelected: boolean
	onPress: () => void
	reduce: boolean
}) {
	const stage = STAGE_META[order.stage]
	const loadedPct =
		order.itemCount > 0
			? Math.round((order.loadedCount / order.itemCount) * 100)
			: 0

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
			className={`group relative w-full border-[3px] bg-[var(--color-surface)] text-start ${
				isSelected
					? 'border-[var(--color-text)] shadow-[8px_8px_0_0_var(--color-text)]'
					: 'border-[var(--color-text)]/20 hover:border-[var(--color-text)]/60 hover:shadow-[4px_4px_0_0_var(--color-text)]'
			}`}
			style={{
				minHeight: '128px',
				transition: 'border-color 160ms, box-shadow 160ms',
			}}
		>
			{/* Top strip — flex row with stage chevron + urgency. Real flow,
          not absolute, so they can never overlap the body. */}
			<div className="flex items-center justify-between">
				<span
					className="inline-flex h-9 items-center px-3 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.22em]"
					style={{ backgroundColor: stage.accent, color: stage.textOnAccent }}
				>
					{stage.label}
				</span>
				<span className="inline-flex h-9 items-center px-3 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase tracking-[0.18em] text-black/50">
					{order.deliveryUrgencyDays === 0
						? 'TODAY'
						: order.deliveryUrgencyDays === 1
							? 'TOMORROW'
							: `+${order.deliveryUrgencyDays}D`}
				</span>
			</div>

			{/* Body */}
			<div className="px-6 pb-5 pt-3">
				<div className="grid grid-cols-[1fr,auto] gap-x-8 gap-y-3 items-end">
					<div className="min-w-0">
						<p className="truncate text-[22px] font-bold leading-tight text-[var(--color-text)]">
							{order.customerName}
						</p>
						<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/55">
							{order.quoteNumber} · {order.deliveryCity || '—'}
						</p>
					</div>

					{/* Items + progress — right pillar */}
					<div className="text-end">
						<div className="flex items-baseline gap-1 justify-end">
							<motion.span
								key={order.loadedCount}
								initial={reduce ? false : { scale: 0.8, opacity: 0.4 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ type: 'spring', stiffness: 420, damping: 24 }}
								className="font-[family-name:var(--font-geist-mono)] text-[26px] font-bold leading-none tabular-nums"
							>
								{order.loadedCount}
							</motion.span>
							<span className="font-[family-name:var(--font-geist-mono)] text-[16px] font-bold text-black/35">
								/{order.itemCount}
							</span>
						</div>
						<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.2em] text-black/50">
							loaded
						</p>
					</div>
				</div>

				{/* Progress strip */}
				<div className="mt-4 flex items-center gap-3">
					<div className="relative h-[6px] flex-1 bg-black/10">
						<motion.div
							className="absolute start-0 top-0 h-full"
							initial={{ width: 0 }}
							animate={{ width: `${loadedPct}%` }}
							transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
							style={{ backgroundColor: stage.accent }}
						/>
					</div>
					<span className="font-[family-name:var(--font-geist-mono)] text-[10px] font-bold tabular-nums text-black/50 w-8 text-end">
						{loadedPct}%
					</span>
				</div>

				{/* Truck count marker, if any */}
				{order.truckCount > 0 && (
					<div className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-black/50">
						{order.truckCount} truck{order.truckCount === 1 ? '' : 's'} assigned
						· {stage.description.toLowerCase()}
					</div>
				)}
			</div>
		</motion.button>
	)
}
