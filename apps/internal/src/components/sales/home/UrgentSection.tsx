import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { getRFQQueue } from '../../../lib/server/sales-rfq'
import { useSalesStore } from '../../../stores/sales'

interface MetricCard {
	label: string
	count: number
	urgent: boolean
	onPress: () => void
}

export function UrgentSection() {
	const setActiveTab = useSalesStore((s) => s.setActiveTab)
	const setRfqInboxTab = useSalesStore((s) => s.setRfqInboxTab)

	const { data: rfqData } = useQuery({
		queryKey: ['rfq-queue-urgent'],
		queryFn: () =>
			getRFQQueue({ data: { status: 'submitted', page: 1, limit: 100 } }),
		staleTime: 30_000,
	})

	const { data: pipelineData } = useQuery({
		queryKey: ['sales-pipeline-urgent'],
		queryFn: () => getSalesPipeline({ data: {} }),
		staleTime: 60_000,
	})

	const unassignedCount =
		rfqData?.rfqs.filter((r) => !r.assignedRep).length ?? 0
	const expiringQuotes =
		pipelineData?.deals.filter((d) => d.stage === 'sent' && d.daysInStage > 7)
			.length ?? 0
	const overdueFollowups =
		pipelineData?.deals.filter((d) => d.color === 'red').length ?? 0

	const cards: MetricCard[] = [
		{
			label: 'RFQs Awaiting Response',
			count: unassignedCount,
			urgent: unassignedCount > 0,
			onPress: () => {
				setActiveTab('rfq-inbox')
				setRfqInboxTab('unassigned')
			},
		},
		{
			label: 'Quotes Expiring This Week',
			count: expiringQuotes,
			urgent: expiringQuotes > 0,
			onPress: () => {
				setActiveTab('rfq-inbox')
				useSalesStore.getState().setRfqStageFilter('evaluated')
			},
		},
		{
			label: 'Overdue Follow-ups',
			count: overdueFollowups,
			urgent: overdueFollowups > 0,
			onPress: () => {
				setActiveTab('rfq-inbox')
				useSalesStore.getState().setRfqStageFilter('submitted')
			},
		},
	]

	return (
		<div className="grid grid-cols-3 gap-3">
			{cards.map((card) => (
				<Button
					key={card.label}
					onPress={card.onPress}
					className="group flex flex-col items-start gap-2 rounded-xl px-4 py-4 text-start cursor-pointer outline-none transition-all duration-150 bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] pressed:scale-[0.98]"
				>
					<span
						className={`font-[family-name:var(--font-geist-mono)] text-3xl font-semibold tabular-nums leading-none ${
							card.urgent && card.count > 0
								? 'text-[var(--color-primary)]'
								: 'text-[var(--color-text)]'
						}`}
					>
						{card.count}
					</span>
					<span className="text-xs text-[var(--color-text-muted)] leading-snug">
						{card.label}
					</span>
				</Button>
			))}
		</div>
	)
}
