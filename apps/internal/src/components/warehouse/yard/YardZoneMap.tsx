import type { YardZone } from '../../../types/warehouse'

interface YardZoneMapProps {
  zones: YardZone[]
  selectedZoneId: string | null
  onZoneSelect: (zone: YardZone) => void
}

/**
 * Interactive SVG zone visualization per spec section 4.11.
 * Renders yard layout as 4 rows x 2 columns.
 * Zone fill color based on capacityPercent:
 *   green (#22C55E at 20%) for <60%
 *   yellow (#EAB308 at 20%) for 60-80%
 *   red (#EF4444 at 20%) for >80%
 * These are semantic DATA colors (allowed per locked decision).
 * Selected zone has blue (#2563EB) border highlight.
 * Aggregate bins styled differently for bulk storage.
 */
export function YardZoneMap({ zones, selectedZoneId, onZoneSelect }: YardZoneMapProps) {
  // 4 rows x 2 columns grid layout
  const COLS = 2
  const ZONE_W = 280
  const ZONE_H = 120
  const GAP = 16
  const PAD = 20
  const rows = Math.ceil(zones.length / COLS)
  const svgWidth = PAD * 2 + COLS * ZONE_W + (COLS - 1) * GAP
  const svgHeight = PAD * 2 + rows * ZONE_H + (rows - 1) * GAP

  return (
    <div className="w-full overflow-auto">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{ maxHeight: '520px' }}
        role="img"
        aria-label="Yard zone map"
      >
        {zones.map((zone, i) => {
          const col = i % COLS
          const row = Math.floor(i / COLS)
          const x = PAD + col * (ZONE_W + GAP)
          const y = PAD + row * (ZONE_H + GAP)
          const isSelected = zone.id === selectedZoneId
          const isAggregate = zone.name.toLowerCase().includes('aggregate')

          return (
            <ZoneRect
              key={zone.id}
              zone={zone}
              x={x}
              y={y}
              width={ZONE_W}
              height={ZONE_H}
              isSelected={isSelected}
              isAggregate={isAggregate}
              onSelect={() => onZoneSelect(zone)}
            />
          )
        })}
      </svg>
    </div>
  )
}

// ─── Zone Rect ───────────────────────────────────────────

interface ZoneRectProps {
  zone: YardZone
  x: number
  y: number
  width: number
  height: number
  isSelected: boolean
  isAggregate: boolean
  onSelect: () => void
}

/** Capacity -> fill color mapping (semantic DATA colors) */
function getCapacityColor(capacityPercent: number): string {
  if (capacityPercent > 80) return 'rgba(239, 68, 68, 0.2)' // #EF4444 at 20%
  if (capacityPercent >= 60) return 'rgba(234, 179, 8, 0.2)' // #EAB308 at 20%
  return 'rgba(34, 197, 94, 0.2)' // #22C55E at 20%
}

function getCapacityStroke(capacityPercent: number): string {
  if (capacityPercent > 80) return '#EF4444'
  if (capacityPercent >= 60) return '#EAB308'
  return '#22C55E'
}

function ZoneRect({
  zone,
  x,
  y,
  width,
  height,
  isSelected,
  isAggregate,
  onSelect,
}: ZoneRectProps) {
  const fill = getCapacityColor(zone.capacityPercent)
  const stroke = isSelected ? '#2563EB' : getCapacityStroke(zone.capacityPercent)
  const strokeWidth = isSelected ? 3 : 1.5

  return (
    <g
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect() }}
      role="button"
      tabIndex={0}
      aria-label={`${zone.name} — ${zone.capacityPercent}% capacity`}
      style={{ cursor: 'pointer' }}
    >
      {/* Zone background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={isAggregate ? 16 : 8}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />

      {/* Aggregate bin: diagonal hatch pattern overlay */}
      {isAggregate && (
        <>
          <defs>
            <pattern
              id={`hatch-${zone.id}`}
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="8" stroke={stroke} strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={16}
            fill={`url(#hatch-${zone.id})`}
          />
        </>
      )}

      {/* Zone name label */}
      <text
        x={x + width / 2}
        y={y + height / 2 - 14}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-[var(--color-text-primary)]"
        fontSize="13"
        fontWeight="600"
      >
        {zone.name}
      </text>

      {/* Capacity percentage (Geist Mono) */}
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-[var(--color-text-primary)]"
        fontSize="20"
        fontWeight="700"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
      >
        {zone.capacityPercent}%
      </text>

      {/* Usage label */}
      <text
        x={x + width / 2}
        y={y + height / 2 + 32}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-[var(--color-text-secondary)]"
        fontSize="11"
        fontFamily="var(--font-geist-mono), ui-monospace, monospace"
      >
        {zone.currentUsage} / {zone.maxCapacity}
      </text>

      {/* Aggregate estimated qty note */}
      {isAggregate && (
        <text
          x={x + width / 2}
          y={y + height - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-[var(--color-text-secondary)]"
          fontSize="9"
          fontStyle="italic"
        >
          Estimated qty
        </text>
      )}
    </g>
  )
}
