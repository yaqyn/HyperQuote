import { useProcurementStore } from '../../stores/procurement'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'sourcing', label: 'Sourcing' },
  { id: 'po-management', label: 'PO Management' },
  { id: 'suppliers', label: 'Suppliers' },
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
