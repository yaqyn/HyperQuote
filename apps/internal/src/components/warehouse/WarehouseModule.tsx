import { useState } from 'react'
import { Button } from 'react-aria-components'
import { ArrowLeft } from 'lucide-react'
import { useWarehouseStore } from '../../stores/warehouse'
import { WarehouseTabStrip } from './WarehouseTabStrip'
import { WarehouseShortcuts } from './WarehouseShortcuts'
import { ExpectedDeliveriesList } from './receiving/ExpectedDeliveriesList'
import { ActiveReceivingStandard } from './receiving/ActiveReceivingStandard'
import { ActiveReceivingBulk } from './receiving/ActiveReceivingBulk'
import { PutawayWorkflow } from './putaway/PutawayWorkflow'
import { PickQueue } from './picking/PickQueue'
import { DirectedPicking } from './picking/DirectedPicking'
import { StagingLoadView } from './staging/StagingLoadView'
import { LoadVerification } from './staging/LoadVerification'
import { CycleCountList } from './cycle-count/CycleCountList'
import { BlindCountEntry } from './cycle-count/BlindCountEntry'
import { CountReview } from './cycle-count/CountReview'
import { SupervisorApproval } from './cycle-count/SupervisorApproval'
import { InventoryLookup } from './inventory/InventoryLookup'
import { InventoryDetail } from './inventory/InventoryDetail'
import { YardManagement } from './yard/YardManagement'
import type { InventoryItem, CycleCountResult } from '../../types/warehouse'

const BACK_BUTTON_CLASS = 'flex items-center gap-2 min-h-[48px] px-4 py-3 rounded-xl text-[15px] font-semibold text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:bg-black/[0.03] dark:hover:bg-white/[0.03] cursor-pointer outline-none mb-4'

/**
 * Root warehouse module — "The Floor".
 * Shell: shortcuts + tab strip + content area.
 * 5 tabs: Home, Inbound (receiving+putaway), Outbound (picking+staging), Inventory, Yard.
 */
