# Phase 21: Dispatch Module - Research

**Researched:** 2026-04-05
**Domain:** MapLibre GL mapping, real-time GPS tracking, route optimization, drag-and-drop dispatch UI
**Confidence:** HIGH

## Summary

The dispatch module is the most map-heavy feature in the internal platform. It requires MapLibre GL with react-map-gl for three distinct map instances (route planning map, live GPS tracking map, POD mini-map), Supabase Realtime Broadcast for GPS pings, React Aria DragAndDrop for route stop reordering, and a VRP optimization API stub. The internal app already has React Aria DnD working (fulfillment kanban in Phase 18) and the portal already has a working MapLibre + react-map-gl DeliveryMap component to reference.

All 11 delivery-domain database tables exist from Phase 13/15 migration (vehicles, drivers, delivery_routes, deliveries, delivery_items, proof_of_delivery, drop_ship_pod, driver_locations partitioned, vehicle_inspections, driver_shifts, load_verifications). The dispatch module is registered in `MODULES` with id `dispatch`, hotkey `D`, and permission `dispatch.read`.

**Primary recommendation:** Build the map infrastructure first (MapLibre + react-map-gl added to internal app, ClientOnly wrapper, MapTiler style), then layer features: route planning with DnD, live GPS map with Realtime Broadcast, POD validation split-view, driver management.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- MapLibre GL + react-map-gl (`react-map-gl/maplibre` import path) for all maps
- ClientOnly wrapper mandatory for all MapLibre instances (SSR crashes without it)
- Supabase Realtime Broadcast (NOT postgres_changes) for GPS pings
- React Aria DragAndDrop for route stop reordering (NOT @dnd-kit or react-beautiful-dnd)
- MapTiler for Arabic map labels
- Supercluster for pin clustering at low zoom levels
- OR-Tools/GraphHopper VRP called as external API -- handle latency gracefully
- Color-coded vehicle pins: yellow=loading, green=transit, blue=at site, red=problem
- Pin design changes based on zoom level (custom MapLibre layer)
- GPS pings: 5s active, 15s en route, 30s idle
- Three driver types: INTERNAL, CONTRACTED, ON_DEMAND
- Equipment-tagged dispatch: Moffett/boom/CDL jobs -> INTERNAL or CONTRACTED only
- Cairo truck ban: 5+ tons auto-blocked 6AM-midnight in Greater Cairo
- Prayer time buffers: 10-15 min around each of 5 daily prayers
- Friday Jumu'ah blackout: 11:30 AM - 1:30 PM
- Khamsin dust storms: block sheet material deliveries above 30 km/h wind

### Claude's Discretion
- Route optimization API stub design (mock VRP response until integration phase)
- Split pane implementation for route planning (left: routes, right: map)
- Geofence radius configuration (spec says 150-300m)
- Auto-confirm rule implementation details for trusted routes
- Map cluster threshold and zoom breakpoints

