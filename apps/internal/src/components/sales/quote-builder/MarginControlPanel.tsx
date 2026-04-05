import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'react-aria-components'
import type { MarginThresholds } from '../../../types/sales'
import { getMarginLevel } from '../../../types/sales'
import type { LineItemFormValues } from './LineItemsTable'

interface MarginControlPanelProps {
  lineItems: LineItemFormValues[]
  marginThresholds: MarginThresholds[]
  onSetBlanketMargin: (margin: number) => void
}

const QUICK_MARGINS = [15, 18, 20]

function getApprovalStatus(
  blendedMargin: number,
  totalValue: number,
  thresholds: MarginThresholds[],
): { label: string; style: string } {
  // Use first threshold as reference for blended margin approval
  const ref = thresholds[0] ?? { target: 18, floor: 12, absoluteMin: 8 }

  // Margin-based approval
  let marginApproval = 'auto'
  if (blendedMargin < ref.absoluteMin) marginApproval = 'ceo'
  else if (blendedMargin < ref.floor) marginApproval = 'vp'
  else if (blendedMargin < ref.target) marginApproval = 'manager'

  // Value-based approval (EGP thresholds)
  let valueApproval = 'auto'
  if (totalValue > 50_000_000) valueApproval = 'ceo'
  else if (totalValue > 10_000_000) valueApproval = 'director'
  else if (totalValue > 2_500_000) valueApproval = 'manager'

  // Highest required approval wins
  const levels = ['auto', 'manager', 'director', 'vp', 'ceo']
  const highest = levels.indexOf(marginApproval) > levels.indexOf(valueApproval) ? marginApproval : valueApproval

  switch (highest) {
    case 'ceo':
      return { label: 'Needs CEO Approval', style: 'text-red-700 dark:text-red-400' }
    case 'vp':
    case 'director':
      return { label: 'Needs Director/VP Approval', style: 'text-red-700 dark:text-red-400' }
    case 'manager':
      return { label: 'Needs Manager Approval', style: 'text-yellow-700 dark:text-yellow-400' }
    default:
      return { label: 'Auto-approved', style: 'text-green-700 dark:text-green-400' }
  }
}

/**
 * MarginControlPanel -- Right sidebar for the quote builder.
 * Shows overall blended margin (weighted average), target vs actual,
 * approval status, quick adjust buttons, and what-if calculator.
 * All numbers in Geist Mono.
 */
export function MarginControlPanel({
  lineItems,
  marginThresholds,
  onSetBlanketMargin,
}: MarginControlPanelProps) {
  const { t } = useTranslation('internal')
  const [whatIfMargin, setWhatIfMargin] = useState<number>(18)

  // Weighted blended margin calculation
  const totalCost = lineItems.reduce((sum, item) => sum + item.supplierCost * item.quantity, 0)
  const totalRevenue = lineItems.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
  const blendedMargin = totalRevenue > 0
    ? Math.round((1 - totalCost / totalRevenue) * 10000) / 100
    : 0
  const profit = totalRevenue - totalCost

  // Target from thresholds (weighted average of category targets)
  const targetMargin = marginThresholds.length > 0
    ? Math.round(marginThresholds.reduce((sum, t) => sum + t.target, 0) / marginThresholds.length * 100) / 100
    : 18
  const floorMargin = marginThresholds.length > 0
    ? Math.round(marginThresholds.reduce((sum, t) => sum + t.floor, 0) / marginThresholds.length * 100) / 100
    : 12

  const marginLevel = marginThresholds.length > 0
    ? getMarginLevel(blendedMargin, marginThresholds[0])
    : getMarginLevel(blendedMargin, { productCategory: 'default', target: 18, floor: 12, absoluteMin: 8 })

  const approvalStatus = getApprovalStatus(blendedMargin, totalRevenue, marginThresholds)

  // What-if calculator
  const whatIfRevenue = totalCost > 0 ? Math.round(totalCost / (1 - whatIfMargin / 100)) : 0
  const whatIfProfit = whatIfRevenue - totalCost

  const marginIndicatorColor = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
    blocked: 'text-red-600 dark:text-red-400',
  }[marginLevel]

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-black/70 dark:text-white/70">
        Margin Control
      </h3>

      {/* Blended margin */}
      <div className="rounded-lg border border-black/10 p-3 dark:border-white/10">
        <p className="text-xs text-black/40 dark:text-white/40">Blended Margin</p>
        <p className={`font-[family-name:var(--font-geist-mono)] text-2xl font-semibold tabular-nums ${marginIndicatorColor}`}>
          {blendedMargin}%
        </p>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-black/40 dark:text-white/40">Target</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{targetMargin}%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-black/40 dark:text-white/40">Floor</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">{floorMargin}%</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-black/40 dark:text-white/40">Profit</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            EGP {profit.toLocaleString('en-EG', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Approval status */}
      <div className="rounded-lg border border-black/10 p-3 dark:border-white/10">
        <p className="text-xs text-black/40 dark:text-white/40">Approval</p>
        <p className={`text-sm font-medium ${approvalStatus.style}`}>
          {approvalStatus.label}
        </p>
      </div>

      {/* Quick adjust buttons */}
      <div className="flex flex-col gap-2">
        <p className="text-xs text-black/40 dark:text-white/40">Quick Adjust</p>
        <div className="flex gap-2">
          {QUICK_MARGINS.map((m) => (
            <Button
              key={m}
              className="flex-1 rounded-md border border-black/10 px-2 py-1.5 font-[family-name:var(--font-geist-mono)] text-xs font-medium outline-none transition-colors
                data-[hovered]:border-[#2563EB]/40 data-[hovered]:text-[#2563EB]
                data-[focus-visible]:ring-2 data-[focus-visible]:ring-[#2563EB]/50
                dark:border-white/10 dark:data-[hovered]:border-[#2563EB]/40"
              onPress={() => onSetBlanketMargin(m)}
            >
              {m}%
            </Button>
          ))}
        </div>
      </div>

      {/* What-if calculator */}
      <div className="rounded-lg border border-black/10 p-3 dark:border-white/10">
        <p className="mb-2 text-xs font-medium text-black/40 dark:text-white/40">What-If Calculator</p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-black/50 dark:text-white/50" htmlFor="whatif-margin">
            Margin
          </label>
          <input
            id="whatif-margin"
            type="range"
            min={0}
            max={50}
            step={0.5}
            value={whatIfMargin}
            onChange={(e) => setWhatIfMargin(Number(e.target.value))}
            className="flex-1 accent-[#2563EB]"
          />
          <span className="w-12 text-end font-[family-name:var(--font-geist-mono)] text-xs tabular-nums">
            {whatIfMargin}%
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-black/40 dark:text-white/40">Total</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            EGP {whatIfRevenue.toLocaleString('en-EG', { minimumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-black/40 dark:text-white/40">Profit</span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            EGP {whatIfProfit.toLocaleString('en-EG', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>
    </div>
  )
}
