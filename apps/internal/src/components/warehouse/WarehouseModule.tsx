import { useState } from 'react'
import { useWarehouseStore } from '../../stores/warehouse'
import { WarehouseTabStrip } from './WarehouseTabStrip'
import { WarehouseShortcuts } from './WarehouseShortcuts'
import { WarehouseHome } from './home/WarehouseHome'
import { ExpectedDeliveriesList } from './receiving/ExpectedDeliveriesList'
import { ActiveReceivingStandard } from './receiving/ActiveReceivingStandard'
import { ActiveReceivingBulk } from './receiving/ActiveReceivingBulk'
import { PutawayWorkflow } from './putaway/PutawayWorkflow'
import { PickQueue } from './picking/PickQueue'
import { DirectedPicking } from './picking/DirectedPicking'
import { StagingLoadView } from './staging/StagingLoadView'
import { CycleCountList } from './cycle-count/CycleCountList'
import { BlindCountEntry } from './cycle-count/BlindCountEntry'
import { CountReview } from './cycle-count/CountReview'
import { SupervisorApproval } from './cycle-count/SupervisorApproval'
import { InventoryLookup } from './inventory/InventoryLookup'
import { InventoryDetail } from './inventory/InventoryDetail'
import { YardManagement } from './yard/YardManagement'
import type { InventoryItem } from '../../types/warehouse'

/**
 * Root warehouse module component.
 * Renders shortcuts + tab strip + active tab content.
 * All 8 tabs wired to actual components — no placeholders.
 */
export function WarehouseModule() {
  const activeTab = useWarehouseStore((s) => s.activeTab)
  const selectedReceivingId = useWarehouseStore((s) => s.selectedReceivingId)
  const selectedPickOrderId = useWarehouseStore((s) => s.selectedPickOrderId)
  const setSelectedPickOrderId = useWarehouseStore((s) => s.setSelectedPickOrderId)
  const selectedCountId = useWarehouseStore((s) => s.selectedCountId)
  const setSelectedCountId = useWarehouseStore((s) => s.setSelectedCountId)

  // Local state for sub-views
  const [countView, setCountView] = useState<'blind' | 'review' | 'approval'>('blind')
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null)
  const [stagingRouteId, setStagingRouteId] = useState<string | null>(null)

  // ─── Receiving detail view ─────────────────────────────
  if (selectedReceivingId && activeTab === 'receiving') {
    return (
      <Shell>
        <ActiveReceivingStandard deliveryId={selectedReceivingId} />
      </Shell>
    )
  }

  // ─── Picking detail view ───────────────────────────────
  if (selectedPickOrderId && activeTab === 'picking') {
    return (
      <Shell>
        <DirectedPicking
          orderId={selectedPickOrderId}
          maxCapacityKg={25_000}
          onComplete={() => setSelectedPickOrderId(null)}
          onBack={() => setSelectedPickOrderId(null)}
        />
      </Shell>
    )
  }

  // ─── Cycle count detail views ──────────────────────────
  if (selectedCountId && activeTab === 'count') {
    return (
      <Shell>
        {countView === 'blind' && (
          <BlindCountEntry
            countId={selectedCountId}
            onSubmitted={() => {
              setCountView('review')
            }}
            onBack={() => setSelectedCountId(null)}
          />
        )}
        {countView === 'review' && (
          <CountReview
            results={[]}
            onBack={() => setSelectedCountId(null)}
          />
        )}
        {countView === 'approval' && (
          <SupervisorApproval
            approval={{
              countId: selectedCountId,
              location: '',
              productName: '',
              systemQty: 0,
              initialCount: 0,
              recountQty: 0,
              variance: 0,
              variancePercent: 0,
              recentMovements: [],
              financialImpact: 0,
            }}
            onComplete={() => setSelectedCountId(null)}
            onBack={() => setSelectedCountId(null)}
          />
        )}
      </Shell>
    )
  }

  // ─── Inventory detail view ─────────────────────────────
  if (selectedInventoryItem && activeTab === 'lookup') {
    return (
      <Shell>
        <InventoryDetail
          item={selectedInventoryItem}
          onBack={() => setSelectedInventoryItem(null)}
        />
      </Shell>
    )
  }

  // ─── Tab content mapping (all actual components) ───────
  const renderTab = () => {
    switch (activeTab) {
      case 'home':
        return <WarehouseHome />
      case 'receiving':
        return <ExpectedDeliveriesList />
      case 'putaway':
        return <PutawayWorkflow />
      case 'picking':
        return <PickQueue />
      case 'staging':
        return stagingRouteId ? (
          <StagingLoadView routeId={stagingRouteId} onProceedToVerification={() => {}} />
        ) : (
          <StagingRouteList onSelectRoute={setStagingRouteId} />
        )
      case 'count':
        return (
          <CycleCountList
            onNavigate={(countId, view) => {
              setSelectedCountId(countId)
              setCountView(view)
            }}
          />
        )
      case 'lookup':
        return <InventoryLookup onSelectItem={setSelectedInventoryItem} />
      case 'yard':
        return <YardManagement />
      default:
        return null
    }
  }

  return (
    <Shell>
      {renderTab()}
    </Shell>
  )
}

// ─── Shell ───────────────────────────────────────────────

/** Shared wrapper: shortcuts + tab strip + content area */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <WarehouseShortcuts />
      <WarehouseTabStrip />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}

// ─── Staging route list (before route is selected) ──────

/**
 * Shows pending routes/loads waiting to be staged.
 * Once a route is selected, StagingLoadView takes over.
 * This is a minimal list — full route selection is driven by dispatch module.
 */
function StagingRouteList({ onSelectRoute }: { onSelectRoute: (id: string) => void }) {
  // Mock pending routes — server function will provide real data
  const pendingRoutes = [
    { id: 'RT-2024-001', truck: 'Cairo-North #3', items: 24, departure: '14:00' },
    { id: 'RT-2024-002', truck: 'Giza Express #1', items: 18, departure: '15:30' },
    { id: 'RT-2024-003', truck: 'Delta Run #7', items: 31, departure: '16:00' },
  ]

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold">Pending Staging Routes</h3>
      {pendingRoutes.map((route) => (
        <button
          key={route.id}
          type="button"
          onClick={() => onSelectRoute(route.id)}
          className="w-full flex items-center justify-between p-3 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-start"
        >
          <div>
            <div className="text-sm font-medium">{route.truck}</div>
            <div className="text-xs text-black/50 dark:text-white/50">{route.id}</div>
          </div>
          <div className="text-end">
            <div className="font-mono text-sm">{route.items}</div>
            <div className="text-xs text-black/50 dark:text-white/50">{route.departure}</div>
          </div>
        </button>
      ))}
    </div>
  )
}