### Deferred Ideas (OUT OF SCOPE)
- Actual OR-Tools/GraphHopper API integration (Phase 31+ or external integration phase)
- WhatsApp POD flow integration (Phase 27)
- Driver app GPS sending (Phase 24-25)
- Notification delivery to drivers (Phase 27)
- Reports tab (Phase 22 RPT-01 or similar)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISP-01 | Route planning: day-before workflow, drag-and-drop stops, auto-optimize (VRP), constraint enforcement | React Aria DragAndDrop (already working in kanban), VRP stub API, constraint validation utilities (Cairo ban, prayer times, Khamsin), capacity bar visualization |
| DISP-02 | Live GPS map: color-coded vehicle pins, click for details, route lines | MapLibre GL + react-map-gl, Supabase Realtime Broadcast channel, supercluster for clustering, custom pin layers per zoom level, GeoJSON route lines |
| DISP-03 | POD validation: split-view (photo + delivery note), item-by-item confirmation, damage flagging | Split layout with mini-map (MapLibre instance) + POD details panel, proof_of_delivery + delivery_items tables, validation checklist state |
| DISP-04 | Driver management: driver profiles, compliance tracking, performance metrics | drivers table with license_expiry/certifications, compliance blocked-from-dispatch logic, performance aggregation from driver_shifts/deliveries |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Three colors only (white/black/blue #2563EB). Status colors for fleet pins are DATA, not design.
- Spatial glass, not dashboards.
- Geist Mono for ALL numbers (ETA, distance, speed, coordinates, counts).
- React Aria Components, NOT shadcn.
- ClientOnly for maps.
- Motion v12 (`motion/react`).
- `useWatch()` never `watch()`.
- Colors in `:root {}` never `@theme`.
- Arabic-Indic numerals in Arabic context.
- Logical properties only (`ps-4` not `pl-4`).
- Bun (NOT npm).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| maplibre-gl | 5.22.0 | WebGL map rendering | Spec-mandated. Already in portal. Open-source, Arabic label support via MapTiler |
| react-map-gl | 8.1.0 | React bindings for MapLibre | Spec-mandated. Import via `react-map-gl/maplibre`. Already in portal |
| supercluster | 8.0.1 | Point clustering for map pins | Spec-mandated for vehicle pin clustering at low zoom |
| react-aria-components | 1.16.0 | DnD for route stops, all UI primitives | Already in internal app. `useDragAndDrop` proven in fulfillment kanban |
| @supabase/supabase-js | 2.101.1+ | Realtime Broadcast for GPS | Already in internal app. Broadcast channel for GPS, not postgres_changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/supercluster | 7.1.3 | TypeScript types for supercluster | Always alongside supercluster |
| zustand | 5.0.12 | Dispatch module UI state (active tab, selected driver, map viewport) | Already in internal app |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| supercluster | MapLibre native clustering | supercluster gives more control over cluster rendering and interaction |
| Split pane with CSS | allotment/react-split-pane | CSS grid/flexbox with drag-to-resize handle is simpler, no extra dep |

**Installation:**
```bash
bun add maplibre-gl react-map-gl supercluster @types/supercluster
```

**Version verification:** All versions verified against npm registry 2026-04-05. maplibre-gl 5.22.0, react-map-gl 8.1.0, supercluster 8.0.1.

## Architecture Patterns

### Recommended Project Structure
```
apps/internal/src/components/dispatch/
  DispatchModule.tsx          # Tab container (mirrors SalesModule pattern)
  DispatchTabStrip.tsx        # Tab strip component
  DispatchShortcuts.tsx       # M, G+R, G+D, 1-9 shortcuts
  home/
    DispatchHomeView.tsx      # Today's summary cards
  route-planning/
    RoutePlanningView.tsx     # Split pane: left routes + right map
    RouteList.tsx             # Left panel: drivers with route cards
    RouteCard.tsx             # Individual route with capacity bar + stops
    StopItem.tsx              # Draggable stop within route
    UnassignedPool.tsx        # Unassigned deliveries at top
    RoutePlanningMap.tsx      # Right panel: MapLibre map with route lines
    ConstraintValidator.ts    # Cairo ban, prayer times, Khamsin checks
    OptimizeButton.tsx        # Before/after comparison dialog
  live-map/
    LiveMapView.tsx           # Full map + collapsible sidebar
    VehicleMap.tsx            # MapLibre map with GPS pins
    VehiclePin.tsx            # Custom pin component (zoom-adaptive)
    VehiclePopup.tsx          # Click-on-pin info popup
    DriverSidebar.tsx         # Collapsible left sidebar (Teams > Drivers)
    useGPSBroadcast.ts        # Supabase Realtime Broadcast hook
  pod-validation/
    PODValidationView.tsx     # Deliveries list + review screen
    PODReviewSplit.tsx        # Split: mini-map + POD details
    PODMiniMap.tsx            # Small MapLibre for GPS vs expected
    PODChecklist.tsx          # Validation checklist (5 items)
    PODActions.tsx            # Confirm/Flag/Re-deliver/Reject buttons
  driver-management/
    DriverManagementView.tsx  # Driver list + compliance
    DriverList.tsx            # Filterable driver table
    DriverProfileCard.tsx     # Individual driver detail
    ComplianceStatus.tsx      # License/cert expiry tracking
    PerformanceMetrics.tsx    # Scorecard: on-time, POD compliance, damage rate
apps/internal/src/stores/
  dispatch.ts                 # Zustand store for dispatch state
apps/internal/src/lib/
  constraints.ts              # Cairo truck ban, prayer times, Khamsin logic
  server/
    dispatch.ts               # Server functions for dispatch
apps/internal/src/types/
  dispatch.ts                 # TypeScript types for dispatch domain
```

### Pattern 1: Module Tab Container (Existing Pattern)
**What:** Each module uses a Zustand store for active tab + tab-specific state, renders tab content via switch.
**When to use:** Always -- this is the established pattern from SalesModule, WarehouseModule, FinanceModule.
**Example:**
```typescript
// Follows exact pattern from SalesModule.tsx
export function DispatchModule() {
  const activeTab = useDispatchStore((s) => s.activeTab)
  return (
    <div className="flex flex-col h-full">
      <DispatchTabStrip />
      <div className="flex-1 overflow-hidden">
        {activeTab === 'home' && <DispatchHomeView />}
        {activeTab === 'route-planning' && <RoutePlanningView />}
        {activeTab === 'live-map' && <LiveMapView />}
        {activeTab === 'driver-management' && <DriverManagementView />}
        {activeTab === 'delivery-log' && <DeliveryLogView />}
      </div>
    </div>
  )
}
```

### Pattern 2: ClientOnly Map Wrapper (Existing Pattern)
**What:** MapLibre GL crashes during SSR. All map components must be wrapped in `ClientOnly` from `@tanstack/react-start` at the call site.
**When to use:** Every MapLibre map instance (route planning map, live GPS map, POD mini-map).
**Example:**
```typescript
import { ClientOnly } from '@tanstack/react-start'
// In the parent component:
<ClientOnly fallback={<MapSkeleton />}>
  <VehicleMap drivers={drivers} />
</ClientOnly>
```

### Pattern 3: Supabase Realtime Broadcast for GPS
**What:** GPS pings come via Supabase Realtime Broadcast channel (NOT postgres_changes). Broadcast is fire-and-forget, no database writes per ping.
**When to use:** Live GPS tracking map. Driver app sends to broadcast channel, dispatch listens.
**Example:**
```typescript
// useGPSBroadcast.ts
function useGPSBroadcast(supabase: SupabaseClient) {
  const [positions, setPositions] = useState<Map<string, GPSPosition>>(new Map())

  useEffect(() => {
    const channel = supabase.channel('fleet-gps')
      .on('broadcast', { event: 'gps-ping' }, ({ payload }) => {
        setPositions(prev => {
          const next = new Map(prev)
          next.set(payload.driverId, {
            lat: payload.lat,
            lng: payload.lng,
            speed: payload.speed,
            heading: payload.heading,
            timestamp: payload.timestamp,
          })
          return next
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) } // MUST cleanup
  }, [supabase])

  return positions
}
```

### Pattern 4: React Aria DragAndDrop for Route Stops
**What:** Route stops are reorderable within a route and draggable between routes. Uses React Aria `useDragAndDrop` with `GridList`.
**When to use:** Route planning left panel.
**Example:**
```typescript
// Existing pattern from FulfillmentColumn.tsx
const { dragAndDropHooks } = useDragAndDrop({
  acceptedDragTypes: ['route-stop'],
  getItems(keys) {
    return [...keys].map((key) => ({
      'route-stop': String(key),
      'text/plain': String(key),
    }))
  },
  onReorder(e) { /* reorder within same route */ },
  onInsert(e) { /* moved from another route */ },
  onRootDrop(e) { /* dropped from unassigned pool */ },
})
```

### Pattern 5: Constraint Validation Utilities
**What:** Pure functions that check delivery scheduling constraints. No external API calls -- these are local calendar/time calculations.
**When to use:** Route planning constraint enforcement.
**Example:**
```typescript
// constraints.ts
export function isCairoTruckBanViolation(
  weightKg: number,
  scheduledTime: Date,
  isGreaterCairo: boolean,
): boolean {
  if (!isGreaterCairo || weightKg < 5000) return false
  const hour = scheduledTime.getHours()
  return hour >= 6 && hour < 24 // 6AM-midnight banned
}

export function isPrayerTimeConflict(
  scheduledTime: Date,
  prayerTimes: PrayerTime[],
  bufferMinutes = 15,
): PrayerTime | null {
  // Check if time falls within buffer of any prayer
}

export function isFridayJummuahBlocked(scheduledTime: Date): boolean {
  if (scheduledTime.getDay() !== 5) return false // Not Friday
  const hours = scheduledTime.getHours()
  const minutes = scheduledTime.getMinutes()
  const timeInMinutes = hours * 60 + minutes
  return timeInMinutes >= 690 && timeInMinutes <= 810 // 11:30-13:30
}

export function isKhamsinBlocked(
  windSpeedKmh: number,
  hasSheetMaterials: boolean,
): boolean {
  return hasSheetMaterials && windSpeedKmh > 30
}
```

### Anti-Patterns to Avoid
- **Storing GPS pings via postgres_changes:** Too noisy. Use Broadcast channel for live display, batch-write to driver_locations table periodically (server-side).
- **MapLibre without ClientOnly:** Will crash SSR. Always wrap in ClientOnly at the call site.
- **watch() in forms:** Use useWatch() per React 19 rules.
- **Inline map styles with API keys:** Use `import.meta.env.VITE_MAPTILER_KEY` pattern from existing DeliveryMap.
- **Multiple independent map instances sharing state:** Each map should have its own ref. Do not share MapRef between route planning map and live GPS map.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Map rendering | Custom canvas/SVG maps | MapLibre GL + react-map-gl | WebGL rendering, tile management, gestures, projections -- thousands of edge cases |
| Pin clustering | Custom cluster algorithm | supercluster | O(n log n) spatial indexing, zoom-level-aware clustering, battle-tested |
| Drag and drop | Custom mouse/touch event handlers | React Aria useDragAndDrop | Accessibility (keyboard DnD, screen reader announcements), touch support, drop targets |
| Route optimization | Custom TSP/VRP solver | OR-Tools/GraphHopper API stub | NP-hard problem, constraint handling, time windows -- academic-level complexity |
| Prayer time calculation | Manual astronomical calculation | adhan-js or API (aladhan.com) | Islamic prayer times involve complex astronomical formulas. BUT: for v1, static prayer time tables per governorate are acceptable as a stub |
| GeoJSON route lines | Manual coordinate manipulation | MapLibre Source + Layer | Native GeoJSON rendering with styling, dasharray for completed/remaining segments |

**Key insight:** Maps are deceptively complex. Every interaction (pan, zoom, click, hover, cluster expansion) has edge cases. Use the established libraries and compose them -- don't try to build map primitives.

## Common Pitfalls

### Pitfall 1: MapLibre v5 Breaking Changes
**What goes wrong:** v5 changed `canvasContextAttributes` and `on()` returns Subscription objects instead of void.
**Why it happens:** Code written for v4 or tutorials referencing older API.
**How to avoid:** Use react-map-gl 8.x which abstracts these differences. For direct MapLibre API access, check the v5 migration guide.
**Warning signs:** TypeScript errors on map event handlers, canvas rendering issues.

### Pitfall 2: Broadcast Channel Subscription Leak
**What goes wrong:** Not unsubscribing from Supabase Realtime channels causes connection limit exhaustion.
**Why it happens:** Missing cleanup in useEffect, or component unmounts without cleanup.
**How to avoid:** Always `supabase.removeChannel(channel)` in useEffect cleanup. One channel per map view, not per pin.
**Warning signs:** Console warnings about channel limits, growing memory usage.

### Pitfall 3: Too Many Re-renders from GPS Updates
**What goes wrong:** GPS pings every 5 seconds for 20+ vehicles = 240+ state updates per minute, causing React to thrash.
**Why it happens:** Each ping triggers a full component re-render including the map.
**How to avoid:** Store positions in a ref or mutable Map, update MapLibre sources directly via `map.getSource('vehicles').setData(geojson)` instead of React state. Throttle React state updates to once per second max.
**Warning signs:** Sluggish map, dropped frames, high CPU usage.

### Pitfall 4: DnD Between Multiple Lists
**What goes wrong:** Dragging a stop from one route to another fails because React Aria DnD needs both lists to share the same drag type.
**Why it happens:** Each route card has its own GridList with useDragAndDrop -- they need compatible `acceptedDragTypes`.
**How to avoid:** Use a consistent drag type string (e.g., `'route-stop'`) across all route GridLists and the unassigned pool. Use `onInsert` for cross-list drops, `onReorder` for same-list reorder.
**Warning signs:** Drop targets not highlighting, items disappearing on drop.

### Pitfall 5: Cairo Truck Ban Time Zone
**What goes wrong:** Time checks use UTC instead of Africa/Cairo timezone, causing ban enforcement to be off by 2-3 hours.
**Why it happens:** JavaScript Date works in local timezone or UTC. Server may be in different timezone.
**How to avoid:** Always convert to `Africa/Cairo` timezone before checking truck ban hours: `new Intl.DateTimeFormat('en', { timeZone: 'Africa/Cairo', hour: 'numeric' })`.
**Warning signs:** Deliveries scheduled at 5AM Cairo time being blocked (UTC would be 3AM).

### Pitfall 6: Map Style Loading Race
**What goes wrong:** Adding sources/layers before the map style has loaded causes silent failures.
**Why it happens:** MapLibre loads styles asynchronously. Code that runs on component mount may execute before style is ready.
**How to avoid:** Use the `onLoad` callback on the Map component before programmatically adding sources. react-map-gl's declarative `<Source>` and `<Layer>` components handle this automatically.
**Warning signs:** Route lines or pins not appearing on first render, appearing after pan/zoom.

## Code Examples

### Vehicle Pin Layer with Zoom-Adaptive Styling
```typescript
// VehicleMap.tsx - Custom vehicle pins using MapLibre data-driven styling
import Map, { Source, Layer } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification } from 'maplibre-gl'

const STATUS_COLORS: Record<string, string> = {
  loading: '#EAB308',   // yellow
  transit: '#22C55E',   // green
  at_site: '#2563EB',   // blue
  delivered: '#16A34A', // checkmark green
  problem: '#EF4444',   // red
  offline: '#9CA3AF',   // grey
}

// Data-driven circle layer -- color by status, size by zoom
const vehicleCircleLayer: CircleLayerSpecification = {
  id: 'vehicle-circles',
  type: 'circle',
  source: 'vehicles',
  filter: ['!', ['has', 'point_count']], // exclude clusters
  paint: {
    'circle-color': [
      'match', ['get', 'status'],
      'loading', STATUS_COLORS.loading,
      'transit', STATUS_COLORS.transit,
      'at_site', STATUS_COLORS.at_site,
      'delivered', STATUS_COLORS.delivered,
      'problem', STATUS_COLORS.problem,
      /* default */ STATUS_COLORS.offline,
    ],
    'circle-radius': [
      'interpolate', ['linear'], ['zoom'],
      8, 6,   // small at low zoom
      14, 12, // larger at high zoom
    ],
    'circle-stroke-color': '#FFFFFF',
    'circle-stroke-width': 2,
  },
}
```

### Supercluster Integration
```typescript
// useClusters.ts
import Supercluster from 'supercluster'
import { useMemo, useRef } from 'react'

interface VehiclePoint {
  driverId: string
  lat: number
  lng: number
  status: string
}

export function useClusters(vehicles: VehiclePoint[], zoom: number, bounds: [number, number, number, number]) {
  const indexRef = useRef<Supercluster>()

  const points = useMemo(() =>
    vehicles.map(v => ({
      type: 'Feature' as const,
      properties: { driverId: v.driverId, status: v.status },
      geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
    })),
    [vehicles],
  )

  if (!indexRef.current) {
    indexRef.current = new Supercluster({ radius: 60, maxZoom: 16 })
  }
  indexRef.current.load(points)

  return indexRef.current.getClusters(bounds, Math.floor(zoom))
}
```

### Route Line with Completed/Remaining Segments
```typescript
// Solid line for completed portion, dashed for remaining
<Source id={`route-${routeId}`} type="geojson" data={completedGeoJSON}>
  <Layer
    id={`route-completed-${routeId}`}
    type="line"
    paint={{
      'line-color': routeColor,
      'line-width': 3,
      'line-opacity': 1,
    }}
  />
</Source>
<Source id={`route-remaining-${routeId}`} type="geojson" data={remainingGeoJSON}>
  <Layer
    id={`route-remaining-${routeId}`}
    type="line"
    paint={{
      'line-color': routeColor,
      'line-width': 3,
      'line-opacity': 0.5,
      'line-dasharray': [2, 2],
    }}
  />
</Source>
```

### Split Pane with Resize Handle
```typescript
// Pure CSS approach -- no extra dependency
function SplitPane({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  const [leftWidth, setLeftWidth] = useState(400)
  const dragging = useRef(false)

  const onMouseDown = () => { dragging.current = true }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    setLeftWidth(Math.max(300, Math.min(600, e.clientX)))
  }
  const onMouseUp = () => { dragging.current = false }

  return (
    <div className="flex h-full" onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
      <div style={{ width: leftWidth }} className="flex-shrink-0 overflow-auto">
        {left}
      </div>
      <div
        className="w-1 cursor-col-resize bg-black/10 dark:bg-white/10 hover:bg-[var(--color-primary)]/30 transition-colors"
        onMouseDown={onMouseDown}
      />
      <div className="flex-1 overflow-hidden">
        {right}
      </div>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Mapbox GL JS | MapLibre GL v5 | 2024+ | Free, open-source, no token required for basic usage. MapTiler for tiles |
| google-maps-react | react-map-gl/maplibre | 2023+ | Declarative React bindings, no Google API costs |
| socket.io for GPS | Supabase Realtime Broadcast | 2024+ | No separate WebSocket server needed, built into Supabase |
| react-beautiful-dnd | React Aria DragAndDrop | 2024 | Accessible by default, maintained, works with React 19 |

**Deprecated/outdated:**
- Mapbox GL JS: Requires paid token. MapLibre is the open-source fork.
- react-beautiful-dnd: Unmaintained since 2024.
- Leaflet: Good but lacks WebGL performance for real-time tracking with many pins.

## Open Questions

1. **VRP API provider**
   - What we know: Spec says OR-Tools or GraphHopper. Both are viable.
   - What's unclear: Which provider to use, self-hosted or cloud API.
   - Recommendation: Build a mock VRP optimizer that returns a shuffled stop order. Wire the real API in a later integration phase. The UI should work with any optimizer that returns `{ optimizedStops[], estimatedDuration, estimatedDistance }`.

2. **Prayer time data source**
   - What we know: 5 daily prayers, times vary by date and location.
   - What's unclear: Whether to use a library (adhan-js) or an API (aladhan.com) or static lookup.
   - Recommendation: For v1, use a static prayer time schedule for Cairo (the primary market). Hardcode approximate times per month. Replace with adhan-js or API in a polish phase.

3. **Weather/Khamsin data source**
   - What we know: Warehouse module already has WeatherAlerts component with Khamsin handling.
   - What's unclear: Whether weather data comes from an API or is manually entered.
   - Recommendation: Reuse the warehouse WeatherAlert pattern. For v1, mock weather data. The constraint validator just needs `windSpeedKmh` as input -- the data source is separate.

4. **Map tile provider for development**
   - What we know: MapTiler API key needed for Arabic labels. Fallback demo tiles exist.
   - What's unclear: Whether VITE_MAPTILER_KEY is configured in the dev environment.
   - Recommendation: Use the same fallback pattern from DeliveryMap.tsx: MapTiler if key present, OSM demo tiles otherwise.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| maplibre-gl | All maps | Needs install | 5.22.0 (npm) | -- |
| react-map-gl | All maps | Needs install | 8.1.0 (npm) | -- |
| supercluster | Pin clustering | Needs install | 8.0.1 (npm) | MapLibre native clustering |
| Supabase Realtime | GPS broadcast | Available (existing) | 2.101.1+ | Polling fallback |
| MapTiler API key | Arabic map labels | Unknown | -- | OSM demo tiles |
| VITE_MAPTILER_KEY env | Map style URL | Unknown | -- | Demo tiles (no Arabic labels) |

**Missing dependencies with no fallback:**
- maplibre-gl, react-map-gl must be installed in internal app (already in portal)

**Missing dependencies with fallback:**
- MapTiler API key: demo tiles work for development, just no Arabic labels
- supercluster: MapLibre native clustering is a viable alternative

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | apps/internal/vitest.config.ts |
| Quick run command | `cd apps/internal && bun run vitest run --reporter=verbose` |
| Full suite command | `cd apps/internal && bun run vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISP-01a | Cairo truck ban validation | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "cairo truck ban"` | No -- Wave 0 |
| DISP-01b | Prayer time conflict detection | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "prayer time"` | No -- Wave 0 |
| DISP-01c | Khamsin sheet material blocking | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "khamsin"` | No -- Wave 0 |
| DISP-01d | Friday Jumu'ah blackout | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "friday"` | No -- Wave 0 |
| DISP-01e | Equipment-tagged dispatch filtering | unit | `bun run vitest run src/__tests__/constraints.test.ts -t "equipment"` | No -- Wave 0 |
| DISP-02 | GPS broadcast subscription/cleanup | unit | `bun run vitest run src/__tests__/useGPSBroadcast.test.ts` | No -- Wave 0 |
| DISP-03 | POD validation checklist logic | unit | `bun run vitest run src/__tests__/pod-validation.test.ts` | No -- Wave 0 |
| DISP-04 | Compliance blocking logic | unit | `bun run vitest run src/__tests__/driver-compliance.test.ts` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/internal && bun run vitest run --reporter=verbose`
- **Per wave merge:** `cd apps/internal && bun run vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/internal/src/__tests__/constraints.test.ts` -- covers DISP-01a through DISP-01e
- [ ] `apps/internal/src/__tests__/pod-validation.test.ts` -- covers DISP-03
- [ ] `apps/internal/src/__tests__/driver-compliance.test.ts` -- covers DISP-04

## Sources

### Primary (HIGH confidence)
- Existing codebase: `apps/portal/src/components/orders/DeliveryMap.tsx` -- working MapLibre + react-map-gl pattern
- Existing codebase: `apps/internal/src/components/operations/kanban/FulfillmentColumn.tsx` -- working React Aria DnD pattern
- Existing codebase: `apps/internal/src/components/sales/SalesModule.tsx` -- module tab container pattern
- Existing codebase: `supabase/migrations/20260401000015_delivery.sql` -- all 11 delivery domain tables
- npm registry: maplibre-gl 5.22.0, react-map-gl 8.1.0, supercluster 8.0.1 (verified 2026-04-05)

### Secondary (MEDIUM confidence)
- STACK-DECISION.md: maplibre-gl 5.21 + react-map-gl 8.1 specified (minor version bump to 5.22.0)
- CONTEXT.md: comprehensive spec references from FRONTEND.md and BACKEND.md

### Tertiary (LOW confidence)
- VRP optimization API design: mock stub only, real integration deferred
- Prayer time calculation accuracy: static lookup adequate for v1, needs validation against actual prayer times

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified in npm, existing patterns in codebase
- Architecture: HIGH -- follows established module pattern (SalesModule, WarehouseModule)
- Pitfalls: HIGH -- MapLibre SSR crash, broadcast cleanup, GPS re-render performance all documented from first-hand codebase patterns
- Constraints: HIGH -- Cairo truck ban, prayer times, Khamsin all have clear business rules
- VRP optimization: LOW -- mock stub only, real API integration deferred

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (stable libraries, no breaking changes expected)
