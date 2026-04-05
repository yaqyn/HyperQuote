import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Slider, SliderTrack, SliderThumb, SliderOutput } from 'react-aria-components'
import type { QuoteItem } from '../../../types/sales'

// ─── Mock Data ───────────────────────────────────────────────

function getMockLineItems(): QuoteItem[] {
  return [
    {
      id: 'qi-1',
      productName: 'Portland Cement CEM I 42.5N',
      specification: '50kg bags',
      quantity: 500,
      unit: 'bag',
      supplierCost: 47.0,
      marginPercent: 18,
      sellPrice: 55.0,
      lineTotal: 27_500,
      freshnessIndicator: 'fresh',
      supplierName: 'Suez Cement',
      customerCounterPrice: 54.0,
    },
    {
      id: 'qi-2',
      productName: 'Steel Rebar 16mm',
      specification: 'Grade 60, 12m',
      quantity: 200,
      unit: 'bundle',
      supplierCost: 3_249.25,
      marginPercent: 12,
      sellPrice: 3_600,
      lineTotal: 720_000,
      freshnessIndicator: 'fresh',
      supplierName: 'Ezz Steel',
      customerCounterPrice: 3_550.0,
    },
    {
      id: 'qi-3',
      productName: 'Concrete Blocks 20cm',
      specification: 'Hollow, load-bearing',
      quantity: 5000,
      unit: 'piece',
      supplierCost: 12.81,
      marginPercent: 20,
      sellPrice: 15.0,
      lineTotal: 75_000,
      freshnessIndicator: 'aging',
      supplierName: 'Arabian Cement',
      customerCounterPrice: null,
    },
  ]
}

// ─── Calculation Helpers ─────────────────────────────────────

function recalculateItem(
  item: QuoteItem,
  newMargin: number,
): { sellPrice: number; lineTotal: number } {
  const sellPrice =
    Math.round(item.supplierCost * (1 + newMargin / 100) * 100) / 100
  const lineTotal = Math.round(sellPrice * item.quantity * 100) / 100
  return { sellPrice, lineTotal }
}

// ─── Component ───────────────────────────────────────────────

interface WhatIfCalculatorProps {
  quoteId: string
  onApplyMargins?: () => void
}

