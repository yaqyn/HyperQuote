import { useReportsStore } from '../../stores/reports'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'procurement', label: 'Procurement' },
  { id: 'operations', label: 'Operations' },
  { id: 'finance', label: 'Finance' },
  { id: 'warehouse', label: 'Warehouse' },
  { id: 'dispatch', label: 'Dispatch' },
  { id: 'cs', label: 'CS' },
]

export function ReportsTabStrip() {
  const activeTab = useReportsStore((s) => s.activeTab)
  const setActiveTab = useReportsStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Reports"
    />
  )
}
