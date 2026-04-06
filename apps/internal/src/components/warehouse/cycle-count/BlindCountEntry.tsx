import { useState, useCallback } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getCycleCountAssignment, submitCycleCount } from '../../../lib/server/warehouse-count'
import { ScanInput } from '../shared/ScanInput'
import { LargeNumberInput } from '../shared/LargeNumberInput'
import { StepIndicator } from '../shared/StepIndicator'

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
 * Blind count entry — CRITICAL: system quantity is HIDDEN.
 * Worker sees only location and product info. No quantities are shown.
 * This prevents bias in the counting process.
 *
 * Step 1: Scan location barcode to confirm worker is at the correct location
 * Step 2: Enter physical count for each product (64dp input for glove use)
 * Optional: Add unexpected products found at location but not in system
 */
export function BlindCountEntry({ countId, onSubmitted, onBack }: BlindCountEntryProps) {
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [unexpectedProducts, setUnexpectedProducts] = useState<UnexpectedProduct[]>([])
  const [showAddUnexpected, setShowAddUnexpected] = useState(false)
  const [newBarcode, setNewBarcode] = useState('')
  const [newProductName, setNewProductName] = useState('')
  const [newPhysicalCount, setNewPhysicalCount] = useState(0)

  // SEPARATE query key — NEVER shares cache with inventory queries (per Pitfall 1)
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

  const handleLocationScan = useCallback(
    (scanned: string) => {
      // Accept scan — in production would validate against assignment locationCode
      setLocationConfirmed(true)
    },
    [],
  )

  const handleCountChange = useCallback(
    (productId: string, value: number) => {
      setCounts((prev) => ({ ...prev, [productId]: value }))
    },
    [],
  )

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
      <div className="flex items-center justify-center h-48">
        <p className="text-[var(--color-text-secondary)] text-sm">Loading assignment...</p>
      </div>
    )
  }

  const totalItems = assignment.items.length + unexpectedProducts.length
  const countedItems = Object.keys(counts).length + unexpectedProducts.length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-[#2563EB] font-medium min-h-[48px] min-w-[48px] flex items-center"
        >
          Back
        </button>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Blind Count</h2>
        <div className="w-12" /> {/* Spacer for centering */}
      </div>

      {/* Location */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm text-[var(--color-text-secondary)] mb-1">Location</p>
        <p className="text-base font-medium text-[var(--color-text-primary)]">
          {assignment.locationCode}
        </p>
      </div>

      {/* Step 1: Scan Location */}
      {!locationConfirmed && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Step 1: Scan location barcode to confirm you are at the correct location
          </p>
          <ScanInput
            label="Scan Location to Start"
            expectedValue={assignment.locationCode}
            onScan={handleLocationScan}
            onMismatch={() => {
              // Allow manual override — scan any value to proceed
              setLocationConfirmed(true)
            }}
            autoFocus
            size="large"
          />
        </div>
      )}

      {/* Step 2: Count products */}
      {locationConfirmed && (
        <div className="flex flex-col gap-6">
          <StepIndicator current={countedItems} total={totalItems} label="step" />

          <p className="text-sm font-medium text-[var(--color-text-primary)]">
            Step 2: Enter physical count for each product
          </p>

          {/* Product count entries — NO system quantity visible anywhere */}
          <div className="flex flex-col gap-4">
            {assignment.items.map((item) => (
              <div
                key={item.productId}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-3"
              >
                <div>
                  <p className="text-base font-medium text-[var(--color-text-primary)]">
                    {item.productName}
                  </p>
                  <p className="font-mono tabular-nums text-sm text-[var(--color-text-secondary)]">
                    SKU: {item.sku}
                  </p>
                  {item.lotNumber && (
                    <p className="font-mono tabular-nums text-xs text-[var(--color-text-secondary)]">
                      Lot: {item.lotNumber}
                    </p>
                  )}
                </div>

                {/* physicalCount input — large 64dp for glove use, NO system quantity displayed */}
                <LargeNumberInput
                  label="Physical Count"
                  value={counts[item.productId] ?? 0}
                  onChange={(val) => handleCountChange(item.productId, val ?? 0)}
                  minValue={0}
                />
              </div>
            ))}

            {/* Unexpected products */}
            {unexpectedProducts.map((up, i) => (
              <div
                key={`unexpected-${i}`}
                className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-medium">
                    Unexpected
                  </span>
                </div>
                <p className="text-base font-medium text-[var(--color-text-primary)]">
                  {up.productName}
                </p>
                <p className="font-mono tabular-nums text-sm text-[var(--color-text-secondary)]">
                  Barcode: {up.barcode}
                </p>
                <p className="font-mono tabular-nums text-sm text-[var(--color-text-primary)]">
                  Count: {up.physicalCount}
                </p>
              </div>
            ))}
          </div>

          {/* Add Unexpected Product */}
          {!showAddUnexpected ? (
            <button
              type="button"
              onClick={() => setShowAddUnexpected(true)}
              className="min-h-[48px] rounded-xl border border-dashed border-[var(--color-border)] text-sm font-medium text-[#2563EB] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              + Add Unexpected Product
            </button>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Add Unexpected Product
              </p>
              <ScanInput
                label="Product Barcode"
                onScan={(val) => setNewBarcode(val)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Product Name
                </label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="h-12 rounded-lg border border-[var(--color-border)] px-3 text-base"
                  placeholder="Enter product name"
                />
              </div>
              <LargeNumberInput
                label="Physical Count"
                value={newPhysicalCount}
                onChange={(val) => setNewPhysicalCount(val ?? 0)}
                minValue={0}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnexpected(false)}
                  className="flex-1 min-h-[48px] rounded-lg border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddUnexpected}
                  className="flex-1 min-h-[48px] rounded-lg bg-[#2563EB] text-white text-sm font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            className="min-h-[48px] rounded-xl bg-[#2563EB] text-white text-base font-medium hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
          >
            {submitMutation.isPending ? 'Submitting...' : 'Submit Count'}
          </button>
        </div>
      )}
    </div>
  )
}
