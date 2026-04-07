import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { getCycleCountAssignment, submitCycleCount } from '../../../lib/server/warehouse-count'
import { ScanInput } from '../shared/ScanInput'
import { LargeNumberInput } from '../shared/LargeNumberInput'

interface BlindCountEntryProps {
  countId: string
  onSubmitted: (results: Awaited<ReturnType<typeof submitCycleCount>>['results']) => void
  onBack: () => void
}

interface UnexpectedProduct {
  barcode: string
  productName: string
  physicalCount: number
}

/**
 * "The Audit" — FULL SCREEN single-item focus.
 * Product name centered, location prominent. Large number input for count.
 * NO system quantity visible (blind count). Submit goes to next item.
 * CRITICAL: system quantity is HIDDEN to prevent counting bias.
 */
export function BlindCountEntry({ countId, onSubmitted, onBack }: BlindCountEntryProps) {
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [unexpectedProducts, setUnexpectedProducts] = useState<UnexpectedProduct[]>([])
  const [showAddUnexpected, setShowAddUnexpected] = useState(false)
  const [newBarcode, setNewBarcode] = useState('')
  const [newProductName, setNewProductName] = useState('')
  const [newPhysicalCount, setNewPhysicalCount] = useState(0)

  // SEPARATE query key — NEVER shares cache with inventory queries
  const { data: assignment, isLoading } = useQuery({
    queryKey: ['cycleCount', 'assignment', countId],
    queryFn: () => getCycleCountAssignment({ data: { countId } }),
  })

  const submitMutation = useMutation({
    mutationFn: () =>
      submitCycleCount({
        data: {
          countId,
          counts: (assignment?.items ?? []).map((item) => ({
            productId: item.productId,
            physicalCount: counts[item.productId] ?? 0,
          })),
        },
      }),
    onSuccess: (data) => {
      onSubmitted(data.results)
    },
  })

  const handleLocationScan = useCallback((_scanned: string) => {
    setLocationConfirmed(true)
  }, [])

  const handleCountChange = useCallback((productId: string, value: number) => {
    setCounts((prev) => ({ ...prev, [productId]: value }))
  }, [])

  const handleNextItem = useCallback(() => {
    if (!assignment) return
    if (currentItemIndex < assignment.items.length - 1) {
      setCurrentItemIndex((i) => i + 1)
    }
  }, [assignment, currentItemIndex])

  const handlePrevItem = useCallback(() => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((i) => i - 1)
    }
  }, [currentItemIndex])

  const handleAddUnexpected = useCallback(() => {
    if (!newBarcode.trim() || !newProductName.trim()) return
    setUnexpectedProducts((prev) => [
      ...prev,
      { barcode: newBarcode.trim(), productName: newProductName.trim(), physicalCount: newPhysicalCount },
    ])
    setNewBarcode('')
    setNewProductName('')
    setNewPhysicalCount(0)
    setShowAddUnexpected(false)
  }, [newBarcode, newProductName, newPhysicalCount])

  if (isLoading || !assignment) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[#2563EB]" />
      </div>
    )
  }

  const totalItems = assignment.items.length + unexpectedProducts.length
  const countedItems = Object.keys(counts).length + unexpectedProducts.length
  const currentItem = assignment.items[currentItemIndex]
  const isLastItem = currentItemIndex === assignment.items.length - 1
  const allCounted = countedItems >= totalItems

  // ─── Step 1: Scan Location ──────────────────────────────
  if (!locationConfirmed) {
    return (
      <div className="flex min-h-[calc(100dvh-6rem)] flex-col items-center justify-center gap-8 px-4">
        {/* Back */}
        <div className="absolute top-4 start-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-black/[0.02] active:scale-95 transition-all"
            aria-label="Back"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-2">
            Location
          </p>
          <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[32px] font-bold text-[#2563EB] leading-tight">
            {assignment.locationCode}
          </p>
        </div>

        <div className="w-full max-w-sm">
          <ScanInput
            label="Scan location barcode to start"
            expectedValue={assignment.locationCode}
            onScan={handleLocationScan}
            onMismatch={() => setLocationConfirmed(true)}
            autoFocus
            size="large"
          />
        </div>
      </div>
    )
  }

  // ─── Step 2: FULL SCREEN single-item count ──────────────
  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      {/* Header bar */}
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-black/[0.02] active:scale-95 transition-all"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-bold text-[var(--color-text-primary)]">
              {currentItemIndex + 1}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">of</span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-medium text-[var(--color-text-secondary)]">
              {assignment.items.length}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
              style={{ width: `${((currentItemIndex + 1) / assignment.items.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Location reminder */}
        <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-bold text-[#2563EB]">
          {assignment.locationCode}
        </span>
      </div>

      {/* Current item — FULL SCREEN FOCUS */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.productId}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="flex-1 flex flex-col items-center justify-center gap-8 px-4"
        >
          {/* Product identity — centered */}
          <div className="text-center">
            <p className="text-xl font-bold text-[var(--color-text-primary)]">
              {currentItem.productName}
            </p>
            <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm text-[var(--color-text-secondary)] mt-1">
              {currentItem.sku}
            </p>
            {currentItem.lotNumber && (
              <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xs text-[var(--color-text-secondary)] mt-0.5">
                Lot: {currentItem.lotNumber}
              </p>
            )}
          </div>

          {/* COUNT INPUT — large, centered, NO system quantity visible */}
          <div className="w-full max-w-xs">
            <LargeNumberInput
              label="Physical Count"
              value={counts[currentItem.productId] ?? 0}
              onChange={(val) => handleCountChange(currentItem.productId, val ?? 0)}
              minValue={0}
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={handlePrevItem}
          disabled={currentItemIndex === 0}
          className="flex-1 min-h-[48px] rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)] disabled:opacity-30 transition-colors hover:bg-black/[0.02]"
        >
          Previous
        </button>
        {!isLastItem ? (
          <button
            type="button"
            onClick={handleNextItem}
            className="flex-1 min-h-[48px] rounded-xl bg-[#2563EB] text-sm font-bold text-white hover:bg-[#1d4ed8] transition-colors active:scale-[0.98]"
          >
            Next
          </button>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Unexpected products section */}
      {isLastItem && (
        <div className="mt-4 flex flex-col gap-3">
          {unexpectedProducts.map((up, i) => (
            <div key={`unexpected-${i}`} className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3">
              <span className="text-[10px] font-bold text-amber-700 px-2 py-0.5 rounded-md" style={{ background: 'rgba(234, 179, 8, 0.06)' }}>
                Extra
              </span>
              <span className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">{up.productName}</span>
              <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-bold text-[var(--color-text-primary)]">{up.physicalCount}</span>
            </div>
          ))}

          {!showAddUnexpected ? (
            <button
              type="button"
              onClick={() => setShowAddUnexpected(true)}
              className="min-h-[48px] rounded-xl border border-dashed border-[var(--color-border)] text-sm font-bold text-[#2563EB] hover:bg-black/[0.02] transition-colors"
            >
              + Unexpected Product
            </button>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] p-4 flex flex-col gap-4">
              <ScanInput label="Product Barcode" onScan={(val) => setNewBarcode(val)} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-semibold text-[var(--color-text-secondary)]">Product Name</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="h-14 rounded-xl border border-[var(--color-border)] px-4 text-base"
                  placeholder="Enter product name"
                />
              </div>
              <LargeNumberInput label="Count" value={newPhysicalCount} onChange={(val) => setNewPhysicalCount(val ?? 0)} minValue={0} />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddUnexpected(false)} className="flex-1 min-h-[48px] rounded-xl border border-[var(--color-border)] text-sm font-bold text-[var(--color-text-secondary)]">
                  Cancel
                </button>
                <button type="button" onClick={handleAddUnexpected} className="flex-1 min-h-[48px] rounded-xl bg-[#2563EB] text-white text-sm font-bold">
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      {isLastItem && (
        <button
          type="button"
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending}
          className="mt-4 min-h-[56px] rounded-xl bg-[#2563EB] text-white text-base font-bold hover:bg-[#1d4ed8] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {submitMutation.isPending ? 'Submitting...' : 'Submit Count'}
        </button>
      )}
    </div>
  )
}
