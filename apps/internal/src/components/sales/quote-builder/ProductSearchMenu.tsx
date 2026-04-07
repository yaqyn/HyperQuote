import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from 'react-aria-components'
import { motion, AnimatePresence } from 'motion/react'
import { Search, Plus, X } from 'lucide-react'
import { getProductCatalog } from '../../../lib/server/sales-quotes'

export interface CatalogProduct {
  id: string
  name: string
  specification: string
  unit: string
  category: string
  supplierCost: number
  freshness: 'fresh' | 'aging' | 'stale' | 'missing'
  supplierName: string
}

interface ProductSearchMenuProps {
  isOpen: boolean
  onClose: () => void
  onAddProduct: (product: CatalogProduct, quantity: number) => void
}

export function ProductSearchMenu({ isOpen, onClose, onAddProduct }: ProductSearchMenuProps) {
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['product-catalog'],
    queryFn: () => getProductCatalog({ data: {} }),
    staleTime: 300_000,
    enabled: isOpen,
  })

  const products: CatalogProduct[] = data?.products ?? []

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.specification.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    )
  }, [products, search])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setSearch('')
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg flex flex-col bg-[var(--color-surface)] rounded-2xl shadow-2xl shadow-black/10 border border-black/[0.06] dark:border-white/[0.06] max-h-[70vh] overflow-hidden"
          >
            {/* Search input */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.04]">
              <Search size={16} strokeWidth={1.5} className="text-[var(--color-text-subtle)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent text-[14px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/50"
              />
              <Button
                onPress={onClose}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-subtle)] hover:text-[var(--color-text)] cursor-pointer outline-none"
              >
                <X size={14} strokeWidth={1.5} />
              </Button>
            </div>

            {/* Results */}
            <div className="flex-1 min-h-0 overflow-y-auto" data-module-content>
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-[13px] text-[var(--color-text-subtle)]">
                    {search ? 'No products found' : 'No products available'}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col py-1">
                  {filtered.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        onAddProduct(product, 1)
                        onClose()
                      }}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors outline-none"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[var(--color-text)] truncate">
                            {product.name}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-[var(--color-text-subtle)] shrink-0">
                            {product.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--color-text-subtle)] mt-0.5">
                          {product.specification} · {product.unit}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-[family-name:var(--font-geist-mono)] text-[12px] tabular-nums text-[var(--color-text-muted)]">
                          {product.supplierCost > 0
                            ? product.supplierCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })
                            : 'N/A'}
                        </p>
                      </div>
                      <Plus size={14} strokeWidth={1.5} className="shrink-0 text-[var(--color-text-subtle)]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
