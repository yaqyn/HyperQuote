# Phase 25: Driver Route + Delivery + POD - Research

**Researched:** 2026-04-06
**Domain:** Offline-first mobile delivery workflow: mapping, geofencing, barcode scanning, camera, signature capture
**Confidence:** HIGH

## Summary

Phase 25 implements the core delivery workflow in the Capacitor driver app built in Phase 24. This covers six screens (Route Overview, Stop Detail, Navigation, Loading Verification, Delivery Execution, POD Capture) plus supporting infrastructure (background geolocation with geofencing, offline map tiles, barcode scanning, photo queue).

The existing Phase 24 codebase provides: Vite + React SPA with Capacitor 8, OTP/PIN/biometric auth, PowerSync + SQLite with a schema that already includes `routes`, `route_stops`, `deliveries`, and `delivery_items` tables, photo capture/compression helpers, shift management, and shared UI components (DriverButton, DriverCard). The home screen already queries route data from PowerSync and shows a route summary with first stop preview.

Phase 25 adds: MapLibre GL for the route map, PMTiles for offline tile caching, `@transistorsoft/capacitor-background-geolocation` for geofencing + background GPS, `@capacitor-mlkit/barcode-scanning` for loading verification, and extends the PowerSync schema for load verifications and proof of delivery.

**Primary recommendation:** Build in layers: (1) PowerSync schema extension for load_verifications + proof_of_delivery, (2) route overview with MapLibre map + list view, (3) stop detail screen, (4) navigation deep-links, (5) loading verification with barcode scanning, (6) background geolocation + geofencing for arrival detection, (7) delivery execution per-line-item flow, (8) POD capture with signature + photos + swipe-to-complete.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Vite + React SPA, NOT TanStack Start (Capacitor WebView incompatible with server functions)
- Capacitor 8 native wrapper
- Three colors: White, Black, Blue (driver app USES blue)
- Giant touch targets: 56-64dp minimum, primary actions in bottom 40%
- Geist Mono for ALL numbers
- React Aria Components, NOT shadcn
- Motion v12, import from `motion/react`
- `useWatch()`, NEVER `watch()`
- Colors in `:root {}`, NEVER in `@theme`
- ALL numbers -> Arabic-Indic numerals in Arabic context
- Everything must work offline (queue mutations in PowerSync/SQLite)
- 16px base font (larger for outdoor readability)
- 7:1 contrast (WCAG AAA for dirty screens/sunlight)
- No server functions -- calls Supabase directly (protected by RLS)
- Login requires network; inspection works offline
- Photo compression: 1920px max, JPEG 0.7 before queuing for upload
- Navigation: deep-link to Sygic/HERE (truck-safe routing, NOT Google Maps)
- Barcode scanning via `@capacitor-mlkit/barcode-scanning`
- Background geolocation via `@transistorsoft/capacitor-background-geolocation`
- MapLibre GL for route map with PMTiles for offline
- Cairo truck ban indicator: 5+ tons, 6AM-midnight, Greater Cairo

### Claude's Discretion
- MapLibre GL wrapper approach (direct or via react-map-gl)
- PMTiles caching strategy (pre-download vs lazy cache)
- Swipe-to-complete gesture implementation
- Signature pad library choice
- Bottom sheet implementation for list view
- Photo upload queue architecture (extend existing camera.ts or separate module)
- Geofence radius configuration approach

### Deferred Ideas (OUT OF SCOPE)
- Exception reporting (Phase 26: DRV-09)
- End of day / shift summary (Phase 26: DRV-10)
- External driver job offers (Phase 26: DRV-11)
- Skip-stop dispatch approval workflow (dispatch-side, Phase 21)
- Route change acknowledgment push notification (requires push notification infrastructure)
- WhatsApp/SMS customer notifications (Phase 27: INTG-01)
- PDF delivery note generation (Phase 28: INTG-03)
- Drag-and-drop stop reordering (complex, requires dispatch approval workflow)
- Traffic overlay (requires online + traffic data provider)
- ETA jump detection + auto-alert dispatch (requires real-time connectivity)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRV-03 | Route overview: map with numbered pins + list view, color-coded by status | MapLibre GL v5 + PMTiles for offline map, PowerSync `routes` + `route_stops` tables already exist |
| DRV-04 | Stop detail: customer info, order items, unloading method, site access instructions | PowerSync `deliveries` + `delivery_items` + address data from `route_stops`, Cairo truck ban logic |
| DRV-05 | Navigation: deep-link to Sygic/HERE (NOT Google Maps) | Sygic `com.sygic.aura://` URL scheme, HERE WeGo `https://share.here.com/` deep links via Capacitor App Launcher |
| DRV-06 | Loading verification: barcode scan per item, weight check, photo of loaded truck | `@capacitor-mlkit/barcode-scanning` v8.0.1, PowerSync `load_verifications` table, existing camera helpers |
| DRV-07 | Delivery execution: geofence auto-detect arrival, per-line item confirmation, unloading timer | `@transistorsoft/capacitor-background-geolocation` v9 geofencing, PowerSync `delivery_items` per-line status |
| DRV-08 | POD capture: photos + digital signature + GPS location + quantity confirmation per item | Signature canvas, existing camera helpers, GPS via geolocation plugin, PowerSync `proof_of_delivery` table |
</phase_requirements>

