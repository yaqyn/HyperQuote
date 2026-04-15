import { useProcurementStore } from '../../stores/procurement'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'sourcing', label: 'Sourcing · Archived' },
  { id: 'po-management', label: 'PO Management · Archived' },
  { id: 'suppliers', label: 'Suppliers · Archived' },
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
