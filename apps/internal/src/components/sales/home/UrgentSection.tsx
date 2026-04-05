import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { useTranslation } from 'react-i18next'
import { getRFQQueue } from '../../../lib/server/sales-rfq'
import { getSalesPipeline } from '../../../lib/server/sales-pipeline'
import { useSalesStore } from '../../../stores/sales'

interface UrgentCard {
  label: string
  count: number
  critical: boolean
  onPress: () => void
}

export function UrgentSection() {
  const { t } = useTranslation('internal')
  const setActiveTab = useSalesStore((s) => s.setActiveTab)
  const setRfqInboxTab = useSalesStore((s) => s.setRfqInboxTab)

  const { data: rfqData } = useQuery({
    queryKey: ['rfq-queue-urgent'],
    queryFn: () => getRFQQueue({ data: { status: 'submitted', page: 1, limit: 100 } }),
    staleTime: 30_000,
  })

  const { data: pipelineData } = useQuery({
    queryKey: ['sales-pipeline-urgent'],
    queryFn: () => getSalesPipeline({ data: {} }),
    staleTime: 60_000,
  })

  const unassignedCount = rfqData?.rfqs.filter((r) => !r.assignedRep).length ?? 0

  // Quotes expiring this week: deals in 'sent' stage with daysInStage > 7
  const expiringQuotes = pipelineData?.deals.filter(
    (d) => d.stage === 'sent' && d.daysInStage > 7,
  ).length ?? 0

  // Overdue follow-ups: deals with red color (at risk)
  const overdueFollowups = pipelineData?.deals.filter(
    (d) => d.color === 'red',
  ).length ?? 0

  const cards: UrgentCard[] = [
    {
      label: t('sales.home.rfqsAwaiting', 'RFQs Awaiting Response'),
      count: unassignedCount,
      critical: unassignedCount > 0,
      onPress: () => {
        setActiveTab('rfq-inbox')
        setRfqInboxTab('unassigned')
      },
    },
    {
      label: t('sales.home.quotesExpiring', 'Quotes Expiring This Week'),
      count: expiringQuotes,
      critical: expiringQuotes > 0,
      onPress: () => {
        setActiveTab('pipeline')
      },
    },
    {
      label: t('sales.home.overdueFollowups', 'Overdue Follow-ups'),
      count: overdueFollowups,
      critical: overdueFollowups > 0,
      onPress: () => {
        setActiveTab('pipeline')
      },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((card) => (
        <Button
          key={card.label}
          onPress={card.onPress}
          className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-start transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
            card.critical
              ? 'border-red-500/40 bg-red-500/5'
              : 'border-black/10 dark:border-white/10'
          }`}
        >
          <span className="font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums">
            {card.count}
          </span>
          <span className="text-sm text-black/60 dark:text-white/60">
            {card.label}
          </span>
        </Button>
      ))}
    </div>
  )
}