## Standard Stack

### Core (New for Phase 25)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `maplibre-gl` | 5.22.0 | Vector map rendering | Only production-grade open-source map renderer; spec requires MapLibre |
| `pmtiles` | 4.4.0 | Offline tile archive reader | PMTiles protocol for MapLibre; enables offline map without tile server |
| `@transistorsoft/capacitor-background-geolocation` | 9.0.2 | Background GPS + geofencing | Only Capacitor plugin with geofencing + background tracking + motion detection |
| `@capacitor-mlkit/barcode-scanning` | 8.0.1 | QR/barcode camera scanning | Google ML Kit on-device; Capacitor 8 compatible; spec-mandated |
| `@capacitor/app-launcher` | 8.0.1 | Deep-link to external apps | Check if Sygic/HERE installed, launch with coordinates |
| `react-signature-canvas` | 1.0.7 | Signature capture pad | Already in Phase 24 research; simple, finger-optimized canvas |

### Existing (from Phase 24)

| Library | Version | Purpose |
|---------|---------|---------|
| `@capacitor/core` | 8.3.0 | Native bridge |
| `@capacitor/camera` | 8.0.2 | Photo capture (loading + POD) |
| `@capacitor/geolocation` | 8.2.0 | Foreground GPS |
| `@powersync/capacitor` | 0.5.2 | Offline SQLite sync |
| `@supabase/supabase-js` | 2.101.1 | Direct API calls |
| `@tanstack/react-router` | 1.168.10 | SPA routing |
| `zustand` | 5.0.12 | UI state |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Direct maplibre-gl | react-map-gl v8 | react-map-gl adds abstraction overhead; direct maplibre-gl is simpler for a single map view and avoids version sync issues with MapLibre v5 |
| react-signature-canvas | signature_pad (vanilla) | react-signature-canvas wraps signature_pad with React bindings; simpler integration |
| Custom bottom sheet | @gorhom/bottom-sheet | @gorhom is React Native only; must build with CSS/Motion for Capacitor web |

**Installation:**
```bash
cd apps/driver
bun add maplibre-gl pmtiles @transistorsoft/capacitor-background-geolocation @capacitor-mlkit/barcode-scanning @capacitor/app-launcher react-signature-canvas
bun add -D @types/react-signature-canvas
```

## Architecture Patterns

### New Routes for Phase 25
```
apps/driver/src/
├── routes/
│   ├── route-overview.tsx      # Screen 4: Map + list view
│   ├── stop-detail.tsx         # Screen 5: Stop info + actions
│   ├── loading.tsx             # Screen 7: Loading verification
│   ├── delivery.tsx            # Screen 9: Per-line-item delivery
│   └── pod.tsx                 # Screen 10: POD capture
├── components/
│   ├── route/
│   │   ├── RouteMap.tsx        # MapLibre GL map with numbered pins
│   │   ├── RouteList.tsx       # Bottom sheet stop list
│   │   ├── StopCard.tsx        # Individual stop row (56dp min height)
│   │   └── StopStatusBadge.tsx # Color-coded status indicator
│   ├── loading/
│   │   ├── BarcodeScanner.tsx  # ML Kit barcode scanner overlay
│   │   ├── LoadPlan.tsx        # Load sequence list
│   │   ├── WeightEntry.tsx     # Scale ticket weight input
│   │   └── LoadSignOff.tsx     # Confirmation + signature
│   ├── delivery/
│   │   ├── LineItemList.tsx    # Per-line-item confirmation
│   │   ├── QuantityAdjust.tsx  # Partial delivery quantity input
│   │   ├── DamageReport.tsx    # Damage flag + photo
│   │   └── UnloadingTimer.tsx  # Timer display (Geist Mono)
│   └── pod/
│       ├── PODPhotos.tsx       # Photo capture (1-6 photos)
│       ├── SignaturePad.tsx    # Full-screen signature canvas
│       ├── ConditionSelect.tsx # Good condition / Damage noted
│       └── SwipeToComplete.tsx # 80% width swipe gesture
├── lib/
│   ├── map.ts                  # MapLibre init, PMTiles protocol
│   ├── geofence.ts             # Background geolocation + geofence helpers
│   ├── barcode.ts              # Barcode scanning helpers
│   ├── navigation.ts           # Sygic/HERE deep-link launcher
│   ├── upload-queue.ts         # Photo upload queue with retry
│   └── truck-ban.ts            # Cairo truck ban detection logic
└── stores/
    ├── route.ts                # Active route + stops state
    ├── delivery.ts             # Active delivery + line items state
    └── loading.ts              # Loading verification state
```

