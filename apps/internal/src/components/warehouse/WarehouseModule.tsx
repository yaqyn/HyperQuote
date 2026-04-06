import { useWarehouseStore } from '../../stores/warehouse'
import { WarehouseTabStrip } from './WarehouseTabStrip'
import { WarehouseShortcuts } from './WarehouseShortcuts'
import { WarehouseHome } from './home/WarehouseHome'
import { ExpectedDeliveriesList } from './receiving/ExpectedDeliveriesList'
import { ActiveReceivingStandard } from './receiving/ActiveReceivingStandard'
import { ActiveReceivingBulk } from './receiving/ActiveReceivingBulk'

/**
 * Root warehouse module component.
 * Renders shortcuts + tab strip + active tab content.
 * Handles selectedReceivingId for detail view navigation.
 */
export function WarehouseModule() {
  const activeTab = useWarehouseStore((s) => s.activeTab)
  const selectedReceivingId = useWarehouseStore((s) => s.selectedReceivingId)

  // If a receiving delivery is selected, show the appropriate receiving view
  if (selectedReceivingId && activeTab === 'receiving') {
    // TODO: Determine bulk vs standard from delivery data. For now use standard.
    // Bulk receiving shown when material category is aggregates/cement (weight-based)
    return (
      <div className="flex flex-col h-full">
        <WarehouseShortcuts />
        <WarehouseTabStrip />
        <div className="flex-1 overflow-auto">
          <ActiveReceivingStandard deliveryId={selectedReceivingId} />
        </div>
      </div>
    )
  }

  const tabContent: Record<string, React.ReactNode> = {
    home: <WarehouseHome />,
    receiving: <ExpectedDeliveriesList />,
    putaway: <PlaceholderTab label="Putaway" />,
    picking: <PlaceholderTab label="Picking" />,
    staging: <PlaceholderTab label="Load / Staging" />,
    count: <PlaceholderTab label="Cycle Count" />,
    lookup: <PlaceholderTab label="Inventory Lookup" />,
    yard: <PlaceholderTab label="Yard Management" />,
  }

  return (
    <div className="flex flex-col h-full">
      <WarehouseShortcuts />
      <WarehouseTabStrip />
      <div className="flex-1 overflow-auto">
        {tabContent[activeTab] ?? null}
      </div>
    </div>
  )
}

/** Placeholder for tabs that will be built in Plans 03-06 */
function PlaceholderTab({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full text-sm text-black/40 dark:text-white/40">
      {label} — Coming soon
    </div>
  )
}
