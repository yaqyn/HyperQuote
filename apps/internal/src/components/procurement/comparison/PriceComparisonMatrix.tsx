import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { comparePricing } from '../../../lib/server/procurement-comparison'
import type { PriceComparison, SplitSource } from '../../../types/procurement'
import { ComparisonRow } from './ComparisonRow'

interface PriceComparisonMatrixProps {
  /** Product IDs + quantities to compare */
  items: { productId: string; quantity: number }[]
  /** Navigate to PO creation with selected suppliers */
  onCreatePO?: (selections: Record<string, string>, splits: SplitSource[]) => void
}

export function PriceComparisonMatrix({ items, onCreatePO }: PriceComparisonMatrixProps) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-EG'

  // Selection state: productId -> supplierId
  const [selections, setSelections] = useState<Record<string, string>>({})
  // Split sourcing state: productId -> SplitSource
  const [splits, setSplits] = useState<Record<string, SplitSource>>({})

  // Fetch comparisons for all items
  const queries = items.map((item) =>
    useQuery({
      queryKey: ['compare-pricing', item.productId, item.quantity],
      queryFn: () => comparePricing({ data: { productId: item.productId, qty: item.quantity } }),
      staleTime: 60_000,
    }),
  )

  const isLoading = queries.some((q) => q.isLoading)
  const comparisons: PriceComparison[] = queries
    .map((q) => q.data?.comparisons ?? [])
    .flat()

  // Calculate total cost from selections
  const totalCost = useMemo(() => {
    let total = 0
    for (const comp of comparisons) {
      const splitSource = splits[comp.productId]
      if (splitSource) {
        // Split sourcing: sum of (qty * price) per allocation
        total += splitSource.allocations.reduce((s, a) => s + a.quantity * a.unitPrice, 0)
      } else {
        // Single supplier
        const selectedId = selections[comp.productId]
        const supplier = comp.suppliers.find((s) => s.supplierId === selectedId)
        if (supplier) {
          total += supplier.unitPrice * comp.requestedQty
        }
      }
    }
    return total
  }, [comparisons, selections, splits])

  const selectedCount = Object.keys(selections).length + Object.keys(splits).length
  const allSelected = selectedCount >= comparisons.length

  const fmtPrice = (n: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n)

  function handleSelectSupplier(productId: string, supplierId: string) {
    setSelections((prev) => ({ ...prev, [productId]: supplierId }))
    // Clear any split for this product when single supplier selected
    setSplits((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  function handleSplitSource(split: SplitSource) {
    setSplits((prev) => ({ ...prev, [split.productId]: split }))
    // Clear single selection when split is configured
    setSelections((prev) => {
      const next = { ...prev }
      delete next[split.productId]
      return next
    })
  }

  function handleCreatePO() {
    onCreatePO?.(selections, Object.values(splits))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-black/40 dark:text-white/40">Loading supplier comparisons...</div>
      </div>
    )
  }

  if (comparisons.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-black/40 dark:text-white/40">No supplier responses to compare</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Comparison rows */}
      {comparisons.map((comp) => (
        <ComparisonRow
          key={comp.productId}
          comparison={comp}
          selectedSupplierId={selections[comp.productId] ?? null}
          onSelectSupplier={(sid) => handleSelectSupplier(comp.productId, sid)}
          onSplitSource={handleSplitSource}
        />
      ))}

      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-black/80">
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">
            Total Cost ({selectedCount}/{comparisons.length} items selected)
          </div>
          <div className="mt-1 font-mono text-xl font-semibold text-black dark:text-white">
            {totalCost > 0 ? fmtPrice(totalCost) : '--'}
          </div>
        </div>
        <Button
          onPress={handleCreatePO}
          isDisabled={!allSelected}
          className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Create PO(s) from Selection
        </Button>
      </div>
    </div>
  )
}
