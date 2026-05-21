import { useQuery } from '@tanstack/react-query'
import { useReducedMotion } from 'motion/react'
import {
	INTERNAL_LIVE_REFETCH_MS,
	INTERNAL_LIVE_STALE_MS,
} from '../../lib/internal-live-query'
import {
	getReceivingQueue,
	type ReceivingDealRowView,
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
 * Incoming supplier deals waiting for warehouse inspection. Mirrors
 * the outgoing Loading queue layout — same masthead, same card shape,
 * same tab switch — so the advisor's mental model doesn't flip.
 */
export function WarehouseReceivingQueue() {
	const reduce = useReducedMotion()
	const { data, isLoading } = useQuery({
		queryKey: ['warehouse-receiving-queue'],
		queryFn: () => getReceivingQueue({ data: {} }),
		refetchInterval: INTERNAL_LIVE_REFETCH_MS,
		refetchIntervalInBackground: true,
		refetchOnWindowFocus: 'always',
		staleTime: INTERNAL_LIVE_STALE_MS,
	})

	const selectedDealId = useWarehouseStore((s) => s.selectedDealId)
	const setSelectedDealId = useWarehouseStore((s) => s.setSelectedDealId)

	if (isLoading || !data) {
		return <WarehouseQueueLoading label="Loading receiving queue…" />
	}

	return (
		<WarehouseQueueShell
			isHidden={Boolean(selectedDealId)}
			reduce={!!reduce}
			title="Receiving"
			accentColor="#CC3300"
			stats={[
				{ label: 'Open', value: data.totals.total },
				{ label: 'Retry', value: data.totals.retrying, accent: true },
				{ label: 'Fresh', value: data.totals.fresh },
			]}
		>
			{data.deals.length === 0 ? (
				<WarehouseQueueEmpty
					title="No incoming deliveries"
					copy="Deals show up here once finance clears a partial payment. When a supplier truck arrives, tap the card to start inspecting."
				/>
			) : (
				<WarehouseAnimatedList reduce={!!reduce}>
					{data.deals.map((deal) => (
						<DealCard
							key={deal.dealId}
							deal={deal}
							isSelected={deal.dealId === selectedDealId}
							onPress={() => setSelectedDealId(deal.dealId)}
							reduce={!!reduce}
						/>
					))}
				</WarehouseAnimatedList>
			)}
		</WarehouseQueueShell>
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
		<WarehouseQueueCard
			isSelected={isSelected}
			onPress={onPress}
			reduce={reduce}
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

				<WarehouseProgressStrip percent={receivedPct} color="#0A5C2E" />

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
		</WarehouseQueueCard>
	)
}
