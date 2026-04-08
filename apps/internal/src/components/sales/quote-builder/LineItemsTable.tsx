import { useCallback, useMemo, useRef, useState } from 'react'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Plus } from 'lucide-react'
import type { FreshnessIndicator, MarginThresholds } from '../../../types/sales'
import { CostLookup } from './CostLookup'
import { MarginGuardrails } from './MarginGuardrails'
import { ProductSearchMenu, type CatalogProduct } from './ProductSearchMenu'

export interface LineItemFormValues {
  id: string
  productName: string
  specification: string
  quantity: number
  unit: string
  supplierCost: number
  marginPercent: number
  sellPrice: number
  lineTotal: number
  freshnessIndicator: FreshnessIndicator
  supplierName: string
}

export interface QuoteFormValues {
  lineItems: LineItemFormValues[]
  validityDays: number
  paymentTerms: string
  deliveryMethod: string
  deliveryDate: string
  deliveryWindow: string
  specialInstructions: string
  earlyPaymentDiscount: string
  scheduledSendAt: string | null
  coverNote: string
  sendVia: 'portal' | 'email' | 'both' | null
}

interface LineItemsTableProps {
  marginThresholds: MarginThresholds[]
  defaultCategory?: string
}

function getThresholdsForItem(
  _productName: string,
  thresholds: MarginThresholds[],
): MarginThresholds {
  return thresholds[0] ?? { productCategory: 'default', target: 18, floor: 12, absoluteMin: 8 }
}

function PriceInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const formatted = value.toLocaleString('en-EG', { minimumFractionDigits: 2 })

  return (
    <div className="group/price relative inline-flex items-center justify-end">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={editing ? draft : formatted}
        onFocus={(e) => {
          setDraft(String(value))
          setEditing(true)
          requestAnimationFrame(() => e.target.select())
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          const v = parseFloat(draft.replace(/,/g, ''))
          if (!isNaN(v)) onChange(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') inputRef.current?.blur()
          if (e.key === 'Escape') {
            setEditing(false)
            setDraft('')
            inputRef.current?.blur()
          }
        }}
        className="w-32 h-7 pe-1.5 ps-8 rounded-md bg-black/[0.03] dark:bg-white/[0.04] text-right font-[family-name:var(--font-geist-mono)] text-[14px] tabular-nums text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-shadow"
      />
      <span className="pointer-events-none absolute start-1.5 text-[12px] font-medium text-[var(--color-text-subtle)] opacity-40 group-focus-within/price:opacity-70 transition-opacity">
        EGP
      </span>
    </div>
  )
}