### Pattern 1: MapLibre GL with PMTiles (Offline Map)
**What:** Initialize MapLibre with PMTiles protocol for offline tile serving.
**When to use:** Route overview map screen.
**Example:**
```typescript
// src/lib/map.ts
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'

let protocol: Protocol | null = null

export function initMapProtocol() {
  if (protocol) return
  protocol = new Protocol()
  maplibregl.addProtocol('pmtiles', protocol.tile)
}

export function createMap(container: HTMLDivElement, options?: {
  center?: [number, number]
  zoom?: number
}) {
  initMapProtocol()
  return new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        'cairo-tiles': {
          type: 'vector',
          url: 'pmtiles:///assets/cairo-metro.pmtiles',
        },
      },
      layers: [
        // Base layers from PMTiles source
      ],
      glyphs: '/assets/fonts/{fontstack}/{range}.pbf',
    },
    center: options?.center ?? [31.2357, 30.0444], // Cairo default
    zoom: options?.zoom ?? 11,
    attributionControl: false,
  })
}
```

### Pattern 2: Background Geolocation + Geofencing
**What:** Start background GPS tracking with geofence triggers at delivery stops.
**When to use:** After shift start, when route is loaded.
**Example:**
```typescript
// src/lib/geofence.ts
import BackgroundGeolocation, {
  type Geofence,
} from '@transistorsoft/capacitor-background-geolocation'

export async function initBackgroundGeolocation() {
  await BackgroundGeolocation.ready({
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 10, // meters
    stopOnTerminate: false,
    startOnBoot: false,
    enableHeadless: true,
    // Adaptive intervals per spec
    heartbeatInterval: 60,
    // Motion detection
    isMoving: true,
  })
}

export async function addStopGeofences(
  stops: Array<{ id: string; lat: number; lng: number; radius?: number }>
) {
  const geofences: Geofence[] = stops.map((stop) => ({
    identifier: stop.id,
    radius: stop.radius ?? 200, // 150-300m per spec
    latitude: stop.lat,
    longitude: stop.lng,
    notifyOnEntry: true,
    notifyOnExit: true,
    notifyOnDwell: true,
    loiteringDelay: 120000, // 2 min dwell for auto-arrival
  }))

  await BackgroundGeolocation.addGeofences(geofences)
}

export function onGeofenceEvent(
  callback: (event: { identifier: string; action: string }) => void
) {
  return BackgroundGeolocation.onGeofence((event) => {
    callback({
      identifier: event.identifier,
      action: event.action, // ENTER, EXIT, DWELL
    })
  })
}
```

### Pattern 3: Barcode Scanning
**What:** Camera-based barcode/QR scanning for loading verification.
**When to use:** Loading verification screen per-item scan.
**Example:**
```typescript
// src/lib/barcode.ts
import {
  BarcodeScanner,
  BarcodeFormat,
  type Barcode,
} from '@capacitor-mlkit/barcode-scanning'

export async function checkScanPermission(): Promise<boolean> {
  const { camera } = await BarcodeScanner.checkPermissions()
  if (camera === 'granted') return true
  if (camera === 'denied') return false
  const result = await BarcodeScanner.requestPermissions()
  return result.camera === 'granted'
}

export async function scanBarcode(): Promise<string | null> {
  const granted = await checkScanPermission()
  if (!granted) return null

  const { barcodes } = await BarcodeScanner.scan({
    formats: [
      BarcodeFormat.QrCode,
      BarcodeFormat.Code128,
      BarcodeFormat.Code39,
      BarcodeFormat.Ean13,
      BarcodeFormat.Ean8,
    ],
  })

  return barcodes.length > 0 ? barcodes[0].rawValue : null
}
```

