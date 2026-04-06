import { useOperationsStore } from '../../stores/operations'
import { OperationsTabStrip } from './OperationsTabStrip'
import { OperationsShortcuts } from './OperationsShortcuts'
import { FulfillmentKanban } from './kanban/FulfillmentKanban'

export function OperationsModule() {
  const activeTab = useOperationsStore((s) => s.activeTab)
  const selectedOrderId = useOperationsStore((s) => s.selectedOrderId)

  // If an order is selected on kanban, show detail view
  if (selectedOrderId && activeTab === 'kanban') {
    return (
      <div className="flex flex-col h-full">
        <OperationsShortcuts />
        <OperationsTabStrip />
        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-center h-full text-sm text-black/40 dark:text-white/40">
            Order Detail — {selectedOrderId}
          </div>
        </div>
      </div>
    )
  }

  const tabContent: Record<string, React.ReactNode> = {
    dashboard: <div className="flex items-center justify-center h-full text-sm text-black/40 dark:text-white/40">Dashboard</div>,
    kanban: <FulfillmentKanban />,
    'order-detail': <div className="flex items-center justify-center h-full text-sm text-black/40 dark:text-white/40">Order Detail</div>,
    'delivery-schedule': <div className="flex items-center justify-center h-full text-sm text-black/40 dark:text-white/40">Delivery Schedule</div>,
  }

  return (
    <div className="flex flex-col h-full">
      <OperationsShortcuts />
      <OperationsTabStrip />
      <div className="flex-1 overflow-auto">
        {tabContent[activeTab] ?? null}
      </div>
    </div>
  )
}
