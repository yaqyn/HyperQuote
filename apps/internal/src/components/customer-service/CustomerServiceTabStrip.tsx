import { useCustomerServiceStore } from '../../stores/customer-service'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'conversations', label: 'Conversations' },
  { id: 'claims', label: 'Claims' },
]

export function CustomerServiceTabStrip() {
  const activeTab = useCustomerServiceStore((s) => s.activeTab)
  const setActiveTab = useCustomerServiceStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Customer Service"
    />
  )
}
