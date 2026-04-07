import { Button } from 'react-aria-components'
import { ArrowLeft } from 'lucide-react'
import { useDispatchStore } from '../../stores/dispatch'
import { DispatchTabStrip } from './DispatchTabStrip'
import { DispatchShortcuts } from './DispatchShortcuts'
import { RoutePlanningView } from './route-planning/RoutePlanningView'
import { LiveMapView } from './live-map/LiveMapView'
import { DriverManagementView } from './driver-management/DriverManagementView'
import { DeliveryLogView } from './delivery-log/DeliveryLogView'
import { PODValidationView } from './pod-validation/PODValidationView'
import { Users } from 'lucide-react'

/**
 * Dispatch "Map Room" — root module.
 * Pill-tab navigation across all dispatch views.
 * Content area fills remaining space, no scroll on shell itself.
 */
export function DispatchModule() {
  const activeTab = useDispatchStore((s) => s.activeTab)
  const mapMode = useDispatchStore((s) => s.mapMode)
  const reviewingDeliveryId = useDispatchStore((s) => s.reviewingDeliveryId)
  const setReviewingDeliveryId = useDispatchStore((s) => s.setReviewingDeliveryId)
  const rosterSidebarOpen = useDispatchStore((s) => s.rosterSidebarOpen)
  const setRosterSidebarOpen = useDispatchStore((s) => s.setRosterSidebarOpen)

  const renderTab = () => {
    switch (activeTab) {
      case 'map':
        // Unified map tab with planning/live toggle + roster sidebar
        return (
          <div className="relative flex h-full">
            <div className="flex-1 min-w-0">
              {mapMode === 'live' ? <LiveMapView /> : <RoutePlanningView />}
            </div>
            {/* Roster toggle button */}
            {!rosterSidebarOpen && (
              <Button
                onPress={() => setRosterSidebarOpen(true)}
                aria-label="Open driver roster"
                className="absolute top-3 end-3 z-10 flex items-center gap-1.5 rounded-xl bg-white/80 dark:bg-black/80 backdrop-blur-xl px-3 py-2 text-[13px] font-medium text-black/60 dark:text-white/60 shadow-sm border border-black/[0.06] dark:border-white/[0.06] cursor-pointer outline-none transition-colors hover:text-black dark:hover:text-white data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40"
              >
                <Users size={15} strokeWidth={1.5} />
                Roster
              </Button>
            )}
            {/* Roster sidebar panel */}
            {rosterSidebarOpen && (
              <div className="w-80 shrink-0 border-s border-black/[0.06] dark:border-white/[0.06] bg-white/60 dark:bg-black/60 backdrop-blur-xl overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-black/30 dark:text-white/30">
                    Driver Roster
                  </span>
                  <Button
                    onPress={() => setRosterSidebarOpen(false)}
                    className="rounded-md px-2 py-0.5 text-xs text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white cursor-pointer outline-none"
                  >
                    Close
                  </Button>
                </div>
                <DriverManagementView />
              </div>
            )}
          </div>
        )
      case 'deliveries':
        // Deliveries tab with POD review drill-down
        if (reviewingDeliveryId) {
          return (
            <div className="flex h-full flex-col">
              <div className="px-4 pt-3">
                <Button
                  onPress={() => setReviewingDeliveryId(null)}
                  className="flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 cursor-pointer hover:text-black dark:hover:text-white transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 rounded-md px-1 py-0.5"
                >
                  <ArrowLeft size={16} strokeWidth={1.5} />
                  Back to list
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <PODValidationView />
              </div>
            </div>
          )
        }
        return <DeliveryLogView />
      default:
        return null
    }
  }

  return (
    <div className="flex h-full flex-col">
      <DispatchShortcuts />
      <DispatchTabStrip />
      <div className="min-h-0 flex-1">{renderTab()}</div>
    </div>
  )
}
