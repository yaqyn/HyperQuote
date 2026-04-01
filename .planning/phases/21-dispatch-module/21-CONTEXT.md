# Phase 21: Dispatch Module

## Goal
Dispatch team can plan routes with constraint enforcement, track drivers in real-time on a map, and validate proof of delivery.

## Dependencies
- Phase 15 (Internal Platform Shell) must be complete
- Phase 13-14 (Database tables) must be complete — deliveries, delivery_items, proof_of_delivery, driver_locations, vehicles, drivers
- Phase 3 (Shared Packages) must be complete

## Requirements

- **DISP-01**: Route planning: day-before workflow, drag-and-drop stops, auto-optimize (OR-Tools/GraphHopper VRP), constraint enforcement (vehicle type, CDL, equipment, Cairo truck ban, prayer times, Khamsin)
- **DISP-02**: Live GPS map: color-coded vehicle pins (yellow=loading, green=transit, blue=at site, red=problem), click for details, route lines
- **DISP-03**: POD validation: split-view (photo + delivery note), item-by-item confirmation, damage flagging
- **DISP-04**: Driver management: driver profiles, compliance tracking (license expiry, certifications), performance metrics

## Success Criteria
1. Route planning supports drag-and-drop stops with auto-optimize (VRP) and enforces Cairo truck ban, prayer times, and Khamsin constraints
2. Live GPS map shows color-coded vehicle pins (yellow=loading, green=transit, blue=at site, red=problem) with route lines
3. POD validation split-view shows photo + delivery note with item-by-item confirmation and damage flagging
4. Driver management tracks license expiry, certifications, and performance metrics

## What to Build
Route planning (drag-and-drop stops, auto-optimize), live GPS map (vehicle pins, clusters, route lines), POD validation (split-view), driver management.

## Spec References

### FRONTEND.md — MODULE 6: LOGISTICS / DISPATCH (Full Spec)

**Primary users:** Dispatcher, Logistics Manager
**Hotkey:** `D`

#### 6.1 Dispatch Home View

**Tabs:** `[Home] [Route Planning] [Live Map] [Driver Management] [Delivery Log] [Reports]`

**Home content:**
- Today's deliveries: count, completed, in progress, pending
- Fleet status: vehicles available, in transit, loading, at site
- Alerts: delayed deliveries, failed deliveries, driver issues
- Weather alerts (Khamsin dust storms, rain warnings affecting sheet materials)

#### 6.2 Route Planning

**Day-before planning workflow:**

1. **Pending deliveries list:** All orders ready for delivery, grouped by region/zone
2. **Assignment interface (left panel: routes, right panel: map):**
   - Left: list of drivers + routes (each with capacity bar: green <70%, yellow 70-90%, red >90%). Each route shows numbered stops with drag handles (Lucide `GripVertical`).
   - Unassigned deliveries pooled at top (order, customer, location, weight, equipment needed).
   - Drag stops within route to reorder. Drag between drivers to reassign. Map updates route lines in real-time.
   - Time windows shown as colored bars: Red if ETA outside window, Yellow if tight (within 10 min of edge).
   - `[Auto-Optimize]` button → shows before/after comparison (total distance, total time, time window violations). Dispatcher can still manually override or lock individual stops.
   - Drag delivery to driver, or click `[Auto-Assign]` for system optimization
3. **Route optimization:** system suggests optimal stop sequence using OR-Tools/GraphHopper VRP
   - Considers: distance, time windows, truck weight limits, equipment requirements, Cairo truck ban
   - Moffett-equipped trucks: 6-10 stops/day. Boom trucks: 3-6 stops/day
4. **Constraints enforced:**
   - Vehicle type must match load requirements
   - CDL/equipment certifications checked against driver profile
   - Equipment-tagged dispatch: Moffett/boom/CDL jobs -> INTERNAL or CONTRACTED only, never ON_DEMAND
   - **Cairo truck ban: heavy trucks (5+ tons) auto-blocked 6AM-midnight in Greater Cairo. System shows alert and moves to 12AM-6AM window. Light deliveries (<5 tons) exempt.**
   - Prayer time buffers: 10-15 min around each of 5 daily prayers
   - Friday Jumu'ah blackout: 11:30 AM - 1:30 PM (no deliveries)
   - Khamsin dust storm: block sheet material deliveries above 30 km/h wind
5. **Driver assignment:**
   - Three-tier: hard constraints (vehicle/CDL/equipment) -> optimization (proximity/route/load balance) -> business rules (internal first, customer preference)
   - Auto-suggest with manual override

**Confirmation:** `[Publish Routes]` -- sends route to each driver's app, notifies customers of delivery windows

#### 6.3 Live GPS Tracking Map

**Color-coded fleet map (MapLibre GL + react-map-gl, client-only with ClientOnly wrapper):**

| Color | Status |
|-------|--------|
| Yellow | Loading / Preparing |
| Green | In Transit |
| Blue | At Delivery Site |
| Checkmark Green | Delivered (confirmed) |
| Red | Problem (delay, damage, customer unavailable) |

