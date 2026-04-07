import type { SupplierTier } from '../../../types/procurement'

interface SupplierTierBadgeProps {
  tier: SupplierTier
}

const TIER_CONFIG: Record<SupplierTier, {
  label: string
  dotClass: string
  textClass: string
}> = {
  preferred: {
    label: 'Preferred',
    dotClass: 'bg-[#2563EB]',
    textClass: 'text-[#2563EB]',
  },
  approved: {
    label: 'Approved',
    dotClass: 'bg-black dark:bg-white',
    textClass: 'text-black/70 dark:text-white/70',
  },
  conditional: {
    label: 'Conditional',
    dotClass: 'bg-yellow-500',
    textClass: 'text-yellow-600 dark:text-yellow-400',
  },
  new: {
    label: 'New',
    dotClass: 'border border-black/30 dark:border-white/30',
    textClass: 'text-black/40 dark:text-white/40',
  },
}

/**
 * Dot + text label for supplier tier.
 * Preferred = blue dot, Approved = black dot, Conditional = yellow dot, New = dashed/outline dot.
 */
export function SupplierTierBadge({ tier }: SupplierTierBadgeProps) {
  const config = TIER_CONFIG[tier]

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`size-1.5 rounded-full ${config.dotClass}`}
        aria-hidden="true"
      />
      <span className={`text-[11px] font-medium ${config.textClass}`}>
        {config.label}
      </span>
    </span>
  )
}
