import type { YardZone } from '../../../types/warehouse'

interface YardZoneMapProps {
  zones: YardZone[]
  selectedZoneId: string | null
  onZoneSelect: (zone: YardZone) => void
}

/** Capacity -> fill color (semantic DATA colors) */
function getCapacityColor(capacityPercent: number): string {
  if (capacityPercent > 80) return 'rgba(239, 68, 68, 0.08)'
  if (capacityPercent >= 60) return 'rgba(234, 179, 8, 0.06)'
  return 'rgba(22, 163, 94, 0.06)'
}

function getCapacityBarColor(capacityPercent: number): string {
  if (capacityPercent > 80) return '#ef4444'
  if (capacityPercent >= 60) return '#eab308'
  return '#22c55e'
}

/**
 * "The Gate" — CSS grid of zones (not a real map).
 * Each zone: zone name + capacity bar + vehicle count.
 * Zones colored by status (available=empty, occupied=blue tint, full=muted).
 * Selected zone has blue border. Aggregate bins styled differently.
 */
export function YardZoneMap({ zones, selectedZoneId, onZoneSelect }: YardZoneMapProps) {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `repeat(${Math.min(zones.length, 2)}, 1fr)`,
      }}
    >
      {zones.map((zone) => {
        const isSelected = zone.id === selectedZoneId
        const isAggregate = zone.name.toLowerCase().includes('aggregate')
        const barColor = getCapacityBarColor(zone.capacityPercent)

        return (
          <button
            key={zone.id}
            type="button"
            onClick={() => onZoneSelect(zone)}
            className={`flex flex-col gap-3 rounded-xl border-2 p-4 text-start transition-all active:scale-[0.98] min-h-[120px] ${
              isSelected
                ? 'border-[#2563EB]'
                : 'border-[var(--color-border)] hover:border-[var(--color-text-secondary)]'
            }`}
            style={{
              background: isSelected ? 'rgba(37, 99, 235, 0.04)' : getCapacityColor(zone.capacityPercent),
            }}
            aria-label={`${zone.name} -- ${zone.capacityPercent}% capacity`}
          >
            {/* Zone name */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">
                  {zone.name}
                </p>
                {isAggregate && (
                  <span className="text-[9px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Est. qty
                  </span>
                )}
              </div>
            </div>

            {/* Capacity percentage — LARGE MONO */}
            <p
              className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[28px] font-bold leading-tight"
              style={{ color: barColor }}
            >
              {zone.capacityPercent}%
            </p>

            {/* Usage bar */}
            <div>
              <div className="h-1.5 w-full rounded-full bg-[var(--color-border)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(zone.capacityPercent, 100)}%`,
                    background: barColor,
                  }}
                />
              </div>
              <p className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[10px] text-[var(--color-text-secondary)] mt-1">
                {zone.currentUsage} / {zone.maxCapacity}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
