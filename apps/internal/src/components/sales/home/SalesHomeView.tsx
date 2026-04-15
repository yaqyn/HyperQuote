import { OutdatedPricesCard } from './OutdatedPricesCard'
import { UrgentSection } from './UrgentSection'
import { PipelineSnapshot } from './PipelineSnapshot'
import { SalesActivityFeed } from './SalesActivityFeed'

export function SalesHomeView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 p-5 h-full">
      {/* Left — metrics & pipeline */}
      <div className="flex flex-col gap-6 min-w-0">
        <UrgentSection />
        <OutdatedPricesCard />
        <PipelineSnapshot />
      </div>

      {/* Right — activity feed */}
      <div className="min-w-0 min-h-0">
        <SalesActivityFeed />
      </div>
    </div>
  )
}
