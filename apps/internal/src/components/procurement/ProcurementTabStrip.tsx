import { useProcurementStore } from '../../stores/procurement'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'stock', label: 'Inventory' },
  { id: 'procurement', label: 'Procurement' },
  { id: 'orders', label: 'Orders' },
]

export function ProcurementTabStrip() {
  const activeTab = useProcurementStore((s) => s.activeTab)
  const setActiveTab = useProcurementStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Procurement"
    />
  )
}
