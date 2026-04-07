import { useSalesStore } from '../../stores/sales'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'rfq-inbox', label: 'RFQs' },
  { id: 'customers', label: 'Customers' },
]

export function SalesTabStrip() {
  const activeTab = useSalesStore((s) => s.activeTab)
  const setActiveTab = useSalesStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Sales"
    />
  )
}
