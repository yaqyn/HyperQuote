import { UrgentSection } from './UrgentSection'
import { PipelineSnapshot } from './PipelineSnapshot'
import { SalesActivityFeed } from './SalesActivityFeed'

export function SalesHomeView() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <UrgentSection />
      <PipelineSnapshot />
      <SalesActivityFeed />
    </div>
  )
}
