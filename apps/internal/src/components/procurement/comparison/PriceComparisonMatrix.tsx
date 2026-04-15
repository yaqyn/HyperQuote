import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion } from 'motion/react'
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

  // Collect all unique supplier names for column headers
  const allSuppliers = useMemo(() => {
    const map = new Map<string, string>()
    for (const comp of comparisons) {
      for (const s of comp.suppliers) {
        if (!map.has(s.supplierId)) map.set(s.supplierId, s.supplierName)
      }
    }
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [comparisons])

  // Calculate total cost from selections
  const totalCost = useMemo(() => {
    let total = 0
    for (const comp of comparisons) {
      const splitSource = splits[comp.productId]
      if (splitSource) {
        total += splitSource.allocations.reduce((s, a) => s + a.quantity * a.unitPrice, 0)
      } else {
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
    setSplits((prev) => {
      const next = { ...prev }
      delete next[productId]
      return next
    })
  }

  function handleSplitSource(split: SplitSource) {
    setSplits((prev) => ({ ...prev, [split.productId]: split }))
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
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-black/30 dark:text-white/30">Loading comparisons...</div>
      </div>
    )
  }

  if (comparisons.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-black/30 dark:text-white/30">No supplier responses to compare</div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col gap-px"
    >
      {/* Spreadsheet grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Column headers: empty cell + supplier names */}
          <div className="flex items-end gap-px pb-3">
            {/* Product column header */}
            <div className="w-48 shrink-0 pe-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-black/30 dark:text-white/30">
                Product
              </span>
            </div>
            {/* Supplier column headers */}
            {allSuppliers.map((s) => (
              <div key={s.id} className="flex-1 min-w-[120px] px-2 text-center">
                <span className="text-[11px] font-medium text-black/50 dark:text-white/50 leading-tight">
                  {s.name}
                </span>
              </div>
            ))}
            {/* Split column */}
            <div className="w-16 shrink-0" />
          </div>

          {/* Product rows */}
          {comparisons.map((comp) => (
            <ComparisonRow
              key={comp.productId}
              comparison={comp}
              allSuppliers={allSuppliers}
              selectedSupplierId={selections[comp.productId] ?? null}
              onSelectSupplier={(sid) => handleSelectSupplier(comp.productId, sid)}
              onSplitSource={handleSplitSource}
            />
          ))}
        </div>
      </div>

      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mt-4 flex items-center justify-between rounded-xl bg-white/60 px-6 py-4 dark:bg-white/[0.04]"
      >
        <div>
          <div className="text-[11px] uppercase tracking-wider text-black/30 dark:text-white/30">
            Total ({selectedCount}/{comparisons.length})
          </div>
          <div className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-xl font-semibold tabular-nums text-black dark:text-white">
            {totalCost > 0 ? fmtPrice(totalCost) : '--'}
          </div>
        </div>
        <Button
          onPress={handleCreatePO}
          isDisabled={!allSelected}
          className="rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white outline-none transition-opacity data-[disabled]:opacity-30 data-[hovered]:opacity-90 data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50 data-[focus-visible]:ring-offset-2"
        >
          Create PO(s)
        </Button>
      </motion.div>
    </motion.div>
  )
}
