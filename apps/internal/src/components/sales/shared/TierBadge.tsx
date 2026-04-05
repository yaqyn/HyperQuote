import type { CustomerTier } from '../../../types/sales'

interface TierBadgeProps {
  tier: CustomerTier
}

const TIER_STYLES: Record<CustomerTier, string> = {
  A: 'bg-[#2563EB]/15 text-[#2563EB] border-[#2563EB]/30',
  B: 'bg-black/5 text-black/70 border-black/15 dark:bg-white/10 dark:text-white/70 dark:border-white/15',
  C: 'bg-black/3 text-black/50 border-black/10 dark:bg-white/5 dark:text-white/50 dark:border-white/10',
  new: 'bg-transparent text-black/40 border-black/20 border-dashed dark:text-white/40 dark:border-white/20',
}

export function TierBadge({ tier }: TierBadgeProps) {
  const label = tier === 'new' ? 'NEW' : tier

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium font-[family-name:var(--font-geist-mono)] leading-none ${TIER_STYLES[tier]}`}
    >
      {label}
    </span>
  )
}