### Pattern 4: Navigation Deep-Links
**What:** Launch external truck-safe navigation app with destination coordinates.
**When to use:** When driver taps Navigate button.
**Example:**
```typescript
// src/lib/navigation.ts
import { AppLauncher } from '@capacitor/app-launcher'

type NavApp = 'sygic' | 'here' | null

export async function getAvailableNavApp(): Promise<NavApp> {
  // Check Sygic Truck first (preferred)
  try {
    const sygic = await AppLauncher.canOpenUrl({ url: 'com.sygic.aura://' })
    if (sygic.value) return 'sygic'
  } catch { /* not installed */ }

  // Check HERE WeGo / HERE WeGo Pro
  try {
    const here = await AppLauncher.canOpenUrl({ url: 'here-route://' })
    if (here.value) return 'here'
  } catch { /* not installed */ }

  return null
}

export async function launchNavigation(lat: number, lng: number, label?: string) {
  const app = await getAvailableNavApp()

  if (app === 'sygic') {
    // Sygic Truck custom URL scheme
    // drive|lng|lat|show means navigate to coordinates
    await AppLauncher.openUrl({
      url: `com.sygic.aura://coordinate|${lng}|${lat}|drive`,
    })
    return true
  }

  if (app === 'here') {
    // HERE WeGo deep link
    const name = encodeURIComponent(label ?? 'Delivery')
    await AppLauncher.openUrl({
      url: `https://share.here.com/r/${lat},${lng},${name}`,
    })
    return true
  }

  // Neither installed -- prompt to download Sygic
  return false
}
```

### Pattern 5: Swipe-to-Complete Gesture
**What:** Full-width swipe gesture requiring 80% of screen width to confirm delivery.
**When to use:** POD capture final confirmation.
**Example:**
```typescript
// Concept: Track touch start/move, require deltaX >= 80% of container width
// Use motion/react for the sliding track animation
// Visual: pill-shaped track with thumb that follows finger
// On complete: vibrate + submit

// Key implementation notes:
// - Must be interruptible (finger can go back)
// - Success threshold: 80% of track width
// - Haptic feedback at 50% and 100%
// - Disabled state when prerequisites not met
// - RTL: swipe direction flips (start from end side)
```

### Pattern 6: Cairo Truck Ban Detection
**What:** Determine if delivery falls within Cairo truck ban window.
**When to use:** Stop detail screen, red/gray banner.
**Example:**
```typescript
// src/lib/truck-ban.ts
const CAIRO_BOUNDS = {
  north: 30.22,
  south: 29.85,
  east: 31.52,
  west: 31.05,
}

export function isCairoTruckBanActive(
  lat: number,
  lng: number,
  vehicleWeightKg: number,
  currentTime: Date = new Date()
): { banned: boolean; nightWindow: boolean; message: string } {
  const inCairo =
    lat >= CAIRO_BOUNDS.south && lat <= CAIRO_BOUNDS.north &&
    lng >= CAIRO_BOUNDS.west && lng <= CAIRO_BOUNDS.east

  const isHeavy = vehicleWeightKg >= 5000 // 5+ tons

  if (!inCairo || !isHeavy) {
    return { banned: false, nightWindow: false, message: '' }
  }

  const hour = currentTime.getHours()
  const inBanWindow = hour >= 6 && hour < 24 // 6AM-midnight
  const inNightWindow = hour >= 0 && hour < 6 // midnight-6AM

  return {
    banned: inBanWindow,
    nightWindow: inNightWindow,
    message: inBanWindow
      ? 'Cairo truck ban active (6AM-midnight for 5+ ton vehicles)'
      : inNightWindow
        ? 'Night delivery window (midnight-6AM)'
        : '',
  }
}
```

### Anti-Patterns to Avoid
- **Google Maps deep-link for navigation:** Spec explicitly forbids Google Maps (no truck profiles). Use Sygic/HERE only.
- **Rendering MapLibre in SSR:** This is a Capacitor SPA (no SSR), but still wrap MapLibre in a lazy-loaded component to avoid import-time side effects.
- **Foreground-only GPS for geofencing:** `@capacitor/geolocation` does NOT support geofencing or background tracking. Must use `@transistorsoft/capacitor-background-geolocation`.
- **Storing POD photos as base64 in SQLite:** Store file URIs in SQLite, actual files on device filesystem. Base64 bloats the database.
- **Blocking UI during photo upload:** Queue photos for background upload. Never wait for upload to complete before proceeding.
- **Synchronous barcode scanning loop:** ML Kit scan is async and opens a camera overlay. One scan at a time, check result, then allow next.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Offline map tiles | Custom tile caching | `pmtiles` + PMTiles archive | Single-file tile archive, no tile server, well-tested with MapLibre |
| Background geofencing | Custom GPS polling + haversine | `@transistorsoft/capacitor-background-geolocation` | Native geofence APIs, battery-efficient, handles OS restrictions |
| Barcode scanning | Custom camera frame analysis | `@capacitor-mlkit/barcode-scanning` | On-device ML Kit, handles focus/lighting, multiple formats |
| Signature capture | Custom Canvas touch handling | `react-signature-canvas` | Touch events, export, clear, undo all handled |
| Photo compression | Manual canvas resize | `@capacitor/camera` width/height/quality params | Native-level compression before crossing the bridge |
| Truck-safe navigation | In-app turn-by-turn | Sygic/HERE deep-link | Spec explicitly says NO built-in navigation; deep-link to truck-aware apps |

**Key insight:** The driver app delegates complex operations (navigation, barcode ML, background tracking) to native plugins or external apps. The app itself focuses on the workflow UI and offline data management.

## PowerSync Schema Extension

Phase 24 already defined `routes`, `route_stops`, `deliveries`, and `delivery_items` tables in the PowerSync schema. Phase 25 must add:

```typescript
// Additional tables for Phase 25

