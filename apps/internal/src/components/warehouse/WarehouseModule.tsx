import { useWarehouseStore } from '../../stores/warehouse'

/**
 * Root warehouse module component.
 * Placeholder — Plans 02-06 will build the full tab-based UI.
 */
export function WarehouseModule() {
  const activeTab = useWarehouseStore((s) => s.activeTab)

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-center h-full">
        <p className="text-[var(--color-text-muted)] text-sm">
          Warehouse Module — Active tab: {activeTab}
        </p>
      </div>
    </div>
  )
}
