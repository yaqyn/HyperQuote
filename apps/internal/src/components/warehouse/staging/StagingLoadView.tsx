import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { getStagingPlan } from '../../../lib/server/warehouse-staging'
import { useWarehouseStore } from '../../../stores/warehouse'
import { ScanInput } from '../shared/ScanInput'
import type { StagingStop, StagingItem } from '../../../types/warehouse'

interface StagingLoadViewProps {
  routeId: string
  onProceedToVerification: () => void
}

/**
 * Staging load view organized by delivery stop in LIFO order
 * (last stop loaded first — items deepest in truck come out first at each stop).
 * Persists scan progress in Zustand activeWorkflow for refresh resilience (Pitfall 6).
 */
export function StagingLoadView({
  routeId,
  onProceedToVerification,
}: StagingLoadViewProps) {
  const { activeWorkflow, setActiveWorkflow } = useWarehouseStore()

  const { data, isLoading } = useQuery({
    queryKey: ['staging-plan', routeId],
    queryFn: () => getStagingPlan({ data: { routeId } }),
    staleTime: 30_000,
  })

  // Restore scanned item IDs from persisted workflow state
  const scannedItemIds = useMemo<Set<string>>(() => {
    if (activeWorkflow?.type === 'staging-load' && activeWorkflow.data.scannedIds) {
      return new Set(activeWorkflow.data.scannedIds as string[])
    }
    return new Set()
  }, [activeWorkflow])

  // LIFO order: reverse stops so last delivery stop is loaded first
  const stopsInLoadOrder = useMemo(() => {
    if (!data?.stops) return []
    return [...data.stops].sort((a, b) => b.stopNumber - a.stopNumber)
  }, [data?.stops])

  // All items flattened for counting
  const allItems = useMemo(
    () => stopsInLoadOrder.flatMap((s) => s.items),
    [stopsInLoadOrder],
  )

  const totalItems = allItems.length
  const scannedCount = allItems.filter((i) => scannedItemIds.has(i.id)).length
  const allScanned = totalItems > 0 && scannedCount === totalItems

  // Weight calculations (mock: ~150kg per item average for building materials)
  const ITEM_WEIGHT_KG = 150
  const TRUCK_MAX_CAPACITY_KG = 25_000
  const loadedWeightKg = scannedCount * ITEM_WEIGHT_KG
  const remainingCapacityKg = TRUCK_MAX_CAPACITY_KG - loadedWeightKg
  const loadPercentage = (loadedWeightKg / TRUCK_MAX_CAPACITY_KG) * 100

  const persistScan = useCallback(
    (newScannedIds: Set<string>) => {
      setActiveWorkflow({
        type: 'staging-load',
        step: 0,
        data: { scannedIds: Array.from(newScannedIds), routeId },
      })
    },
    [setActiveWorkflow, routeId],
  )

  const handleItemScan = useCallback(
    (item: StagingItem) => {
      const updated = new Set(scannedItemIds)
      updated.add(item.id)
      persistScan(updated)
    },
    [scannedItemIds, persistScan],
  )

  // Check loading order: warn if loading out of LIFO sequence
  const isLoadingOutOfOrder = useMemo(() => {
    if (stopsInLoadOrder.length < 2) return false
    // If items from a later-loaded stop are scanned while earlier stop has unscanned items
    for (let i = 0; i < stopsInLoadOrder.length - 1; i++) {
      const currentStop = stopsInLoadOrder[i]
      const nextStop = stopsInLoadOrder[i + 1]
      const currentAllScanned = currentStop.items.every((it) => scannedItemIds.has(it.id))
      const nextHasScanned = nextStop.items.some((it) => scannedItemIds.has(it.id))
      if (!currentAllScanned && nextHasScanned) return true
    }
    return false
  }, [stopsInLoadOrder, scannedItemIds])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--color-text-secondary)]">
        Loading staging plan...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Staging Load Plan
        </h2>
        <span className="text-sm text-[var(--color-text-secondary)]">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
            {scannedCount}
          </span>{' '}
          of{' '}
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
            {totalItems}
          </span>{' '}
          items scanned
        </span>
      </div>

      {/* Loading order warning */}
      {isLoadingOutOfOrder && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Loading order violation: complete current stop before scanning items from the next stop for proper weight distribution.
        </div>
      )}

      {/* Stops in LIFO order (last stop loaded first / reverse delivery order) */}
      <div className="flex flex-col gap-4">
        {stopsInLoadOrder.map((stop) => (
          <StagingStopSection
            key={stop.stopNumber}
            stop={stop}
            scannedItemIds={scannedItemIds}
            onItemScan={handleItemScan}
          />
        ))}
      </div>

      {/* Weight check section */}
      <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">
          Weight Check
        </h3>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-[var(--color-text-secondary)]">Loaded</div>
            <div className="font-mono font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold text-[var(--color-text-primary)]">
              {loadedWeightKg.toLocaleString()} kg
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-secondary)]">Max Capacity</div>
            <div className="font-mono font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold text-[var(--color-text-primary)]">
              {TRUCK_MAX_CAPACITY_KG.toLocaleString()} kg
            </div>
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-secondary)]">Remaining</div>
            <div className="font-mono font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-semibold text-[var(--color-text-primary)]">
              {remainingCapacityKg.toLocaleString()} kg
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-[var(--color-border)]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                loadPercentage > 95
                  ? 'bg-red-500'
                  : loadPercentage > 80
                    ? 'bg-amber-500'
                    : 'bg-[#2563EB]'
              }`}
              style={{ width: `${Math.min(loadPercentage, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-end text-xs font-[family-name:var(--font-geist-mono)] tabular-nums text-[var(--color-text-secondary)]">
            {loadPercentage.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Proceed button */}
      <Button
        onPress={onProceedToVerification}
        isDisabled={!allScanned}
        className={`h-14 min-h-[48px] w-full rounded-xl text-base font-semibold transition-colors cursor-pointer ${
          allScanned
            ? 'bg-[#2563EB] text-white hover:bg-[#1d4ed8]'
            : 'bg-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
        }`}
      >
        Proceed to Verification
      </Button>
    </div>
  )
}

