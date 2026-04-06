import { useDispatchStore } from '../../stores/dispatch'
import { DispatchTabStrip } from './DispatchTabStrip'
import { DispatchShortcuts } from './DispatchShortcuts'
import { DispatchHomeView } from './home/DispatchHomeView'
import type { DispatchTab } from '../../types/dispatch'

/**
 * Root dispatch module component.
 * Only home tab wired — other tabs added in Plan 05 to avoid merge conflicts
 * with Plans 02-04 running in parallel.
 */
export function DispatchModule() {
  const activeTab = useDispatchStore((s) => s.activeTab)

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <DispatchHomeView />
      default:
        return <TabPlaceholder tab={activeTab} />
    }
  }

  return (
    <div className="flex flex-col h-full">
      <DispatchShortcuts />
      <DispatchTabStrip />
      <div className="flex-1 overflow-auto">
        {renderTab()}
      </div>
    </div>
  )
}

function TabPlaceholder({ tab }: { tab: DispatchTab }) {
  const labels: Record<DispatchTab, string> = {
    home: 'Home',
    'route-planning': 'Route Planning',
    'live-map': 'Live Map',
    'driver-management': 'Driver Management',
    'delivery-log': 'Delivery Log',
  }

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-black/40 dark:text-white/40">
        {labels[tab]}
      </p>
    </div>
  )
}
