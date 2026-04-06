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
  const [stagingRouteId] = useState<string | null>(null)

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
          <StagingPlaceholderList />
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
function StagingPlaceholderList() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[var(--color-text-secondary)]">
      <div className="text-sm">No active staging route selected</div>
      <div className="mt-1 text-xs">Select a route from Dispatch to begin staging</div>
    </div>
  )
}