export function WhatIfCalculator({ quoteId, onApplyMargins }: WhatIfCalculatorProps) {
  const { t } = useTranslation('internal')
  const [baseItems] = useState(getMockLineItems)
  const [blanketMargin, setBlanketMargin] = useState(18)
  const [perItemMargins, setPerItemMargins] = useState<Record<string, number>>({})
  const [showPerItem, setShowPerItem] = useState(false)

  // Current quote totals (before what-if)
  const currentSubtotal = useMemo(
    () => baseItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [baseItems],
  )
  const currentVat = Math.round(currentSubtotal * 14) / 100
  const currentTotal = currentSubtotal + currentVat

  // What-if recalculation
  const whatIfResults = useMemo(() => {
    return baseItems.map((item) => {
      const margin = perItemMargins[item.id] ?? blanketMargin
      return { item, margin, ...recalculateItem(item, margin) }
    })
  }, [baseItems, blanketMargin, perItemMargins])

  const newSubtotal = whatIfResults.reduce((sum, r) => sum + r.lineTotal, 0)
  const vatAmount = Math.round(newSubtotal * 14) / 100
  const newTotal = newSubtotal + vatAmount
  const totalCost = baseItems.reduce(
    (sum, item) => sum + item.supplierCost * item.quantity,
    0,
  )
  const newProfit = newSubtotal - totalCost
  const newBlendedMargin =
    totalCost > 0 ? ((newSubtotal - totalCost) / totalCost) * 100 : 0
  const diffFromCurrent = newTotal - currentTotal

  function handlePerItemMarginChange(itemId: string, margin: number) {
    setPerItemMargins((prev) => ({ ...prev, [itemId]: margin }))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
        <h3 className="text-sm font-semibold">
          {t('sales.negotiation.whatIfCalculator', 'What-If Calculator')}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {/* Blanket Margin Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-black/60 dark:text-white/60">
              {t('sales.negotiation.blanketMargin', 'Blanket Margin')}
            </label>
            <span className="font-mono text-sm font-semibold">
              {blanketMargin}%
            </span>
          </div>

          <Slider
            value={blanketMargin}
            onChange={(val: number) => {
              setBlanketMargin(val)
              // Reset per-item overrides when blanket changes
              setPerItemMargins({})
            }}
            minValue={0}
            maxValue={50}
            step={0.5}
            className="w-full"
          >
            <SliderOutput className="sr-only" />
            <SliderTrack className="relative w-full h-2 bg-black/10 dark:bg-white/10 rounded-full">
              <div
                className="absolute h-full bg-[#2563EB] rounded-full"
                style={{ width: `${(blanketMargin / 50) * 100}%` }}
              />
              <SliderThumb className="w-5 h-5 bg-white border-2 border-[#2563EB] rounded-full shadow-sm top-1/2 cursor-grab focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30" />
            </SliderTrack>
          </Slider>

          {/* Exact entry */}
          <input
            type="number"
            value={blanketMargin}
            onChange={(e) => {
              const val = Number.parseFloat(e.target.value)
              if (!Number.isNaN(val) && val >= 0 && val <= 50) {
                setBlanketMargin(val)
                setPerItemMargins({})
              }
            }}
            min={0}
            max={50}
            step={0.5}
            className="w-full font-mono text-sm bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-center"
          />
        </div>

        {/* Results Summary */}
        <div className="space-y-2 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg p-3">
          <div className="flex justify-between text-sm">
            <span className="text-black/60 dark:text-white/60">
              {t('sales.negotiation.newTotal', 'New Total')}
            </span>
            <span className="font-mono font-semibold">
              EGP {newTotal.toLocaleString('en-EG')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-black/60 dark:text-white/60">
              {t('sales.negotiation.newProfit', 'New Profit')}
            </span>
            <span className="font-mono font-semibold">
              EGP {newProfit.toLocaleString('en-EG')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-black/60 dark:text-white/60">
              {t('sales.negotiation.blendedMargin', 'Blended Margin')}
            </span>
            <span className="font-mono font-semibold">
              {newBlendedMargin.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-sm border-t border-black/10 dark:border-white/10 pt-2 mt-2">
            <span className="text-black/60 dark:text-white/60">
              {t('sales.negotiation.vsCurrent', 'vs Current')}
            </span>
            <span
              className={[
                'font-mono font-semibold',
                diffFromCurrent > 0
                  ? 'text-green-600 dark:text-green-400'
                  : diffFromCurrent < 0
                    ? 'text-red-600 dark:text-red-400'
                    : '',
              ].join(' ')}
            >
              {diffFromCurrent >= 0 ? '+' : ''}EGP{' '}
              {diffFromCurrent.toLocaleString('en-EG')}
            </span>
          </div>
        </div>

        {/* Per-Item Adjustments */}
        <div>
          <button
            type="button"
            onClick={() => setShowPerItem(!showPerItem)}
            className="text-xs text-[#2563EB] hover:underline"
          >
            {showPerItem
              ? t('sales.negotiation.hidePerItem', 'Hide per-item adjustments')
              : t('sales.negotiation.showPerItem', 'Per-item adjustments')}
          </button>

          {showPerItem && (
            <div className="mt-3 space-y-3">
              {whatIfResults.map(({ item, margin, sellPrice, lineTotal }) => (
                <div
                  key={item.id}
                  className="border border-black/10 dark:border-white/10 rounded-lg p-3 space-y-2"
                >
                  <div className="text-xs font-medium truncate">
                    {item.productName}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={perItemMargins[item.id] ?? blanketMargin}
                      onChange={(e) => {
                        const val = Number.parseFloat(e.target.value)
                        if (!Number.isNaN(val) && val >= 0 && val <= 50) {
                          handlePerItemMarginChange(item.id, val)
                        }
                      }}
                      min={0}
                      max={50}
                      step={0.5}
                      className="w-20 font-mono text-xs bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-1 text-center"
                    />
                    <span className="text-xs text-black/40 dark:text-white/40">
                      %
                    </span>
                    <span className="flex-1 text-end font-mono text-xs">
                      EGP {sellPrice.toLocaleString('en-EG')}
                    </span>
                  </div>
                  <div className="text-end font-mono text-[11px] text-black/40 dark:text-white/40">
                    Line: EGP {lineTotal.toLocaleString('en-EG')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply Button */}
      <div className="px-4 py-3 border-t border-black/10 dark:border-white/10">
        <button
          type="button"
          onClick={onApplyMargins}
          className="w-full px-4 py-2 text-sm font-medium bg-[#2563EB] text-white rounded-lg hover:bg-[#2563EB]/90 transition-colors"
        >
          {t('sales.negotiation.applyMargins', 'Apply These Margins')}
        </button>
      </div>
    </div>
  )
}
