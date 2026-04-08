import { Button } from 'react-aria-components'
import { ArrowLeft } from 'lucide-react'
import { useOperationsStore } from '../../stores/operations'
import { OperationsTabStrip } from './OperationsTabStrip'
import { OperationsShortcuts } from './OperationsShortcuts'
import { OrderDetailView } from './order-detail/OrderDetailView'
import { OperationsDashboard } from './dashboard/OperationsDashboard'
import { OrderListView } from './order-detail/OrderListView'

export function OperationsModule() {
  const activeTab = useOperationsStore((s) => s.activeTab)
  const selectedOrderId = useOperationsStore((s) => s.selectedOrderId)
  const setSelectedOrderId = useOperationsStore((s) => s.setSelectedOrderId)

  // Order detail drill-down from kanban or order list
  if (selectedOrderId && (activeTab === 'operations' || activeTab === 'orders')) {
    return (
      <div className="flex flex-col h-full">
        <OperationsShortcuts />
        <div className="shrink-0 flex items-center justify-between pt-1 pb-2">
          <OperationsTabStrip />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="px-5 pt-3">
            <Button
              onPress={() => setSelectedOrderId(null)}
              className="flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 cursor-pointer hover:text-black dark:hover:text-white transition-colors outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/40 rounded-md px-1 py-0.5"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
              Back to list
            </Button>
          </div>
          <div className="px-5">
            <OrderDetailView />
          </div>
        </div>
      </div>
    )
  }

  const tabContent: Record<string, React.ReactNode> = {
    operations: <OperationsDashboard />,
    orders: <OrderListView />,
  }

  return (
    <div className="flex flex-col h-full">
      <OperationsShortcuts />
      <div className="shrink-0 flex items-center justify-between pt-1 pb-2">
        <OperationsTabStrip />
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {tabContent[activeTab] ?? null}
      </div>
    </div>
  )
}
