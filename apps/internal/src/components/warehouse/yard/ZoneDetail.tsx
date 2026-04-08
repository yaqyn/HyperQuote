import { Button } from 'react-aria-components'
import { useWarehouseStore } from '../../../stores/warehouse'
import { Button as AppButton } from '../../ui/Button'
import type { YardZone } from '../../../types/warehouse'

interface ZoneDetailProps {
  zone: YardZone
  onClose: () => void
}

function getBarColor(capacityPercent: number): string {
  if (capacityPercent > 80) return '#ef4444'
  if (capacityPercent >= 60) return '#eab308'
  return '#22c55e'
}

function formatDuration(arrivedAt: string): string {
  const ms = Date.now() - new Date(arrivedAt).getTime()
  const mins = Math.floor(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hrs}h ${remainMins}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit' })
}

/**
 * "The Gate" — Zone detail panel.
 * Vehicles in zone as compact list: plate # (mono) + type + arrival time + purpose + status dot.
 * Zone name, capacity bar, inventory summary, last activity.
 */
export function ZoneDetail({ zone, onClose }: ZoneDetailProps) {
  const isAggregate = zone.name.toLowerCase().includes('aggregate')
  const barColor = getBarColor(zone.capacityPercent)

  const vehiclesOnSite = useWarehouseStore((s) => s.vehiclesOnSite)
  const removeVehicle = useWarehouseStore((s) => s.removeVehicle)

  const zoneVehicles = vehiclesOnSite.filter((v) => v.zoneId === zone.id)

  const vehicleTypeLabel: Record<string, string> = {
    truck: 'Truck',
    moffett: 'Moffett',
    crane: 'Crane',
    other: 'Other',
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-white">
      {/* ─── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
          {zone.name}
        </h3>
        <Button
          onPress={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-text-secondary)] cursor-pointer hover:bg-black/[0.02]"
          aria-label="Close zone detail"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Button>
      </div>

      {/* ─── Content ─────────────────────────────────────── */}
      <div className="flex flex-col gap-5 overflow-auto p-4">
        {/* Capacity — large number + bar */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
              Capacity
            </span>
            <span
              className="font-[family-name:var(--font-geist-mono)] tabular-nums text-xl font-bold"
              style={{ color: barColor }}
            >
              {zone.capacityPercent}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(zone.capacityPercent, 100)}%`, background: barColor }}
            />
          </div>
        </div>

        {/* Usage */}
        <DetailRow label="Usage">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-bold">
            {zone.currentUsage}
          </span>
          <span className="text-[var(--color-text-secondary)]"> / </span>
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums font-bold">
            {zone.maxCapacity}
          </span>
        </DetailRow>

        {/* Inventory summary */}
        <DetailRow label="Inventory">
          <span>{zone.inventorySummary}</span>
        </DetailRow>

        {/* Last activity */}
        <DetailRow label="Last Activity">
          <span className="font-[family-name:var(--font-geist-mono)] tabular-nums">
            {zone.lastActivity}
          </span>
        </DetailRow>

        {/* Aggregate note */}
        {isAggregate && (
          <div
            className="rounded-lg px-3 py-2 text-xs font-medium"
            style={{ color: '#a16207', background: 'rgba(234, 179, 8, 0.06)' }}
          >
            Estimated qty: last measurement + inflows - outflows
          </div>
        )}

        {/* ─── Vehicles in Zone ───────────────────────────── */}
        {zoneVehicles.length > 0 && (
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)] mb-2 block">
              Vehicles ({zoneVehicles.length})
            </span>
            <div className="flex flex-col gap-2">
              {zoneVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-sm font-bold text-[var(--color-text-primary)] block truncate">
                      {vehicle.plateNumber}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[var(--color-text-secondary)]">
                        {vehicleTypeLabel[vehicle.vehicleType]}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)]">·</span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-secondary)]">
                        {formatTime(vehicle.arrivedAt)}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-secondary)]">·</span>
                      <span className="font-[family-name:var(--font-geist-mono)] tabular-nums text-[11px] text-[var(--color-text-secondary)]">
                        {formatDuration(vehicle.arrivedAt)}
                      </span>
                    </div>
                  </div>
                  <AppButton
                    variant="ghost"
                    onPress={() => removeVehicle(vehicle.id)}
                  >
                    Release
                  </AppButton>
                </div>
              ))}
            </div>
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
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
        {label}
      </span>
      <div className="text-sm text-[var(--color-text-primary)] mt-0.5">{children}</div>
    </div>
  )
}
