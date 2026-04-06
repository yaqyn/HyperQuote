import { useQuery } from '@tanstack/react-query'
import { getOperationsDashboard } from '../../../lib/server/operations-dashboard'
import { MetricCards } from './MetricCards'
import { BottleneckPipeline } from './BottleneckPipeline'
import { BottleneckStageDetail } from './BottleneckStageDetail'
import { SLATracker } from './SLATracker'
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
      <div className="flex flex-col p-6 gap-6">
        <div className="h-20 animate-pulse bg-black/5 dark:bg-white/5 rounded-xl" />
        <div className="h-32 animate-pulse bg-black/5 dark:bg-white/5 rounded-xl" />
        <div className="h-64 animate-pulse bg-black/5 dark:bg-white/5 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col p-6 gap-6">
      <MetricCards metrics={data.metrics} />
      <BottleneckPipeline stages={data.bottleneck} />
      {selectedBottleneckStage && <BottleneckStageDetail />}
      <SLATracker />
    </div>
  )
}