const load_verifications = new Table({
  route_id: column.text,
  vehicle_id: column.text,
  verified_by: column.text,
  scan_results: column.text, // JSON array
  total_items_expected: column.integer,
  total_items_scanned: column.integer,
  weight_expected_kg: column.real,
  weight_actual_kg: column.real,
  weight_variance_percent: column.real,
  truck_photo_uri: column.text,
  cargo_photo_uri: column.text,
  driver_signature_url: column.text,
  gate_clearance: column.text, // approved | blocked | override
  created_at: column.text,
})

const proof_of_delivery = new Table({
  delivery_id: column.text,
  signer_name: column.text,
  signer_role: column.text,
  signature_url: column.text,
  photos: column.text, // JSON array of URIs
  gps_lat: column.real,
  gps_lng: column.real,
  gps_accuracy_meters: column.real,
  condition_notes: column.text,
  offline_captured: column.text, // 'true'/'false'
  captured_at: column.text,
  created_at: column.text,
})
```

The `route_stops` table from Phase 24 needs additional columns for stop-level data the driver needs:

```typescript
// Existing route_stops already has: route_id, delivery_id, stop_order,
// customer_name, address, lat, lng, status, eta, notes, unloading_method

// Consider adding to route_stops or loading from deliveries:
// - contact_phone (masked)
// - delivery_window_start / delivery_window_end
// - ppe_required
// - access_instructions
// - previous_delivery_notes
```

## Common Pitfalls

### Pitfall 1: MapLibre GL v5 Breaking Changes
**What goes wrong:** v5 changed `on()` to return a Subscription object (for unsubscribe) and `canvasContextAttributes` replaced `preserveDrawingBuffer`.
**Why it happens:** Upgrading from v4 docs/examples.
**How to avoid:** Use `map.on('load', fn)` return value for cleanup: `const sub = map.on('load', fn); sub.unsubscribe()`. Do NOT use `map.off()` pattern.
**Warning signs:** Memory leaks from un-unsubscribed event listeners.

### Pitfall 2: Background Geolocation License Key
**What goes wrong:** Plugin logs "License Invalid" and falls back to limited mode (no geofencing).
**Why it happens:** `@transistorsoft/capacitor-background-geolocation` v9 requires a $399 license key per app bundle ID.
**How to avoid:** Purchase license at transistorsoft.com. Configure license key in plugin config. For development, the plugin works without a key but with a "debug" watermark.
**Warning signs:** Console warning about invalid license, geofence events not firing.

### Pitfall 3: PMTiles File Size and Caching
**What goes wrong:** Cairo metro area vector tiles can be 200-400MB. First load on slow 3G can timeout.
**Why it happens:** Trying to download the entire tile archive on first use.
**How to avoid:** Pre-bundle a basic Cairo tile set (~50-100MB) with the app binary. Use incremental PMTiles fetching (PMTiles supports HTTP range requests) for areas outside the bundle.
**Warning signs:** App download size ballooning, first launch hang on map screen.

### Pitfall 4: Geofence Event Fires Multiple Times
**What goes wrong:** Driver circling a construction site triggers ENTER/EXIT/ENTER repeatedly.
**Why it happens:** GPS accuracy fluctuation near geofence boundary causes repeated crossings.
**How to avoid:** Use DWELL event (loiteringDelay: 120000ms = 2 minutes) for auto-arrival instead of ENTER. Debounce ENTER events. Only trigger arrival logic once per stop.
**Warning signs:** Multiple "arrived" timestamps for the same stop.

### Pitfall 5: Barcode Scanner Conflicts with Map Camera Permissions
**What goes wrong:** Opening barcode scanner after map renders causes permission prompt again or crashes.
**Why it happens:** Both MapLibre (WebGL) and ML Kit barcode scanner use device resources.
**How to avoid:** Barcode scanner is on a separate screen (loading verification) from the map (route overview). Ensure scanner is fully disposed before returning to map screen.
**Warning signs:** Black screen after closing scanner.

### Pitfall 6: Signature Canvas Not Working with CSS transforms
**What goes wrong:** Signature drawing is offset from finger position.
**Why it happens:** CSS transforms (scale, translate) on parent elements shift the canvas coordinate system.
**How to avoid:** Signature pad should be in a full-screen overlay with no CSS transforms on ancestors. Use `position: fixed` at the viewport level.
**Warning signs:** Drawing appears offset from touch point.

### Pitfall 7: POD Photos Stuck in Upload Queue
**What goes wrong:** POD photos queued for upload never reach R2/Supabase Storage.
**Why it happens:** PowerSync syncs structured data but NOT binary files. Photos need a separate upload pipeline.
**How to avoid:** Implement a dedicated upload queue in Zustand that: (1) captures photo URI, (2) stores reference in SQLite, (3) on connectivity, uploads to Supabase Storage/R2, (4) updates the SQLite record with the remote URL. Retry with exponential backoff.
**Warning signs:** `pod_photos` column has local file:// URIs instead of remote URLs.

### Pitfall 8: Offline POD Signature Hash Invalid
**What goes wrong:** Signature hash computed on device doesn't match when verified server-side.
**Why it happens:** The `proof_of_delivery` DB table requires `signature_hash` and `document_hash` for legal validity (Egyptian E-Signature Law 15/2004).
**How to avoid:** Use Web Crypto API (`crypto.subtle.digest('SHA-256', ...)`) to hash the signature image data on-device. Store hash alongside the signature. Server validates hash matches the uploaded image.
**Warning signs:** Tamper check status becomes 'invalid' after sync.

## Code Examples

### Numbered Map Pins (Route Overview)
```typescript
// Create numbered markers for each stop
function addStopMarkers(
  map: maplibregl.Map,
  stops: Array<{ id: string; lat: number; lng: number; order: number; status: string }>
) {
  const statusColors: Record<string, string> = {
    pending: '#9CA3AF',    // Gray
    en_route: '#2563EB',   // Blue
    arrived: '#2563EB',    // Blue
    completed: '#16A34A',  // Green
    failed: '#DC2626',     // Red
    skipped: '#DC2626',    // Red
  }

  for (const stop of stops) {
    const el = document.createElement('div')
    el.className = 'stop-marker'
    el.style.cssText = `
      width: 36px; height: 36px; border-radius: 50%;
      background: ${statusColors[stop.status] ?? '#9CA3AF'};
      color: white; display: flex; align-items: center; justify-content: center;
      font-family: var(--font-mono); font-size: 16px; font-weight: 700;
      border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `
    el.textContent = String(stop.order)

    new maplibregl.Marker({ element: el })
      .setLngLat([stop.lng, stop.lat])
      .addTo(map)
  }
}
```

### Photo Upload Queue
```typescript
// src/lib/upload-queue.ts
import { create } from 'zustand'
import { supabase } from './supabase'

