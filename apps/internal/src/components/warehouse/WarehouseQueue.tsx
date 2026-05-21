import { useQuery } from '@tanstack/react-query'
import { motion, useReducedMotion } from 'motion/react'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../lib/internal-live-query'
import {
	getWarehouseQueue,
	type WarehouseOrderRowView,
	type WarehouseStage,
} from '../../lib/server/warehouse'
import { useWarehouseStore } from '../../stores/warehouse'
import {
	WarehouseAnimatedList,
	WarehouseProgressStrip,
	WarehouseQueueCard,
	WarehouseQueueEmpty,
	WarehouseQueueLoading,
	WarehouseQueueShell,
} from './WarehouseQueueFrame'

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
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	const selectedQuoteId = useWarehouseStore((s) => s.selectedQuoteId)
	const setSelectedQuoteId = useWarehouseStore((s) => s.setSelectedQuoteId)

	if (isLoading || !data) {
		return <WarehouseQueueLoading label="Loading dock queue…" />
	}

	return (
		<WarehouseQueueShell
			isHidden={Boolean(selectedQuoteId)}
			reduce={!!reduce}
			title="Loading"
			accentColor="#E6B400"
			stats={[
				{ label: 'Open', value: data.totals.total },
				{ label: 'Loading', value: data.totals.loading, accent: true },
				{ label: 'Signoff', value: data.totals.awaitingSignoff },
			]}
		>
			{data.orders.length === 0 ? (
				<WarehouseQueueEmpty
					title="Dock is clear"
					copy="When inventory approves an order it lands here. Check back in a few minutes, or call procurement if you're expecting one."
				/>
			) : (
				<WarehouseAnimatedList reduce={!!reduce}>
					{data.orders.map((order) => (
						<OrderCard
							key={order.quoteId}
							order={order}
							isSelected={order.quoteId === selectedQuoteId}
							onPress={() => setSelectedQuoteId(order.quoteId)}
							reduce={!!reduce}
						/>
					))}
				</WarehouseAnimatedList>
			)}
		</WarehouseQueueShell>
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
		<WarehouseQueueCard
			isSelected={isSelected}
			onPress={onPress}
			reduce={reduce}
		>
			{/* Top strip — flex row with stage chevron + urgency. Real flow,
          not absolute, so they can never overlap the body. */}
			<div className="flex flex-wrap items-center justify-between gap-y-1">
				<span
					className="inline-flex h-8 items-center px-3 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.16em] lg:h-9 lg:text-[10px] lg:tracking-[0.22em]"
					style={{ backgroundColor: stage.accent, color: stage.textOnAccent }}
				>
					{stage.label}
				</span>
				<span className="inline-flex h-8 items-center px-3 font-[family-name:var(--font-geist-mono)] text-[9px] font-bold uppercase tracking-[0.14em] text-black/50 lg:h-9 lg:text-[10px] lg:tracking-[0.18em]">
					{order.deliveryUrgencyDays === 0
						? 'TODAY'
						: order.deliveryUrgencyDays === 1
							? 'TOMORROW'
							: `+${order.deliveryUrgencyDays}D`}
				</span>
			</div>

			{/* Body */}
			<div className="px-4 pb-4 pt-3 sm:px-6 lg:pb-5">
				<div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 lg:gap-x-8">
					<div className="min-w-0">
						<p className="truncate text-[17px] font-bold leading-tight text-[var(--color-text)] lg:text-[22px]">
							{order.customerName}
						</p>
						<p className="mt-1 truncate font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/55 lg:text-[11px]">
							{order.quoteNumber} · {order.deliveryCity || '—'}
						</p>
					</div>

					{/* Items + progress — right pillar */}
					<div className="text-end">
						<div className="flex items-baseline justify-end gap-1">
							<motion.span
								key={order.loadedCount}
								initial={reduce ? false : { scale: 0.8, opacity: 0.4 }}
								animate={{ scale: 1, opacity: 1 }}
								transition={{ type: 'spring', stiffness: 420, damping: 24 }}
								className="font-[family-name:var(--font-geist-mono)] text-[21px] font-bold leading-none tabular-nums lg:text-[26px]"
							>
								{order.loadedCount}
							</motion.span>
							<span className="font-[family-name:var(--font-geist-mono)] text-[13px] font-bold text-black/35 lg:text-[16px]">
								/{order.itemCount}
							</span>
						</div>
						<p className="mt-1 font-[family-name:var(--font-geist-mono)] text-[8px] font-bold uppercase tracking-[0.16em] text-black/50 lg:text-[9px] lg:tracking-[0.2em]">
							loaded
						</p>
					</div>
				</div>

				<WarehouseProgressStrip percent={loadedPct} color={stage.accent} />

				{/* Truck count marker, if any */}
				{order.truckCount > 0 && (
					<div className="mt-2 font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.18em] text-black/50">
						{order.truckCount} truck{order.truckCount === 1 ? '' : 's'} assigned
						· {stage.description.toLowerCase()}
					</div>
				)}
			</div>
		</WarehouseQueueCard>
	)
}