**Vehicle pin design:**
- Moving: green circle with directional arrow showing heading
- Idle: orange/yellow circle (engine on, not moving)
- Stopped: red circle (engine off)
- No GPS / Offline: grey circle with "?" or slash
- At high zoom: pin shows vehicle icon (truck/van silhouette)
- At low zoom: pins cluster into numbered circles ("12 vehicles")

**Vehicle info popup (click on pin):**
- Vehicle ID + driver name
- Speed + heading
- Status: In Transit / At Stop / Returning
- Current stop: X of Y
- Next stop: location name + ETA (Geist Mono)
- Contact buttons: `[Call Driver]` `[Message]`
- `[View Route]` `[Details]`

**Map features:**
- All active vehicles as colored pins
- Real-time position updates via Supabase Realtime Broadcast channel (GPS pings every 5s active, 15s en route, 30s idle)
- Route lines per driver (unique color, solid = completed, dashed = remaining)
- Geofence circles around delivery sites (150-300m radius)
- Arabic labels on map via MapTiler

**Sidebar panel (collapsible, left):**
- Hierarchical: Teams > Drivers (stop count in parentheses) > Assigned tasks
- Unassigned tasks pooled at top. Drag task to driver to assign.
- Quick filters: `[All]` `[Problems]` `[Arriving Soon]` `[Completed]`
- Each row: driver name, customer, ETA, status dot
- Search bar to find specific driver or order

#### 6.4 Delivery Confirmation with POD Validation

**When driver submits POD, dispatcher validates:**

**Deliveries list (Needs Review filter):**
- Table: Order # | Driver | Location | Time | Status Badge | POD Availability | `[Review >>]`

**POD Review screen (split layout):**
- **Left panel:** Mini-map showing GPS dot (actual delivery location) vs expected address pin. Distance between shown.
- **Right panel:** POD details:
  - Photo thumbnails (click to expand, pinch-to-zoom)
  - Digital signature image
  - GPS coordinates + timestamp (Geist Mono)
  - Item table: Expected Qty | Delivered Qty | Status per line
  - Driver notes
  - Delivery duration

**Validation checklist:**
- Photos clearly show delivered materials: YES/NO
- Signature present and legible: YES/NO
- Quantities match order: YES/NO
- GPS location matches delivery address (within 500m): YES/NO
- No damage reported: YES/NO

**Actions:**
- `[Confirm Delivery]` (green) -- marks DELIVERED, triggers invoice generation
- `[Flag Issue]` (yellow) -- exception form (partial delivery, damage, wrong items, signature issue). If quantity discrepancy: create partial delivery + schedule redelivery for remainder.
- `[Request Re-delivery]` (red) -- for failed/partial
- `[Reject]` -- sends back to driver for re-capture

**Auto-confirm rule:** If POD passes all automated checks, dispatcher can enable auto-confirm for trusted routes.

#### 6.5 Driver Management

**Driver list:** name, type (Internal/Contracted/On-Demand), vehicle, CDL status, compliance status, active route, availability

**Compliance tracking (integrated with HR):**
- License expiry dates (Second/First Degree professional license)
- Medical card, drug test results
- Moffett/crane certifications
- Insurance verification (monthly for contracted)
- **Expired compliance = blocked from dispatch assignment.**

**Contracted driver workflow:**
- Jobs offered (not assigned) with 30-min accept/decline window
- Performance scorecard: on-time rate, POD compliance, damage rate
- Weekly invoicing via portal
- 5% withholding tax on services

**On-demand driver pool:**
- Available drivers who opted in
- Light loads only (no Moffett/boom/CDL jobs)
- Claimed from pool with payout + countdown timer

#### 6.6 Dispatch Reports

- Delivery success rate, on-time rate, average per driver/day
- Delivery cost per order, route efficiency
- Failed delivery analysis, driver performance comparison
- Cairo night delivery compliance, equipment utilization

#### 6.7 Dispatch Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `M` | Toggle Map view |
| `G` then `R` | Go to Route Planning |
| `G` then `D` | Go to Driver Management |
| `1`-`9` | Select vehicle by list position |