interface QueuedPhoto {
  id: string
  localUri: string
  remoteUrl: string | null
  table: string // which table references this photo
  recordId: string // which record
  column: string // which column
  retries: number
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
}

interface UploadQueueState {
  queue: QueuedPhoto[]
  addPhoto: (photo: Omit<QueuedPhoto, 'retries' | 'status' | 'remoteUrl'>) => void
  processQueue: () => Promise<void>
}

export const useUploadQueue = create<UploadQueueState>((set, get) => ({
  queue: [],

  addPhoto: (photo) => {
    set((s) => ({
      queue: [...s.queue, { ...photo, retries: 0, status: 'pending', remoteUrl: null }],
    }))
  },

  processQueue: async () => {
    const pending = get().queue.filter((p) => p.status === 'pending' || p.status === 'failed')
    for (const photo of pending) {
      if (photo.retries >= 5) continue

      set((s) => ({
        queue: s.queue.map((p) =>
          p.id === photo.id ? { ...p, status: 'uploading' as const } : p
        ),
      }))

      try {
        // Read file as blob
        const response = await fetch(photo.localUri)
        const blob = await response.blob()

        const path = `driver/photos/${photo.id}.jpg`
        const { error } = await supabase.storage
          .from('delivery-photos')
          .upload(path, blob, { contentType: 'image/jpeg' })

        if (error) throw error

        const { data } = supabase.storage.from('delivery-photos').getPublicUrl(path)

        set((s) => ({
          queue: s.queue.map((p) =>
            p.id === photo.id
              ? { ...p, status: 'uploaded' as const, remoteUrl: data.publicUrl }
              : p
          ),
        }))
      } catch {
        set((s) => ({
          queue: s.queue.map((p) =>
            p.id === photo.id
              ? { ...p, status: 'failed' as const, retries: p.retries + 1 }
              : p
          ),
        }))
      }
    }
  },
}))
```

### Stop Status Color Constants
```typescript
// Shared stop status configuration
export const STOP_STATUS = {
  pending: { color: '#9CA3AF', label: 'stopStatus.pending' },
  en_route: { color: '#2563EB', label: 'stopStatus.enRoute' },
  arrived: { color: '#2563EB', label: 'stopStatus.arrived' },
  completed: { color: '#16A34A', label: 'stopStatus.completed' },
  failed: { color: '#DC2626', label: 'stopStatus.failed' },
  skipped: { color: '#DC2626', label: 'stopStatus.skipped' },
} as const

