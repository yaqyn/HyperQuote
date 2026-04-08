import { useHRStore } from '../../stores/hr'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'people', label: 'People' },
  { id: 'time', label: 'Time' },
  { id: 'settings', label: 'Settings' },
]

export function HRTabStrip() {
  const activeTab = useHRStore((s) => s.activeTab)
  const setActiveTab = useHRStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="HR"
    />
  )
}
