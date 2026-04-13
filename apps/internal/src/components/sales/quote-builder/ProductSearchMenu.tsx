import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { getProductCatalog } from '../../../lib/server/sales-quotes'
import { SearchMenu } from './SearchMenu'

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
  const { data, isLoading } = useQuery({
    queryKey: ['product-catalog'],
    queryFn: () => getProductCatalog({ data: {} }),
    staleTime: 300_000,
    enabled: isOpen,
  })

  const products: CatalogProduct[] = data?.products ?? []

  return (
    <SearchMenu isOpen={isOpen} onClose={onClose} placeholder="Search products...">
      {(search) => {
        const q = search.toLowerCase()
        const filtered = q
          ? products.filter(
              (p) =>
                p.name.toLowerCase().includes(q) ||
                p.specification.toLowerCase().includes(q) ||
                p.category.toLowerCase().includes(q),
            )
          : products

        if (isLoading) {
          return (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-black/[0.02] dark:bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          )
        }

        if (filtered.length === 0) {
          return (
            <div className="flex items-center justify-center py-12">
              <p className="text-[13px] text-[var(--color-text-subtle)]">
                {search ? 'No products found' : 'No products available'}
              </p>
            </div>
          )
        }

        return (
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
        )
      }}
    </SearchMenu>
  )
}
