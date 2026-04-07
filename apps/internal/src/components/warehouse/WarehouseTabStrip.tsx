import { useQuery } from '@tanstack/react-query'
import { useWarehouseStore } from '../../stores/warehouse'
import { getWarehouseDashboard } from '../../lib/server/warehouse-dashboard'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

export function WarehouseTabStrip() {
  const activeTab = useWarehouseStore((s) => s.activeTab)
  const setActiveTab = useWarehouseStore((s) => s.setActiveTab)

  const { data: dashboard } = useQuery({
    queryKey: ['warehouse', 'dashboard'],
    queryFn: () => getWarehouseDashboard({ data: {} }),
    staleTime: 30_000,
  })

  const tabs = [
    { id: 'inbound', label: 'Inbound', badge: dashboard?.pendingReceiving as number | undefined },
    { id: 'outbound', label: 'Outbound', badge: dashboard?.pendingPicking as number | undefined },
    { id: 'inventory', label: 'Inventory', badge: dashboard?.pendingCounts as number | undefined },
    { id: 'yard', label: 'Yard' },
  ]

  return (
    <ModuleTabStrip
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={(id) => setActiveTab(id as typeof activeTab)}
      ariaLabel="Warehouse"
    />
  )
}