### BACKEND.md — Server Functions (Dispatch)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getDispatchBoard` | GET | `{ date?, status? }` | `{ shipments[], driverAvailability[] }` | dispatch | none |
| `createShipment` | POST | `{ orderId, driverId, vehicleId, stops[], scheduledDate }` | `{ shipmentId }` | dispatch | Assign driver, notify |
| `optimizeRoute` | POST | `{ shipmentId, stops[] }` | `{ optimizedStops[], estimatedDuration, estimatedDistance }` | dispatch | Call routing API |
| `reassignDriver` | POST | `{ shipmentId, newDriverId, reason }` | `{ success }` | dispatch | Notify old + new driver |
| `getDeliveryAnalytics` | GET | `{ period }` | `{ onTimeRate, avgDeliveryTime, costPerDelivery, driverPerformance[] }` | dispatch | none |
| `getDriverLocations` | GET | `{}` | `{ drivers[] }` | dispatch | Initial load, then Realtime |
| `confirmDeliveryPOD` | POST | `{ deliveryId, decision, reason? }` | `{ success }` | dispatch | Updates POD status |
| `flagDeliveryIssue` | POST | `{ deliveryId, issueType, description, photos? }` | `{ issueId }` | dispatch | Creates issue |
| `getDriverList` | GET | `{ filters? }` | `{ drivers[], total }` | dispatch | none |
| `publishRoutes` | POST | `{ routeIds[] }` | `{ success, notifiedDrivers }` | dispatch | Publishes, notifies drivers |
| `processWhatsAppPOD` | POST | `{ from, mediaUrls[], messageId, messageText? }` | `{ matched, deliveryId?, podId? }` | webhook | Match WhatsApp POD to delivery |
| `manualMatchDropShipPOD` | POST | `{ webhookEventId, deliveryId }` | `{ success, podId }` | logistics | Match unmatched POD |
| `generateBrandedDeliveryNote` | POST | `{ supplierPoId }` | `{ pdfUrl }` | procurement | Anonymized delivery note |

## Business Rules

**Cairo Truck Ban (CRITICAL):**
- Heavy trucks (5+ tons) BANNED from Cairo Ring Road 6AM-midnight
- Building materials deliveries in Greater Cairo must be midnight-6AM
- Light deliveries (<5 tons, box trucks) exempt during daytime
- System MUST auto-block scheduling violations and alert dispatcher

**Prayer Time Buffers:**
- 5 daily prayers (Fajr, Dhuhr, Asr, Maghrib, Isha) -- each 5-10 minutes
- ETAs include 10-15 minute buffer around prayer times
- Friday Jumu'ah: hard blackout 11:30 AM - 1:30 PM

**Khamsin Dust Storms (March-May):**
- Winds 40-80 km/h, visibility below 1 km
- Block sheet material deliveries above 30 km/h wind
- Auto-pause outdoor operations during severe Khamsin

**Summer Heat & Driver Safety (RESEARCH.md Section 1):**
40-50 degrees C in Upper Egypt June-September. Driver safety: mandatory breaks, water supply, no loading during peak heat 12-3 PM. Also: cement shelf life shortened to 2-3 months, adhesives/sealants reduced shelf life.

**Three Driver Types:**
- INTERNAL: Employee, company vehicle, full equipment access, dispatched directly
- CONTRACTED: Recurring external, verified CDL/insurance/equipment, offered priority overflow
- ON_DEMAND: One-off external, own vehicle, light loads only, claimed from pool

**Equipment-Tagged Dispatch:**
- Moffett/boom/CDL jobs -> INTERNAL or CONTRACTED only, never ON_DEMAND
- Moffett-equipped: 6-10 stops/day
- Boom truck: 3-6 stops/day

**Failed Delivery Costs:** $150-400+ per failure. Target: 93-97% first-attempt success rate.

**Drop-Ship POD System (Dual Confirmation):**
- Supplier driver photographs signed HyperQuote delivery note -> sends via WhatsApp within 4 hours
- Customer confirms receipt via WhatsApp/portal
- Invoice triggers on FIRST confirmation
- Auto-confirm at 72 hours if no dispute
- Supplier POD compliance tracked in scorecard

## Non-Negotiable Rules

1. **Three colors only.** White, Black, Blue. Status colors for fleet pins are DATA.
2. **Spatial glass, not dashboards.**
3. **Geist Mono for ALL numbers.**
4. **React Aria Components, NOT shadcn.**
5. **`ClientOnly` for maps.** MapLibre GL MUST be wrapped in `ClientOnly` for SSR compatibility.
6. **Motion v12.** Import from `motion/react`.
7. **`useWatch()`, NEVER `watch()`.**
8. **Colors in `:root {}`, NEVER in `@theme`.**
9. **ALL numbers -> Arabic-Indic numerals in Arabic context.**

## Known Risks & Gotchas

- **MapLibre v5 breaking changes:** new `canvasContextAttributes`, `on()` returns Subscription. Test carefully.
- **Maps MUST be in ClientOnly wrapper** — SSR will crash MapLibre
- React Aria DragAndDrop for route stop reordering
- Supabase Realtime Broadcast for GPS pings — not postgres_changes (too noisy for GPS)
- GPS pin clustering at low zoom levels needs maplibre-gl clusters or supercluster
- Route optimization (OR-Tools/GraphHopper) is an external API call — handle latency gracefully
- Arabic map labels require MapTiler configuration

## Tips

- The dispatch module is MAP-HEAVY. Get the MapLibre GL + react-map-gl setup working first before building any features.
- Use `react-map-gl/maplibre` import path
- Route planning has a split layout (left: routes list, right: map) — use a resizable split pane
- GPS pings use Supabase Realtime `broadcast` channel, NOT `postgres_changes`
- The sidebar panel on the live map is collapsible — important for mobile
- POD validation split view: left panel has a mini-map (smaller MapLibre instance), right panel has the POD details
- Vehicle pin design changes based on zoom level — implement as a custom MapLibre layer
