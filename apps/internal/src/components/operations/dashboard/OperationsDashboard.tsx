import { useQuery } from '@tanstack/react-query'
import { getOperationsDashboard } from '../../../lib/server/operations-dashboard'
import { MetricCards } from './MetricCards'
import { BottleneckPipeline } from './BottleneckPipeline'
import { BottleneckStageDetail } from './BottleneckStageDetail'
import { SLATracker } from './SLATracker'
import { FulfillmentKanban } from '../kanban/FulfillmentKanban'
import { useOperationsStore } from '../../../stores/operations'

export function OperationsDashboard() {
  const selectedBottleneckStage = useOperationsStore((s) => s.selectedBottleneckStage)

  const { data, isLoading } = useQuery({
    queryKey: ['operations', 'dashboard'],
    queryFn: () => getOperationsDashboard(),
    staleTime: 30_000,
  })

  if (isLoading || !data) {
    return (
      <div className="flex flex-col px-5 py-6 gap-8">
        {/* Metric strip skeleton */}
        <div className="flex gap-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="h-3 w-20 animate-pulse rounded bg-black/5 dark:bg-white/5" />
              <div className="h-8 w-16 animate-pulse rounded bg-black/5 dark:bg-white/5" />
            </div>
          ))}
        </div>
        {/* Pipeline skeleton */}
        <div className="h-16 animate-pulse rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
        {/* SLA skeleton */}
        <div className="h-48 animate-pulse rounded-lg bg-black/[0.03] dark:bg-white/[0.03]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col px-5 py-6 gap-10">
      <MetricCards metrics={data.metrics} />
      <BottleneckPipeline stages={data.bottleneck} />
      {selectedBottleneckStage && <BottleneckStageDetail />}
      <FulfillmentKanban />
      <SLATracker />
    </div>
  )
}
