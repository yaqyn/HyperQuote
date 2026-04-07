interface StatusBadgeProps {
  status: string
  variant?: 'invoice' | 'cheque' | 'dispute' | 'match' | 'recon'
}

type BadgeColor = 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'gray'

/** Tiny dot color per semantic meaning */
const DOT_COLORS: Record<BadgeColor, string> = {
  blue: 'bg-[#2563EB]',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  gray: 'bg-black/30 dark:bg-white/30',
}

/** Text color per semantic meaning */
const TEXT_COLORS: Record<BadgeColor, string> = {
  blue: 'text-[#2563EB]',
  green: 'text-green-700 dark:text-green-400',
  yellow: 'text-yellow-700 dark:text-yellow-400',
  orange: 'text-orange-700 dark:text-orange-400',
  red: 'text-red-700 dark:text-red-400',
  gray: 'text-black/50 dark:text-white/50',
}

const INVOICE_STATUS_MAP: Record<string, BadgeColor> = {
  draft: 'gray',
  sent: 'blue',
  viewed: 'blue',
  partially_paid: 'yellow',
  paid: 'green',
  overdue: 'red',
  collections: 'red',
  disputed: 'orange',
  resolved: 'green',
  adjusted: 'yellow',
  written_off: 'gray',
}

const CHEQUE_STATUS_MAP: Record<string, BadgeColor> = {
  received: 'blue',
  deposited: 'orange',
  cleared: 'green',
  bounced: 'red',
  re_presented: 'yellow',
  written_off: 'gray',
  replaced: 'gray',
}

const DISPUTE_STATUS_MAP: Record<string, BadgeColor> = {
  open: 'red',
  investigating: 'yellow',
  resolved: 'green',
  escalated: 'orange',
}

const MATCH_STATUS_MAP: Record<string, BadgeColor> = {
  matched: 'green',
  within_tolerance: 'yellow',
  exceeds_tolerance: 'red',
  unmatched: 'gray',
}

const RECON_STATUS_MAP: Record<string, BadgeColor> = {
  matched: 'green',
  partially_matched: 'yellow',
  unmatched: 'gray',
  exception: 'red',
}

function getColor(status: string, variant?: string): BadgeColor {
  switch (variant) {
    case 'cheque':
      return CHEQUE_STATUS_MAP[status] ?? 'gray'
    case 'dispute':
      return DISPUTE_STATUS_MAP[status] ?? 'gray'
    case 'match':
      return MATCH_STATUS_MAP[status] ?? 'gray'
    case 'recon':
      return RECON_STATUS_MAP[status] ?? 'gray'
    default:
      return INVOICE_STATUS_MAP[status] ?? 'gray'
  }
}

/**
 * Tiny dot + text label. No background pill.
 * Maps status strings to semantic colors based on variant context.
 */
export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const color = getColor(status, variant)
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TEXT_COLORS[color]}`}>
      <span className={`size-1.5 rounded-full ${DOT_COLORS[color]}`} />
      {label}
    </span>
  )
}
