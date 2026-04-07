import { useOperationsStore } from '../../stores/operations'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'operations', label: 'Operations' },
]

export function OperationsTabStrip() {
  const activeTab = useOperationsStore((s) => s.activeTab)
  const setActiveTab = useOperationsStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Operations"
    />
  )
}
