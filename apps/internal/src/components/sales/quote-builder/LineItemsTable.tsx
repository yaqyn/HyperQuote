import { useTranslation } from 'react-i18next'
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from 'react-aria-components'
import type { FreshnessIndicator, MarginThresholds } from '../../../types/sales'
import { CostLookup } from './CostLookup'
import { MarginGuardrails } from './MarginGuardrails'

export interface LineItemFormValues {
  id: string
  productName: string
  specification: string
  quantity: number
  unit: string
  supplierCost: number // buffered cost, NEVER raw supplier cost
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
  // In production, this maps product to category via product_categories table.
  // For now, return first matching threshold or a sensible default.
  return thresholds[0] ?? { productCategory: 'default', target: 18, floor: 12, absoluteMin: 8 }
}

export function LineItemsTable({ marginThresholds }: LineItemsTableProps) {
  const { t } = useTranslation('internal')
  const { register, control, setValue } = useFormContext<QuoteFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  // useWatch for reactive margin calculations -- NEVER use watch()
  const watchedItems = useWatch({ control, name: 'lineItems' })

  const handleMarginChange = (index: number, newMargin: number) => {
    const item = watchedItems?.[index]
    if (!item) return
    const cost = item.supplierCost
    if (newMargin >= 100) return // prevent division by zero
    const newSellPrice = Math.round((cost / (1 - newMargin / 100)) * 100) / 100
    const newLineTotal = Math.round(newSellPrice * item.quantity * 100) / 100
    setValue(`lineItems.${index}.sellPrice`, newSellPrice)
    setValue(`lineItems.${index}.lineTotal`, newLineTotal)
  }

  const handleSellPriceChange = (index: number, newSellPrice: number) => {
    const item = watchedItems?.[index]
    if (!item) return
    const cost = item.supplierCost
    if (newSellPrice <= 0) return
    const newMargin = Math.round((1 - cost / newSellPrice) * 10000) / 100
    const newLineTotal = Math.round(newSellPrice * item.quantity * 100) / 100
    setValue(`lineItems.${index}.marginPercent`, newMargin)
    setValue(`lineItems.${index}.lineTotal`, newLineTotal)
  }

  const handleQuantityChange = (index: number, newQty: number) => {
    const item = watchedItems?.[index]
    if (!item) return
    const newLineTotal = Math.round(item.sellPrice * newQty * 100) / 100
    setValue(`lineItems.${index}.lineTotal`, newLineTotal)
  }

  const handleAddRow = () => {
    append({
      id: `new-${Date.now()}`,
      productName: '',
      specification: '',
      quantity: 1,
      unit: 'piece',
      supplierCost: 0,
      marginPercent: 18,
      sellPrice: 0,
      lineTotal: 0,
      freshnessIndicator: 'missing' as FreshnessIndicator,
      supplierName: '',
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-black/70 dark:text-white/70">
        {t('sales.quoteBuilder.steps.lineItems')}
      </h3>
      <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/10">
        <table className="w-full text-sm" role="grid">
          <thead>
            <tr className="border-b border-black/10 bg-black/3 dark:border-white/10 dark:bg-white/3">
              <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">#</th>
              <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Material</th>
              <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Specification</th>
              <th className="px-3 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50">Quantity</th>
              <th className="px-3 py-2 text-start text-xs font-medium text-black/50 dark:text-white/50">Unit</th>
              <th className="px-3 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50">Internal Cost</th>
              <th className="px-3 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50">Margin %</th>
              <th className="px-3 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50">Sell Price</th>
              <th className="px-3 py-2 text-end text-xs font-medium text-black/50 dark:text-white/50">Line Total</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-black/50 dark:text-white/50">Freshness</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-black/50 dark:text-white/50">Margin</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-black/50 dark:text-white/50">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const watched = watchedItems?.[index]
              const thresholds = getThresholdsForItem(watched?.productName ?? '', marginThresholds)

              return (
                <tr
                  key={field.id}
                  className="border-b border-black/5 transition-colors hover:bg-black/[0.02] dark:border-white/5 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-xs text-black/40 dark:text-white/40">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      {...register(`lineItems.${index}.productName`)}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                      placeholder="Material name"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      {...register(`lineItems.${index}.specification`)}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
                      placeholder="Spec"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      {...register(`lineItems.${index}.quantity`, {
                        valueAsNumber: true,
                        onChange: (e) => handleQuantityChange(index, Number(e.target.value)),
                      })}
                      className="w-20 bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums outline-none"
                      min={1}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      {...register(`lineItems.${index}.unit`)}
                      className="w-16 bg-transparent text-sm outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-end text-sm tabular-nums text-black/60 dark:text-white/60">
                    {watched?.supplierCost?.toLocaleString('en-EG', { minimumFractionDigits: 2 }) ?? '0.00'}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.5"
                      {...register(`lineItems.${index}.marginPercent`, {
                        valueAsNumber: true,
                        onChange: (e) => handleMarginChange(index, Number(e.target.value)),
                      })}
                      className="w-16 bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums outline-none"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      {...register(`lineItems.${index}.sellPrice`, {
                        valueAsNumber: true,
                        onChange: (e) => handleSellPriceChange(index, Number(e.target.value)),
                      })}
                      className="w-24 bg-transparent text-end font-[family-name:var(--font-geist-mono)] text-sm tabular-nums outline-none"
                    />
                  </td>
                  <td className="px-3 py-2 font-[family-name:var(--font-geist-mono)] text-end text-sm tabular-nums font-medium">
                    {watched?.lineTotal?.toLocaleString('en-EG', { minimumFractionDigits: 2 }) ?? '0.00'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <CostLookup freshness={watched?.freshnessIndicator ?? 'missing'} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MarginGuardrails
                      marginPercent={watched?.marginPercent ?? 0}
                      thresholds={thresholds}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      className="rounded p-1 text-xs text-black/40 outline-none transition-colors
                        data-[hovered]:bg-red-50 data-[hovered]:text-red-600
                        data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                        dark:text-white/40 dark:data-[hovered]:bg-red-950/30 dark:data-[hovered]:text-red-400"
                      onPress={() => remove(index)}
                      aria-label={`Remove row ${index + 1}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add row actions */}
      <div className="flex items-center gap-2">
        <Button
          className="rounded-md border border-dashed border-black/20 px-3 py-1.5 text-xs font-medium text-black/60 outline-none transition-colors
            data-[hovered]:border-[#2563EB]/40 data-[hovered]:text-[#2563EB]
            data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
            dark:border-white/20 dark:text-white/60 dark:data-[hovered]:border-[#2563EB]/40 dark:data-[hovered]:text-[#2563EB]"
          onPress={handleAddRow}
        >
          + Add Line Item
        </Button>
        <Button
          className="rounded-md border border-dashed border-black/20 px-3 py-1.5 text-xs font-medium text-black/60 outline-none transition-colors
            data-[hovered]:border-[#2563EB]/40 data-[hovered]:text-[#2563EB]
            data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
            dark:border-white/20 dark:text-white/60 dark:data-[hovered]:border-[#2563EB]/40 dark:data-[hovered]:text-[#2563EB]"
          onPress={() => {
            // Placeholder: open catalog import dialog
          }}
        >
          Import from Catalog
        </Button>
        <Button
          className="rounded-md border border-dashed border-black/20 px-3 py-1.5 text-xs font-medium text-black/60 outline-none transition-colors
            data-[hovered]:border-[#2563EB]/40 data-[hovered]:text-[#2563EB]
            data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
            dark:border-white/20 dark:text-white/60 dark:data-[hovered]:border-[#2563EB]/40 dark:data-[hovered]:text-[#2563EB]"
          onPress={() => {
            // Placeholder: open past quote picker
          }}
        >
          Copy from Past Quote
        </Button>
      </div>
    </div>
  )
}