export function WarehouseModule() {
  const activeTab = useWarehouseStore((s) => s.activeTab)

  // Inbound sub-navigation
  const inboundView = useWarehouseStore((s) => s.inboundView)
  const setInboundView = useWarehouseStore((s) => s.setInboundView)
  const activeDeliveryId = useWarehouseStore((s) => s.activeDeliveryId)
  const setActiveDeliveryId = useWarehouseStore((s) => s.setActiveDeliveryId)

  // Outbound sub-navigation
  const outboundView = useWarehouseStore((s) => s.outboundView)
  const setOutboundView = useWarehouseStore((s) => s.setOutboundView)
  const activePickOrderId = useWarehouseStore((s) => s.activePickOrderId)
  const setActivePickOrderId = useWarehouseStore((s) => s.setActivePickOrderId)

  // Inventory state
  const selectedCountId = useWarehouseStore((s) => s.selectedCountId)
  const setSelectedCountId = useWarehouseStore((s) => s.setSelectedCountId)
  const countingItemId = useWarehouseStore((s) => s.countingItemId)
  const setCountingItemId = useWarehouseStore((s) => s.setCountingItemId)

  const [countView, setCountView] = useState<'blind' | 'review' | 'approval'>('blind')
  const [countResults, setCountResults] = useState<CycleCountResult[]>([])
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<InventoryItem | null>(null)

  // ─── Inbound: receiving → putaway sequential flow ─────
  const renderInbound = () => {
    if (inboundView === 'receiving' && activeDeliveryId) {
      return (
        <>
          <div className="px-6 py-4">
            <Button
              onPress={() => {
                setInboundView('list')
                setActiveDeliveryId(null)
              }}
              className={BACK_BUTTON_CLASS}
            >
              <ArrowLeft size={20} strokeWidth={1.5} /> Back to deliveries
            </Button>
          </div>
          <ActiveReceivingStandard
            deliveryId={activeDeliveryId}
            onComplete={() => {
              // Auto-transition: receiving complete → putaway for these items
              setInboundView('putaway')
            }}
          />
        </>
      )
    }

    if (inboundView === 'putaway') {
      return (
        <>
          <div className="px-6 py-4">
            <Button
              onPress={() => {
                setInboundView('list')
                setActiveDeliveryId(null)
              }}
              className={BACK_BUTTON_CLASS}
            >
              <ArrowLeft size={20} strokeWidth={1.5} /> Back to deliveries
            </Button>
          </div>
          <PutawayWorkflow
            deliveryId={activeDeliveryId}
            onComplete={() => {
              setInboundView('list')
              setActiveDeliveryId(null)
            }}
          />
        </>
      )
    }

    // Default: delivery list
    return (
      <ExpectedDeliveriesList
        onSelectDelivery={(id) => {
          setActiveDeliveryId(id)
          setInboundView('receiving')
        }}
      />
    )
  }

  // ─── Outbound: picking → staging sequential flow ──────
  const renderOutbound = () => {
    if (outboundView === 'picking' && activePickOrderId) {
      return (
        <>
          <div className="px-6 py-4">
            <Button
              onPress={() => {
                setOutboundView('queue')
                setActivePickOrderId(null)
              }}
              className={BACK_BUTTON_CLASS}
            >
              <ArrowLeft size={20} strokeWidth={1.5} /> Back to pick queue
            </Button>
          </div>
          <DirectedPicking
            orderId={activePickOrderId}
            maxCapacityKg={25_000}
            onComplete={() => {
              // Auto-transition: picking complete → staging for this order
              setOutboundView('staging')
            }}
            onBack={() => {
              setOutboundView('queue')
              setActivePickOrderId(null)
            }}
          />
        </>
      )
    }

    if (outboundView === 'staging' && activePickOrderId) {
      return (
        <>
          <div className="px-6 py-4">
            <Button
              onPress={() => {
                setOutboundView('queue')
                setActivePickOrderId(null)
              }}
              className={BACK_BUTTON_CLASS}
            >
              <ArrowLeft size={20} strokeWidth={1.5} /> Back to pick queue
            </Button>
          </div>
          <StagingLoadView
            routeId={activePickOrderId}
            onProceedToVerification={() => setOutboundView('verification')}
          />
        </>
      )
    }

    if (outboundView === 'verification' && activePickOrderId) {
      // Compute expected weight from staging plan items (placeholder: 150kg per item × 6 items)
      const ITEM_WEIGHT_KG = 150
      const MOCK_ITEM_COUNT = 6
      return (
        <LoadVerification
          routeId={activePickOrderId}
          items={[]} // Items loaded from server inside the component's own scan step
          expectedWeightKg={ITEM_WEIGHT_KG * MOCK_ITEM_COUNT}
          assignedTruckId={`TRK-${activePickOrderId.slice(-4)}`}
          assignedRoute={activePickOrderId}
          onComplete={() => {
            setOutboundView('queue')
            setActivePickOrderId(null)
          }}
          onBack={() => setOutboundView('staging')}
        />
      )
    }

    // Default: pick queue
    return (
      <PickQueue
        onSelectOrder={(id) => {
          setActivePickOrderId(id)
          setOutboundView('picking')
        }}
      />
    )
  }

  // ─── Inventory detail (item detail view) ──────────────
  if (selectedInventoryItem && activeTab === 'inventory') {
    return (
      <Shell>
        <InventoryDetail
          item={selectedInventoryItem}
          onBack={() => setSelectedInventoryItem(null)}
        />
      </Shell>
    )
  }

  // ─── Inventory → Count detail (master-detail) ────────
  if (countingItemId && activeTab === 'inventory') {
    if (selectedCountId) {
      return (
        <Shell>
          <div className="px-6 py-4">
            <Button
              onPress={() => setSelectedCountId(null)}
              className={BACK_BUTTON_CLASS}
            >
              <ArrowLeft size={20} strokeWidth={1.5} /> Back to list
            </Button>
          </div>
          {countView === 'blind' && (
            <BlindCountEntry
              countId={selectedCountId}
              onSubmitted={(results) => {
                setCountResults(results)
                setCountView('review')
              }}
              onBack={() => setSelectedCountId(null)}
            />
          )}
          {countView === 'review' && (
            <CountReview
              results={countResults}
              onApprove={() => {
                setSelectedCountId(null)
                setCountResults([])
                setCountView('blind')
              }}
              onRequestSupervisor={() => setCountView('approval')}
              onBack={() => setSelectedCountId(null)}
            />
          )}
          {countView === 'approval' && (() => {
            // Build supervisor approval data from count results
            const firstResult = countResults[0]
            const totalVariance = countResults.reduce((sum, r) => sum + r.variance, 0)
            const avgVariancePercent = countResults.length > 0
              ? countResults.reduce((sum, r) => sum + r.variancePercent, 0) / countResults.length
              : 0
            // Estimate financial impact at ~EGP 50/unit for mock
            const financialImpact = totalVariance * 50
            return (
              <SupervisorApproval
                approval={{
                  countId: selectedCountId,
                  location: 'WH-A / CEMENT / ROW-1 / Bay 02',
                  productName: firstResult?.productId ?? 'Unknown',
                  systemQty: firstResult?.systemQty ?? 0,
                  initialCount: firstResult?.physicalCount ?? 0,
                  recountQty: firstResult?.physicalCount ?? 0,
                  variance: totalVariance,
                  variancePercent: avgVariancePercent,
                  recentMovements: [
                    { id: 'mv-1', type: 'receive' as const, reference: 'PO-2026-0412', quantity: 200, timestamp: new Date(Date.now() - 2 * 86_400_000).toISOString() },
                    { id: 'mv-2', type: 'pick' as const, reference: 'SO-2026-0089', quantity: -50, timestamp: new Date(Date.now() - 1 * 86_400_000).toISOString() },
                    { id: 'mv-3', type: 'adjustment' as const, reference: 'ADJ-0023', quantity: -5, timestamp: new Date(Date.now() - 3_600_000).toISOString() },
                  ],
                  financialImpact,
                }}
                onComplete={() => {
                  setSelectedCountId(null)
                  setCountResults([])
                  setCountView('blind')
                }}
                onBack={() => setCountView('review')}
              />
            )
          })()}
        </Shell>
      )
    }

    return (
      <Shell>
        <div className="px-6 py-4">
          <Button
            onPress={() => setCountingItemId(null)}
            className={BACK_BUTTON_CLASS}
          >
            <ArrowLeft size={20} strokeWidth={1.5} /> Back to inventory
          </Button>
        </div>
        <CycleCountList
          onNavigate={(countId, view) => {
            setSelectedCountId(countId)
            setCountView(view)
          }}
        />
      </Shell>
    )
  }

  // ─── Tab content ──────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'inbound':
        return renderInbound()
      case 'outbound':
        return renderOutbound()
      case 'inventory':
        return <InventoryLookup onSelectItem={setSelectedInventoryItem} onStartCount={setCountingItemId} />
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

// ─── Shell ──────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <WarehouseShortcuts />
      <WarehouseTabStrip />
      <div className="flex-1 overflow-auto px-6 py-5">
        {children}
      </div>
    </div>
  )
}

