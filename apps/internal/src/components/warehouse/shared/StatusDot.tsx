interface StatusDotProps {
  status: string
  pulse?: boolean
}

/** Status-to-color mapping for delivery/task status indicators */
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-gray-400',
  confirmed: 'bg-blue-500',
  in_transit: 'bg-green-500',
  arrived: 'bg-orange-500',
  receiving: 'bg-yellow-500',
  complete: 'bg-green-500',
  // Generic statuses
  active: 'bg-green-500',
  pending: 'bg-yellow-500',
  blocked: 'bg-red-500',
  paused: 'bg-gray-400',
}

/**
 * Colored dot for delivery/task status.
 * Maps status strings to semantic colors.
 * Optional pulse animation (used for "arrived" status).
 */
export function StatusDot({ status, pulse }: StatusDotProps) {
  const colorClass = STATUS_COLORS[status] ?? 'bg-gray-400'
  const shouldPulse = pulse ?? status === 'arrived'

  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {shouldPulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${colorClass}`}
        />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${colorClass}`} />
    </span>
  )
}
