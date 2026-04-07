import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { getStagingPlan } from '../../../lib/server/warehouse-staging'
import { useWarehouseStore } from '../../../stores/warehouse'
import { ScanInput } from '../shared/ScanInput'
import type { StagingStop, StagingItem } from '../../../types/warehouse'

interface StagingLoadViewProps {
  routeId: string
  onProceedToVerification: () => void
}

/**
 * "The Dock Out" — Staging load view.
 * Order list being staged. Each order: order # + customer + items progress bar.
 * Expandable to show items. LIFO order for proper truck loading.
 * Persists scan progress in Zustand for refresh resilience.
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

  const scannedItemIds = useMemo<Set<string>>(() => {
    if (activeWorkflow?.type === 'staging-load' && activeWorkflow.data.scannedIds) {
      return new Set(activeWorkflow.data.scannedIds as string[])
    }
    return new Set()
  }, [activeWorkflow])

  // LIFO: last delivery stop loaded first
  const stopsInLoadOrder = useMemo(() => {
    if (!data?.stops) return []
    return [...data.stops].sort((a, b) => b.stopNumber - a.stopNumber)
  }, [data?.stops])

  const allItems = useMemo(
    () => stopsInLoadOrder.flatMap((s) => s.items),
    [stopsInLoadOrder],
  )

  const totalItems = allItems.length
  const scannedCount = allItems.filter((i) => scannedItemIds.has(i.id)).length
  const allScanned = totalItems > 0 && scannedCount === totalItems
  const progressPercent = totalItems > 0 ? (scannedCount / totalItems) * 100 : 0

  // Weight calculations
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

  // LIFO order violation check
  const isLoadingOutOfOrder = useMemo(() => {
    if (stopsInLoadOrder.length < 2) return false
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
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
            Staging
          </h2>
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
            Load plan — LIFO order
          </p>
        </div>
        <div className="text-end">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-2xl font-bold text-[var(--color-text-primary)]">
            {scannedCount}
          </span>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {' / '}
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
              {totalItems}
            </span>
          </span>
        </div>
      </div>

      {/* ─── Progress bar ────────────────────────────────── */}
      <div className="h-1.5 w-full rounded-full bg-[var(--color-border)]">
        <div
          className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ─── Loading order warning ───────────────────────── */}
      {isLoadingOutOfOrder && (
        <div className="rounded-xl border border-amber-300 px-4 py-3 text-sm font-medium text-amber-800" style={{ background: 'rgba(245, 158, 11, 0.06)' }}>
          Loading order violation: complete current stop before scanning next.
        </div>
      )}

      {/* ─── Stops ───────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {stopsInLoadOrder.map((stop) => (
          <StopCard
            key={stop.stopNumber}
            stop={stop}
            scannedItemIds={scannedItemIds}
            onItemScan={handleItemScan}
          />
        ))}
      </div>

      {/* ─── Weight Check ────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--color-border)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-4">
          Weight Check
        </p>

        <div className="grid grid-cols-3 gap-6">
          <WeightStat label="Loaded" value={loadedWeightKg} unit="kg" />
          <WeightStat label="Max" value={TRUCK_MAX_CAPACITY_KG} unit="kg" />
          <WeightStat label="Remaining" value={remainingCapacityKg} unit="kg" />
        </div>

        {/* Capacity bar */}
        <div className="mt-4">
          <div className="h-2 w-full rounded-full bg-[var(--color-border)]">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                loadPercentage > 95
                  ? 'bg-red-500'
                  : loadPercentage > 80
                    ? 'bg-amber-500'
                    : 'bg-[#2563EB]'
              }`}
              style={{ width: `${Math.min(loadPercentage, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-end font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)]">
            {loadPercentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* ─── Proceed ─────────────────────────────────────── */}
      <Button
        onPress={onProceedToVerification}
        isDisabled={!allScanned}
        className={`h-16 min-h-[48px] w-full rounded-xl text-base font-bold transition-all active:scale-[0.98] cursor-pointer ${
          allScanned
            ? 'bg-[#2563EB] text-white hover:bg-[#1d4ed8]'
            : 'border-2 border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed'
        }`}
      >
        Proceed to Verification
      </Button>
    </div>
  )
}

// ─── Weight Stat ──────────────────────────────────────────────

function WeightStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
        {label}
      </span>
      <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-lg font-bold text-[var(--color-text-primary)] mt-0.5">
        {value.toLocaleString()}
        <span className="text-xs font-medium text-[var(--color-text-secondary)] ms-1">{unit}</span>
      </p>
    </div>
  )
}

// ─── Stop Card ────────────────────────────────────────────────

interface StopCardProps {
  stop: StagingStop
  scannedItemIds: Set<string>
  onItemScan: (item: StagingItem) => void
}

function StopCard({ stop, scannedItemIds, onItemScan }: StopCardProps) {
  const scannedInStop = stop.items.filter((i) => scannedItemIds.has(i.id)).length
  const allScannedInStop = scannedInStop === stop.items.length
  const stopProgress = stop.items.length > 0 ? (scannedInStop / stop.items.length) * 100 : 0

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        allScannedInStop
          ? 'border-green-200'
          : 'border-[var(--color-border)]'
      }`}
      style={allScannedInStop ? { background: 'rgba(22, 163, 74, 0.03)' } : undefined}
    >
      {/* Stop header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs font-semibold text-[var(--color-text-secondary)]">
              STOP {stop.stopNumber}
            </span>
            {allScannedInStop && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-green-600">
                <path d="M3 7.5L6 10.5L11 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <h3 className="text-sm font-bold text-[var(--color-text-primary)] mt-0.5">
            {stop.customerName}
          </h3>
        </div>
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-semibold text-[var(--color-text-secondary)]">
          {scannedInStop}/{stop.items.length}
        </span>
      </div>

      {/* Stop progress bar */}
      <div className="h-1 w-full rounded-full bg-[var(--color-border)] mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allScannedInStop ? 'bg-green-500' : 'bg-[#2563EB]'}`}
          style={{ width: `${stopProgress}%` }}
        />
      </div>

      {/* Items */}
      <div className="flex flex-col gap-2">
        {stop.items.map((item) => {
          const isScanned = scannedItemIds.has(item.id)
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 min-h-[48px] transition-colors ${
                isScanned ? 'opacity-50' : ''
              }`}
            >
              {/* Status dot */}
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  isScanned ? 'bg-green-500 text-white' : 'border-2 border-[var(--color-border)]'
                }`}
              >
                {isScanned && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Item name */}
              <span className={`flex-1 text-sm ${isScanned ? 'text-[var(--color-text-secondary)] line-through' : 'font-semibold text-[var(--color-text-primary)]'}`}>
                {item.name}
              </span>

              {/* Scan input */}
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
