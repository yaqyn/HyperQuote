import { Shield, Check, AlertTriangle, HelpCircle } from 'lucide-react'
import type { SupplierTier } from '../../../types/procurement'

interface SupplierTierBadgeProps {
  tier: SupplierTier
}

const TIER_CONFIG: Record<SupplierTier, {
  icon: typeof Shield
  label: string
  classes: string
}> = {
  preferred: {
    icon: Shield,
    label: 'Preferred',
    classes: 'bg-[#2563EB]/10 text-[#2563EB]',
  },
  approved: {
    icon: Check,
    label: 'Approved',
    classes: 'bg-green-500/10 text-green-600',
  },
  conditional: {
    icon: AlertTriangle,
    label: 'Conditional',
    classes: 'bg-yellow-500/10 text-yellow-600',
  },
  new: {
    icon: HelpCircle,
    label: 'New',
    classes: 'bg-black/10 text-black/60',
  },
}

export function SupplierTierBadge({ tier }: SupplierTierBadgeProps) {
  const config = TIER_CONFIG[tier]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.classes}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {config.label}
    </span>
  )
}
