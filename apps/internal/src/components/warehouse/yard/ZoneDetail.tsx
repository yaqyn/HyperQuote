import { Button } from 'react-aria-components'
import type { YardZone } from '../../../types/warehouse'

interface ZoneDetailProps {
  zone: YardZone
  onClose: () => void
}

/** Capacity -> bar color (semantic DATA colors) */
function getBarColor(capacityPercent: number): string {
  if (capacityPercent > 80) return 'bg-red-500'
  if (capacityPercent >= 60) return 'bg-amber-500'
  return 'bg-green-500'
}

/**
 * Side panel when zone tapped.
 * Shows zone name, capacity bar, inventory summary,
 * last activity, capacity usage. For aggregate bins:
 * "Estimated qty" note explaining measurement approach.
 */
export function ZoneDetail({ zone, onClose }: ZoneDetailProps) {
  const isAggregate = zone.name.toLowerCase().includes('aggregate')
  const barColor = getBarColor(zone.capacityPercent)

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          {zone.name}
        </h3>
        <Button
          onPress={onClose}
          className="rounded p-1 text-[var(--color-text-secondary)] cursor-pointer hover:text-[var(--color-text-primary)]"
          aria-label="Close zone detail"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 overflow-auto p-4">
        {/* Capacity bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
            <span>Capacity</span>
            <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium text-[var(--color-text-primary)]">
              {zone.capacityPercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--color-border)]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${Math.min(zone.capacityPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Usage */}
        <DetailRow label="Current Usage">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
            {zone.currentUsage}
          </span>
          <span className="text-[var(--color-text-secondary)]"> / </span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-medium">
            {zone.maxCapacity}
          </span>
        </DetailRow>

        {/* Inventory summary */}
        <DetailRow label="Inventory">
          <span>{zone.inventorySummary}</span>
        </DetailRow>

        {/* Last activity (Geist Mono) */}
        <DetailRow label="Last Activity">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {zone.lastActivity}
          </span>
        </DetailRow>

        {/* Aggregate bin note */}
        {isAggregate && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Estimated qty: last measurement + inflows - outflows
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Detail Row ──────────────────────────────────────────

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-[var(--color-text-secondary)]">{label}</div>
      <div className="text-sm text-[var(--color-text-primary)]">{children}</div>
    </div>
  )
}
