interface StatusDotProps {
  status: string
  pulse?: boolean
}

/** Status-to-color mapping — semantic data colors only */
const STATUS_COLORS: Record<string, string> = {
  // Delivery lifecycle
  scheduled: 'bg-black/30 dark:bg-white/30',
  confirmed: 'bg-[#2563EB]',
  in_transit: 'bg-green-500',
  arrived: 'bg-amber-500',
  receiving: 'bg-amber-500',
  complete: 'bg-green-500',
  // Generic
  active: 'bg-green-500',
  pending: 'bg-amber-500',
  blocked: 'bg-red-500',
  paused: 'bg-black/30 dark:bg-white/30',
}

/**
 * Tiny colored status dot. Semantic data colors only (green/amber/red).
 * Optional pulse for arrived/active states.
 */
export function StatusDot({ status, pulse }: StatusDotProps) {
  const colorClass = STATUS_COLORS[status] ?? 'bg-black/30 dark:bg-white/30'
  const shouldPulse = pulse ?? (status === 'arrived' || status === 'active')

  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {shouldPulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colorClass}`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${colorClass}`} />
    </span>
  )
}
