import { useAdminStore } from '../../stores/admin'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS = [
  { id: 'users', label: 'Users' },
  { id: 'rules', label: 'Rules' },
  { id: 'settings', label: 'Settings' },
  { id: 'audit', label: 'Audit' },
]

export function AdminTabStrip() {
  const activeTab = useAdminStore((s) => s.activeTab)
  const setActiveTab = useAdminStore((s) => s.setActiveTab)

  return (
    <ModuleTabStrip
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Admin"
    />
  )
}