export type StopStatus = keyof typeof STOP_STATUS
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MapLibre v4 `map.off()` cleanup | MapLibre v5 Subscription return from `on()` | v5 (2025) | Cleaner event cleanup, no dangling listeners |
| Separate tile server | PMTiles single-file archive | 2024-2025 | No server needed, works offline from local file |
| Google ML Kit via Cordova | `@capacitor-mlkit/barcode-scanning` v8 | 2025-2026 | Native Capacitor 8, TypeScript types, web fallback |
| BG geolocation v4 (Capacitor 5) | v9 (Capacitor 8) | 2025-2026 | New API surface, better battery optimization |
| react-signature-pad | react-signature-canvas 1.x | Stable | Minor; both work. Canvas version has React bindings |

## Open Questions

1. **PMTiles Source for Cairo Tiles**
   - What we know: PMTiles archives can be generated from OpenStreetMap data using `pmtiles` CLI or from MapTiler
   - What's unclear: Where to source pre-built Cairo vector tiles with Arabic labels
   - Recommendation: Use Protomaps basemap (free, OpenStreetMap-based) to generate a Cairo metro area extract. Bundle ~50-100MB PMTiles file with the app. For Arabic labels, MapTiler has Arabic glyph support but costs money. Protomaps also supports Arabic labels via Noto Naskh Arabic font.

2. **Background Geolocation License**
   - What we know: $399 Starter license per app bundle ID (Phase 24 research noted this)
   - What's unclear: Whether license has been purchased
   - Recommendation: Plan should include a task noting this dependency. Development works without license (with watermark). Production deployment requires purchased license configured in plugin options.

3. **Photo Upload Destination**
   - What we know: Photos need to go to R2 or Supabase Storage
   - What's unclear: Whether Supabase Storage bucket is configured for the driver app
   - Recommendation: Create a `delivery-photos` storage bucket in Supabase. RLS policy: driver can upload to their own path prefix. Public read for dispatch/customer access.

4. **Masked Phone Numbers**
   - What we know: Spec says customer never sees driver's personal number; calls route through backend masking
   - What's unclear: Masking service not yet built (likely Phase 27+ with WhatsApp/Twilio)
   - Recommendation: For Phase 25, show a [Call Site Contact] button that dials the contact_phone_on_site from the address record directly. Masking is a server-side concern for later phases.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Bun | Package management | Yes | 1.3.11 | -- |
| Node.js | Capacitor CLI | Yes | 25.8.0 | -- |
| maplibre-gl | Route map | Install | 5.22.0 | -- |
| pmtiles | Offline tiles | Install | 4.4.0 | -- |
| Android SDK | Native builds | No | -- | Web preview via `bun run dev` |
| Xcode | iOS builds | No | -- | Web preview via `bun run dev` |

**Missing dependencies with no fallback:**
- Android SDK / Xcode not available on Linux dev machine. All development uses web preview (`bun run dev`). Native builds happen on CI or Mac. This is the same situation as Phase 24.

**Missing dependencies with fallback:**
- Background geolocation plugin requires native device for geofence testing. Web fallback: mock geofence events in development using a test utility.
- Barcode scanner requires camera hardware. Web fallback: manual entry mode (already specified in CONTEXT.md for items without barcodes).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file | `apps/driver/vitest.config.ts` (exists from Phase 24) |
| Quick run command | `cd apps/driver && bun run test` |
| Full suite command | `cd apps/driver && bun run test -- --run` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DRV-03 | Route store loads stops from PowerSync | unit | `bun run test -- src/stores/route.test.ts` | Wave 0 |
| DRV-03 | Stop status color mapping | unit | `bun run test -- src/lib/stop-status.test.ts` | Wave 0 |
| DRV-04 | Cairo truck ban detection | unit | `bun run test -- src/lib/truck-ban.test.ts` | Wave 0 |
| DRV-05 | Navigation app detection + deep-link URL | unit | `bun run test -- src/lib/navigation.test.ts` | Wave 0 |
| DRV-06 | Load verification weight variance calc | unit | `bun run test -- src/stores/loading.test.ts` | Wave 0 |
| DRV-06 | Scan result match/mismatch detection | unit | `bun run test -- src/lib/barcode.test.ts` | Wave 0 |
| DRV-07 | Delivery line-item status transitions | unit | `bun run test -- src/stores/delivery.test.ts` | Wave 0 |
| DRV-07 | Geofence event handling (debounce, single trigger) | unit | `bun run test -- src/lib/geofence.test.ts` | Wave 0 |
| DRV-08 | POD completion validation (all fields required) | unit | `bun run test -- src/stores/pod.test.ts` | Wave 0 |
| DRV-08 | Signature hash generation | unit | `bun run test -- src/lib/signature-hash.test.ts` | Wave 0 |
| DRV-08 | Upload queue retry logic | unit | `bun run test -- src/lib/upload-queue.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/driver && bun run test -- --run`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `src/stores/route.test.ts` -- route store unit tests
- [ ] `src/stores/delivery.test.ts` -- delivery line-item state tests
- [ ] `src/stores/loading.test.ts` -- loading verification state tests
- [ ] `src/stores/pod.test.ts` -- POD state + validation tests
- [ ] `src/lib/truck-ban.test.ts` -- Cairo truck ban logic tests
- [ ] `src/lib/navigation.test.ts` -- navigation deep-link URL tests
- [ ] `src/lib/geofence.test.ts` -- geofence event handling tests
- [ ] `src/lib/upload-queue.test.ts` -- upload queue retry tests
- [ ] `src/lib/signature-hash.test.ts` -- signature hash generation tests
- [ ] Mock utilities for `@transistorsoft/capacitor-background-geolocation`, `@capacitor-mlkit/barcode-scanning`, `@capacitor/app-launcher`

