import { useDispatchStore } from '../../stores/dispatch'
import { DispatchTabStrip } from './DispatchTabStrip'
import { DispatchShortcuts } from './DispatchShortcuts'
import { DispatchHomeView } from './home/DispatchHomeView'
import { RoutePlanningView } from './route-planning/RoutePlanningView'
import { LiveMapView } from './live-map/LiveMapView'
import { DriverManagementView } from './driver-management/DriverManagementView'
import { DeliveryLogView } from './delivery-log/DeliveryLogView'

/**
 * Root dispatch module component.
 * All tabs wired to actual components -- no placeholders.
 */
export function DispatchModule() {
  const activeTab = useDispatchStore((s) => s.activeTab)

  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <DispatchHomeView />
      case 'route-planning':
        return <RoutePlanningView />
      case 'live-map':
        return <LiveMapView />
      case 'driver-management':
        return <DriverManagementView />
      case 'delivery-log':
        return <DeliveryLogView />
      default:
        return null
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