export function LineItemsTable({ marginThresholds }: LineItemsTableProps) {
  const { control, setValue } = useFormContext<QuoteFormValues>()
  const { fields, append } = useFieldArray({ control, name: 'lineItems' })
  const [searchOpen, setSearchOpen] = useState(false)

  const handleAddProduct = (product: CatalogProduct, quantity: number) => {
    const thresholds = getThresholdsForItem(product.name, marginThresholds)
    const margin = thresholds.target
    const sellPrice = Math.round((product.supplierCost / (1 - margin / 100)) * 100) / 100
    append({
      id: product.id,
      productName: product.name,
      specification: product.specification,
      quantity,
      unit: product.unit,
      supplierCost: product.supplierCost,
      marginPercent: margin,
      sellPrice,
      lineTotal: Math.round(sellPrice * quantity * 100) / 100,
      freshnessIndicator: product.freshness as FreshnessIndicator,
      supplierName: product.supplierName,
    })
  }

  const watchedItems = useWatch({ control, name: 'lineItems' })

  const pendingPricingCount = useMemo(
    () => (watchedItems ?? []).filter((item) => !item.supplierCost || item.supplierCost === 0).length,
    [watchedItems],
  )

  const handlePriceChange = (index: number, newPrice: number) => {
    const item = watchedItems?.[index]
    if (!item || !item.supplierCost) return

    // Enforce minimum price floor (cost + absolute minimum margin)
    const thresholds = getThresholdsForItem(item.productName, marginThresholds)
    const minPrice = Math.round((item.supplierCost / (1 - thresholds.absoluteMin / 100)) * 100) / 100
    const price = Math.max(newPrice, minPrice)

    const newMargin = Math.round((1 - item.supplierCost / price) * 10000) / 100
    const newTotal = Math.round(price * item.quantity * 100) / 100

    setValue(`lineItems.${index}.sellPrice`, price)
    setValue(`lineItems.${index}.marginPercent`, newMargin)
    setValue(`lineItems.${index}.lineTotal`, newTotal)
  }

  const handleQtyChange = (index: number, newQty: number) => {
    const item = watchedItems?.[index]
    if (!item) return
    const qty = Math.max(1, newQty)
    setValue(`lineItems.${index}.quantity`, qty)
    setValue(`lineItems.${index}.lineTotal`, Math.round(item.sellPrice * qty * 100) / 100)
  }

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full" role="grid">
          <thead>
            <tr className="border-b border-black/[0.04] dark:border-white/[0.04]">
              {['Material', 'Qty', 'Cost', 'Price', 'Margin', 'Total'].map((h) => (
                <th
                  key={h}
                  className={`pb-2 px-3 text-[12px] font-medium uppercase tracking-widest text-[var(--color-text-subtle)] ${
                    h === 'Material' ? 'text-left' : 'text-right'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const item = watchedItems?.[index]
              const thresholds = getThresholdsForItem(item?.productName ?? '', marginThresholds)
              const hasCost = item?.supplierCost && item.supplierCost > 0

              return (
                <tr
                  key={field.id}
                  className="border-b border-black/[0.02] dark:border-white/[0.02] hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
                >
                  {/* Material + Spec + Unit — read only */}
                  <td className="py-3 px-3">
                    <p className="text-[14px] text-[var(--color-text)]">
                      {item?.productName}
                    </p>
                    <p className="text-[12px] text-[var(--color-text-subtle)] mt-0.5">
                      {item?.specification}
                      {item?.unit && <span className="ml-1">· {item.unit}</span>}
                    </p>
                  </td>

                  {/* Qty — editable */}
                  <td className="py-3 px-3 text-right">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item?.quantity ?? 1}
                      onChange={(e) => {
                        const v = parseInt(e.target.value.replace(/,/g, ''), 10)
                        if (!isNaN(v)) handleQtyChange(index, v)
                      }}
                      onFocus={(e) => e.target.select()}
                      className="w-16 h-7 px-2 rounded-md bg-black/[0.03] dark:bg-white/[0.04] text-right font-[family-name:var(--font-geist-mono)] text-[14px] tabular-nums text-[var(--color-text)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-shadow"
                    />
                  </td>

                  {/* Cost + Freshness — read only */}
                  <td className="py-3 px-3 text-right">
                    {!hasCost ? (
                      <span className="text-[12px] italic text-[var(--color-text-subtle)]">Pending</span>
                    ) : (
                      <span className="flex items-center justify-end gap-1">
                        <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text-muted)]">
                          {item!.supplierCost.toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                        </span>
                        <CostLookup freshness={item?.freshnessIndicator ?? 'missing'} />
                      </span>
                    )}
                  </td>

                  {/* Price — editable with floor enforcement */}
                  <td className="py-3 px-3 text-right">
                    {!hasCost ? (
                      <span className="text-[12px] italic text-[var(--color-text-subtle)]">—</span>
                    ) : (
                      <PriceInput
                        value={item?.sellPrice ?? 0}
                        onChange={(v) => handlePriceChange(index, v)}
                      />
                    )}
                  </td>

                  {/* Margin — calculated, read only */}
                  <td className="py-3 px-3 text-right">
                    {!hasCost ? (
                      <span className="text-[12px] italic text-[var(--color-text-subtle)]">—</span>
                    ) : (
                      <span className="flex items-center justify-end gap-1">
                        <span className="font-[family-name:var(--font-geist-mono)] text-[13px] tabular-nums text-[var(--color-text-muted)]">
                          {(item?.marginPercent ?? 0).toFixed(1)}%
                        </span>
                        <MarginGuardrails
                          marginPercent={item?.marginPercent ?? 0}
                          thresholds={thresholds}
                        />
                      </span>
                    )}
                  </td>

                  {/* Total — calculated, read only */}
                  <td className="py-3 px-3 text-right">
                    {!hasCost ? (
                      <span className="text-[12px] italic text-[var(--color-text-subtle)]">TBD</span>
                    ) : (
                      <span className="font-[family-name:var(--font-geist-mono)] text-[14px] font-medium tabular-nums text-[var(--color-text)]">
                        {(item?.lineTotal ?? 0).toLocaleString('en-EG', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add item button */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="mt-3 self-start flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-primary)] outline-none transition-opacity hover:opacity-70 cursor-pointer"
      >
        <Plus size={14} strokeWidth={1.5} />
        Add item
      </button>

      {/* Product search modal */}
      <ProductSearchMenu
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAddProduct={handleAddProduct}
      />

      {pendingPricingCount > 0 && (
        <div className="mt-4 px-3 py-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
          <p className="text-[12px] text-yellow-700 dark:text-yellow-300">
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">{pendingPricingCount}</span>
            {' '}item{pendingPricingCount > 1 ? 's' : ''} pending pricing — customer will be notified when prices arrive
          </p>
        </div>
      )}
    </div>
  )
}