## Project Constraints (from CLAUDE.md)

- **Bun, NOT npm:** All package operations use `bun add`, `bun install`, `bun run`
- **React Aria Components, NOT shadcn:** All interactive UI built with React Aria
- **Motion v12:** Import from `motion/react`, NOT `framer-motion`
- **Colors in `:root {}`, NEVER `@theme`:** Tailwind v4 color registration rule
- **`useWatch()` NEVER `watch()`:** React 19 + React Compiler compatibility
- **Geist Mono for ALL numbers:** Quantities, weights, distances, times, IDs, ETAs, timers
- **Arabic-Indic numerals:** All numbers in Arabic locale context
- **Logical properties ONLY:** `ps-4` not `pl-4`, `me-2` not `mr-2` (RTL support)
- **16px base font, 7:1 contrast:** Outdoor readability for driver app
- **Three colors only:** White, Black (#0F172A), Blue (#2563EB). Semantic status colors for data indicators only.
- **56-64dp minimum touch targets:** Primary actions in bottom 40% of screen
- **ClientOnly for maps:** MapLibre GL wrapped in lazy component (no SSR in this SPA, but still lazy for code splitting)
- **Photo compression:** 1920px max, JPEG 0.7 quality before queuing
- **Offline-first:** All mutations go through PowerSync/SQLite, sync on reconnect

## Sources

### Primary (HIGH confidence)
- npm registry -- verified all package versions via `npm view` (2026-04-06): maplibre-gl 5.22.0, pmtiles 4.4.0, @transistorsoft/capacitor-background-geolocation 9.0.2, @capacitor-mlkit/barcode-scanning 8.0.1
- Phase 24 RESEARCH.md -- existing driver app architecture, PowerSync schema, shared components
- Phase 24 codebase -- `apps/driver/src/` directory structure, existing PowerSync tables, camera helpers, shared UI
- CONTEXT.md (25-CONTEXT.md) -- locked decisions and spec references for all 6 screens
- Database migration 015 (`20260401000015_delivery.sql`) -- delivery domain table schemas

### Secondary (MEDIUM confidence)
- [Sygic Custom URL Scheme](https://www.sygic.com/developers/professional-navigation-sdk/android/api-examples/custom-url) -- deep-link format for truck navigation
- [HERE Deeplinking API](https://developer.here.com/documentation/deeplink-web/dev_guide/topics/request-format.html) -- HERE WeGo URL format
- [MapLibre GL v5 Breaking Changes](https://github.com/maplibre/maplibre-gl-js/issues/3834) -- subscription return from on(), canvasContextAttributes
- [PMTiles for MapLibre](https://docs.protomaps.com/pmtiles/maplibre) -- protocol setup, offline usage
- [Transistorsoft BG Geolocation](https://github.com/transistorsoft/capacitor-background-geolocation) -- geofencing API, license model
- [@capacitor-mlkit/barcode-scanning](https://www.npmjs.com/package/@capacitor-mlkit/barcode-scanning) -- Capacitor 8 compatible v8.0.1

### Tertiary (LOW confidence)
- HERE WeGo Pro deep-link parameters for truck dimensions -- not fully documented publicly, may need testing
- PMTiles Cairo tile extraction size estimate (200-400MB) -- based on general OSM area estimates, actual size depends on zoom levels included

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against npm, Capacitor 8 compatibility confirmed for all plugins
- Architecture: HIGH -- builds directly on Phase 24 patterns, new screens follow existing DriverCard/DriverButton conventions
- Pitfalls: HIGH -- based on plugin documentation, MapLibre v5 migration guide, and known Capacitor platform constraints

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days -- stable libraries, MapLibre v5 is mature, plugins are versioned for Cap 8)