// ─── Stop Section ─────────────────────────────────────────

interface StagingStopSectionProps {
  stop: StagingStop
  scannedItemIds: Set<string>
  onItemScan: (item: StagingItem) => void
}

function StagingStopSection({
  stop,
  scannedItemIds,
  onItemScan,
}: StagingStopSectionProps) {
  const scannedInStop = stop.items.filter((i) => scannedItemIds.has(i.id)).length
  const allScannedInStop = scannedInStop === stop.items.length

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        allScannedInStop
          ? 'border-green-200 bg-green-50/50'
          : 'border-[var(--color-border)] bg-white'
      }`}
    >
      {/* Stop header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-xs text-[var(--color-text-secondary)]">
            Stop{' '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
              {stop.stopNumber}
            </span>
          </span>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
            {stop.customerName}
          </h3>
        </div>
        <span
          className={`text-xs font-medium ${
            allScannedInStop ? 'text-green-600' : 'text-[var(--color-text-secondary)]'
          }`}
        >
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {scannedInStop}/{stop.items.length}
          </span>
        </span>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {stop.items.map((item) => {
          const isScanned = scannedItemIds.has(item.id)
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                isScanned
                  ? 'border-green-200 bg-green-50'
                  : 'border-[var(--color-border)]'
              }`}
            >
              {/* Checkbox / checkmark */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  isScanned ? 'bg-green-500 text-white' : 'border border-[var(--color-border)]'
                }`}
              >
                {isScanned && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M2 6.5L5 9.5L10 3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <div className="text-sm text-[var(--color-text-primary)]">{item.name}</div>
                <div className="text-xs text-[var(--color-text-secondary)]">
                  {isScanned ? 'Scanned' : 'Awaiting scan'}
                </div>
              </div>

              {/* Scan input for unscanned items */}
              {!isScanned && (
                <div className="w-48">
                  <ScanInput
                    label=""
                    expectedValue={item.barcode}
                    onScan={() => onItemScan(item)}
                    size="default"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
