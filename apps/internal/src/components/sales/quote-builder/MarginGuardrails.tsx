import type { MarginThresholds } from '../../../types/sales'
import { getMarginLevel } from '../../../types/sales'

interface MarginGuardrailsProps {
  marginPercent: number
  thresholds: MarginThresholds
}

/**
 * Per-line margin indicator (Step 4).
 * Uses getMarginLevel() from types/sales.ts with configurable thresholds from pricing_rules.
 * No hardcoded margin values in this component.
 *
 * Green (>= target): checkmark
 * Yellow (>= floor, < target): warning + "Below target"
 * Red (>= absoluteMin, < floor): alert + "Manager approval required"
 * Blocked (< absoluteMin or negative): stop + "CEO Approval Required" or "Negative margin"
 */
export function MarginGuardrails({ marginPercent, thresholds }: MarginGuardrailsProps) {
  const level = getMarginLevel(marginPercent, thresholds)

  switch (level) {
    case 'green':
      return (
        <div className="flex items-center gap-1" title="At/above target margin">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 7l3 3 5-5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )
    case 'yellow':
      return (
        <div className="flex items-center gap-1" title="Below target">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 4v3M7 9.5v.5" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] text-yellow-700 dark:text-yellow-400">Below target</span>
        </div>
      )
    case 'red':
      return (
        <div className="flex items-center gap-1" title="Manager approval required">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <circle cx="7" cy="7" r="5" stroke="#dc2626" strokeWidth="1.5" />
            <path d="M7 4.5v3M7 9v.5" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] text-red-700 dark:text-red-400">Manager approval required</span>
        </div>
      )
    case 'blocked':
      return (
        <div className="flex items-center gap-1" title={marginPercent < 0 ? 'Negative margin -- cannot save' : 'CEO Approval Required'}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="10" height="10" rx="2" stroke="#dc2626" strokeWidth="1.5" />
            <path d="M5 5l4 4M9 5l-4 4" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-medium text-red-700 dark:text-red-400">
            {marginPercent < 0 ? 'Negative margin' : 'CEO Approval Required'}
          </span>
        </div>
      )
  }
}
