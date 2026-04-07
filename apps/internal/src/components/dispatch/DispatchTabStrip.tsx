import { useDispatchStore } from '../../stores/dispatch'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'map', label: 'Map' },
  { id: 'deliveries', label: 'Deliveries' },
]

export function DispatchTabStrip() {
  const activeTab = useDispatchStore((s) => s.activeTab)
  const setActiveTab = useDispatchStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Dispatch"
    />
  )
}
