interface StatusBadgeProps {
  status: string
  variant?: 'invoice' | 'cheque' | 'dispute' | 'match' | 'recon'
}

type BadgeColor = 'blue' | 'green' | 'yellow' | 'orange' | 'red' | 'gray'

const COLOR_STYLES: Record<BadgeColor, string> = {
  blue: 'bg-[#2563EB]/10 text-[#2563EB]',
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  red: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  gray: 'bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60',
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
 * Generic finance status badge.
 * Maps status strings to semantic colors based on variant context.
 */
export function StatusBadge({ status, variant }: StatusBadgeProps) {
  const color = getColor(status, variant)
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_STYLES[color]}`}
    >
      {label}
    </span>
  )
}
