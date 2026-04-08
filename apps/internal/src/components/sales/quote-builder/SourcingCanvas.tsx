/**
 * Dynamic sourcing canvas — wiring board.
 * Items on the left. Warehouse + dynamically added suppliers on the right.
 * "+" button to add a supplier source block with search.
 * SVG bezier curves show connections.
 */
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'

interface SupplierRecord {
  id: string
  name: string
  tier: string
  score: number
  categories: string[]
}

interface SourcingItem {
  productName: string
  quantity: number
  unit: string
  sourceId: string
  stockAvailable: number
  stockWac: number
}

interface SourcingCanvasProps {
  items: SourcingItem[]
  allSuppliers: SupplierRecord[]
  searchSuppliers: (query: string, itemName?: string) => SupplierRecord[]
  onAssignSource: (itemIndex: number, sourceId: string) => void
}

export function SourcingCanvas({ items, allSuppliers, searchSuppliers, onAssignSource }: SourcingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const sourceRefs = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number; isStock: boolean }[]>([])
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null)

  // Dynamic supplier blocks — starts empty, user adds via "+"
  const [activeSupplierIds, setActiveSupplierIds] = useState<string[]>(() => {
    // Auto-add suppliers that already have items assigned
    const ids = new Set<string>()
    items.forEach((item) => {
      if (item.sourceId !== 'warehouse') ids.add(item.sourceId)
    })
    return Array.from(ids)
  })

  // Auto-sync: add any supplier assigned from the form that's not yet on the canvas
  useEffect(() => {
    const assignedIds = new Set<string>()
    items.forEach((item) => {
      if (item.sourceId !== 'warehouse') assignedIds.add(item.sourceId)
    })
    setActiveSupplierIds((prev) => {
      const merged = new Set(prev)
      let changed = false
      assignedIds.forEach((id) => {
        if (!merged.has(id)) { merged.add(id); changed = true }
      })
      return changed ? Array.from(merged) : prev
    })
  }, [items])

  // Search state for adding new supplier
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Search results — relevant to selected item if any
  const selectedItemName = selectedItemIndex !== null ? items[selectedItemIndex]?.productName : undefined
  const searchResults = useMemo(() => {
    if (!showSearch) return []
    return searchSuppliers(searchQuery, selectedItemName)
      .filter((s) => !activeSupplierIds.includes(s.id)) // exclude already added
      .slice(0, 6)
  }, [searchQuery, showSearch, selectedItemName, activeSupplierIds, searchSuppliers])

  // Active supplier records
  const activeSuppliers = useMemo(
    () => activeSupplierIds.map((id) => allSuppliers.find((s) => s.id === id)).filter(Boolean) as SupplierRecord[],
    [activeSupplierIds, allSuppliers],
  )

  // All source IDs (warehouse + active suppliers)
  const allSourceIds = ['warehouse', ...activeSupplierIds]

  // Calculate SVG lines
  const updateLines = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const newLines: typeof lines = []

    items.forEach((item, i) => {
      const itemEl = itemRefs.current[i]
      if (!itemEl) return
      if (!allSourceIds.includes(item.sourceId)) return

      const sourceEl = sourceRefs.current.get(item.sourceId)
      if (!sourceEl) return

      const ir = itemEl.getBoundingClientRect()
      const sr = sourceEl.getBoundingClientRect()

      newLines.push({
        x1: ir.right - rect.left,
        y1: ir.top + ir.height / 2 - rect.top,
        x2: sr.left - rect.left,
        y2: sr.top + sr.height / 2 - rect.top,
        isStock: item.sourceId === 'warehouse',
      })
    })

    setLines(newLines)
  }, [items, allSourceIds])

  useEffect(() => {
    updateLines()
    window.addEventListener('resize', updateLines)
    return () => window.removeEventListener('resize', updateLines)
  }, [updateLines])

  useEffect(() => {
    const t = setTimeout(updateLines, 80)
    return () => clearTimeout(t)
  }, [items, activeSupplierIds, updateLines])

  const handleSourceClick = (sourceId: string) => {
    if (selectedItemIndex === null) return
    // Block warehouse if no stock for this item
    if (sourceId === 'warehouse' && items[selectedItemIndex].stockAvailable <= 0) return
    onAssignSource(selectedItemIndex, sourceId)
    setSelectedItemIndex(null)
  }

  const addSupplier = (supplier: SupplierRecord) => {
    setActiveSupplierIds((prev) => [...prev, supplier.id])
    setShowSearch(false)
    setSearchQuery('')
    // If an item was selected, wire it to this new supplier
    if (selectedItemIndex !== null) {
      onAssignSource(selectedItemIndex, supplier.id)
      setSelectedItemIndex(null)
    }
  }

  const removeSupplier = (supplierId: string) => {
    // Reassign any items from this supplier to warehouse
    items.forEach((item, i) => {
      if (item.sourceId === supplierId) onAssignSource(i, 'warehouse')
    })
    setActiveSupplierIds((prev) => prev.filter((id) => id !== supplierId))
  }

  const countBySource = (sourceId: string) => items.filter((i) => i.sourceId === sourceId).length

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-black/[0.04] px-5 py-3 dark:border-white/[0.04]">
        <h3 className="text-[13px] font-semibold text-[var(--color-text)]">Sourcing Board</h3>
        <p className="mt-0.5 text-[12px] text-black/40 dark:text-white/40">
          {selectedItemIndex !== null
            ? `Select a source for "${items[selectedItemIndex].productName}"`
            : 'Click item → click source to wire'}
        </p>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative flex-1 overflow-y-auto px-4 py-5">
        {/* SVG lines */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
          {lines.map((line, i) => {
            const cx1 = line.x1 + 30
            const cx2 = line.x2 - 30
            return (
              <path
                key={i}
                d={`M ${line.x1} ${line.y1} C ${cx1} ${line.y1}, ${cx2} ${line.y2}, ${line.x2} ${line.y2}`}
                stroke="#2563EB"
                strokeWidth="1.5"
                fill="none"
                strokeDasharray={line.isStock ? 'none' : '4 3'}
                opacity={0.4}
              />
            )
          })}
        </svg>

        <div className="relative flex justify-between gap-6" style={{ zIndex: 2 }}>
          {/* LEFT: Items */}
          <div className="flex w-[42%] flex-col gap-1.5">
            <span className="mb-1 text-[10px] font-medium uppercase tracking-widest text-black/30 dark:text-white/30">Items</span>
            {items.map((item, index) => {
              const isSelected = selectedItemIndex === index
              const isStock = item.sourceId === 'warehouse'

              return (
                <div
                  key={item.productName}
                  ref={(el) => { itemRefs.current[index] = el }}
                  onClick={() => setSelectedItemIndex(isSelected ? null : index)}
                  className={`cursor-pointer rounded-lg px-3 py-2 transition-all ${
                    isSelected
                      ? 'bg-[var(--color-primary)]/[0.08] ring-1 ring-[var(--color-primary)]/30'
                      : isStock
                        ? 'bg-[var(--color-primary)]/[0.03] hover:bg-[var(--color-primary)]/[0.06]'
                        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-text)]">
                    {item.stockAvailable > 0 && (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-primary)]">
                        <path d="M2.5 6.5L8 2l5.5 4.5V13a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6 14V9h4v5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {item.productName}
                  </div>
                  <div className="mt-0.5 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums text-black/40 dark:text-white/40">
                    {item.quantity} {item.unit}
                  </div>
                </div>
              )
            })}
          </div>

          {/* RIGHT: Sources */}
          <div className="flex w-[42%] flex-col gap-1.5">
            <span className="mb-1 text-[10px] font-medium uppercase tracking-widest text-black/30 dark:text-white/30">Sources</span>

            {/* Warehouse — always present */}
            <div
              ref={(el) => { sourceRefs.current.set('warehouse', el) }}
              onClick={() => handleSourceClick('warehouse')}
              className={`rounded-lg bg-[var(--color-primary)]/[0.03] px-3 py-2 transition-all ${
                selectedItemIndex !== null ? 'cursor-pointer hover:ring-1 hover:ring-[var(--color-primary)]/30' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
                <span className="text-[12px] font-medium text-[var(--color-text)]">Warehouse</span>
                {countBySource('warehouse') > 0 && (
                  <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-primary)]">{countBySource('warehouse')}</span>
                )}
              </div>
              <div className="mt-1.5 space-y-0.5">
                {items.map((item) => (
                  <div key={item.productName} className="flex items-center justify-between">
                    <span className="truncate text-[10px] text-black/30 dark:text-white/30">{item.productName.split(' ').slice(0, 2).join(' ')}</span>
                    <span className={`font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums font-medium ${
                      item.stockAvailable >= item.quantity
                        ? 'text-green-600 dark:text-green-400'
                        : item.stockAvailable > 0
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-black/20 dark:text-white/20'
                    }`}>
                      {item.stockAvailable > 0 ? item.stockAvailable : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic supplier blocks */}
            {activeSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                ref={(el) => { sourceRefs.current.set(supplier.id, el) }}
                onClick={() => handleSourceClick(supplier.id)}
                className={`group rounded-lg px-3 py-2 transition-all ${
                  selectedItemIndex !== null ? 'cursor-pointer hover:ring-1 hover:ring-[var(--color-primary)]/30' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20" />
                  <span className="flex-1 text-[12px] font-medium text-[var(--color-text)]">{supplier.name}</span>
                  {countBySource(supplier.id) > 0 && (
                    <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/40 dark:text-white/40">{countBySource(supplier.id)}</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeSupplier(supplier.id) }}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-black/30 hover:text-black/60 dark:text-white/30 dark:hover:text-white/60 transition-opacity"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-0.5 text-[10px] text-black/30 dark:text-white/30">
                  {supplier.tier} · {supplier.score}/100
                </div>
              </div>
            ))}

            {/* Add supplier button / search */}
            {showSearch ? (
              <div className="rounded-lg border border-[var(--color-primary)]/30 bg-white px-3 py-2 dark:bg-black">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery('') } }}
                  placeholder="Search supplier..."
                  autoFocus
                  className="w-full bg-transparent text-[12px] outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                />
                {searchResults.length > 0 && (
                  <div className="mt-2 -mx-1 space-y-0.5">
                    {searchResults.map((sup) => (
                      <button
                        key={sup.id}
                        type="button"
                        onClick={() => addSupplier(sup)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03]"
                      >
                        <span className="flex-1 text-[11px] font-medium text-[var(--color-text)]">{sup.name}</span>
                        <span className="text-[10px] text-black/30 dark:text-white/30">{sup.tier}</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-black/30 dark:text-white/30">{sup.score}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <p className="mt-2 text-[11px] text-black/30 dark:text-white/30">No suppliers found</p>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/[0.08] px-3 py-2.5 text-[12px] text-black/40 transition-colors hover:border-[var(--color-primary)]/30 hover:text-[var(--color-primary)] dark:border-white/[0.08] dark:text-white/40"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                Add Supplier
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-black/[0.04] px-5 py-2.5 dark:border-white/[0.04]">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="text-black/40 dark:text-white/40">
            <span className="font-medium text-[var(--color-primary)]">{countBySource('warehouse')}</span> stock
          </span>
          {activeSuppliers.map((s) => {
            const c = countBySource(s.id)
            return c > 0 ? (
              <span key={s.id} className="text-black/40 dark:text-white/40">
                <span className="font-medium text-[var(--color-text)]">{c}</span> {s.name.split(' ')[0]}
              </span>
            ) : null
          })}
        </div>
      </div>
    </div>
  )
}
