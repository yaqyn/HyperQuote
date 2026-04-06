# Phase 26: Driver Remaining - Research

**Researched:** 2026-04-06
**Domain:** Exception reporting, end-of-day workflows, external driver marketplace, offline-capable mobile
**Confidence:** HIGH

## Summary

Phase 26 completes the driver app by adding three major feature groups to the existing Capacitor SPA: (1) exception reporting with 7 guided workflows and photo evidence, (2) end-of-day shift closure with returns processing, post-trip DVIR, fuel reporting, and shift summary, (3) external driver job offers and earnings dashboard. All features must work offline via PowerSync, with mutations queuing in local SQLite and syncing on reconnect.

The Phase 24/25 codebase provides a solid foundation: TanStack Router with 8 routes, PowerSync schema with 11 tables (vehicles, shifts, inspections, deliveries, delivery_items, routes, route_stops, load_verifications, proof_of_delivery, upload_queue, vehicle_inspection_items), Zustand stores for auth/shift/route/delivery/loading, camera helpers with compression, upload queue with retry, and shared DriverButton/DriverCard components. The existing `delivery_failure_reason` enum in Supabase covers 10 failure types, and the `driver_jobs`/`driver_earnings` tables already exist in the DB schema (migration 017).

Phase 26 extends the PowerSync schema with tables for delivery_exceptions (detailed exception data), driver_jobs, driver_earnings, driver_withdrawals, and shift_returns. It adds 5-7 new routes and 3 new Zustand stores.

**Primary recommendation:** Build in layers: (1) PowerSync schema extension for exceptions + external driver tables, (2) exception reporting guided workflows (7 types), (3) end-of-day multi-step flow, (4) external driver job offers, (5) external driver earnings dashboard.

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

### Claude's Discretion
- Exception workflow step component architecture (single component with type switch vs per-type components)
- End-of-day step flow navigation pattern (linear wizard vs free-form checklist)
- Job offer card layout and countdown timer implementation
- Earnings dashboard chart library (if any) vs pure CSS/Geist Mono display
- Withdrawal form UX
- How to handle the 15-minute wait timer for Customer Unavailable exception

### Deferred Ideas (OUT OF SCOPE)
- Communication / in-app messaging (Screen 12 -- deferred, stub already on home screen)
- Push notifications for job offers (requires push infrastructure)
- WhatsApp integration for dispatch communication (Phase 27: INTG-01)
- Actual Supabase Storage upload wiring (upload-queue.ts has TODO)
- Auto-payout backend logic (server-side cron, not driver app scope)
- Masked phone number proxy for customer calls (telephony infrastructure)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRV-09 | Exception reporting: 7 failure types with photo evidence + reason categorization | `delivery_failure_reason` enum exists in DB, guided workflow per type from FRONTEND.md Screen 11, photos via existing camera.ts + upload-queue.ts |
| DRV-10 | End of day: shift summary, returns processing, post-trip DVIR, odometer, sign-off | `driver_shifts` table has end fields (end_odometer, fuel_level_end, post_trip_inspection_id), `vehicle_inspections` supports `post_trip` type, `returns` table exists in DB |
| DRV-11 | External driver: job offers (accept/decline with payout), earnings dashboard | `driver_jobs` and `driver_earnings` tables exist in DB (migration 017), `drivers.driver_type` enum distinguishes internal/contracted/on_demand |
</phase_requirements>

## Standard Stack

### Core (Existing from Phase 24/25 -- no new dependencies needed)

| Library | Version | Purpose | Already Installed |
|---------|---------|---------|-------------------|
| `@capacitor/camera` | 8.0.2 | Exception photos, fuel receipt | Yes |
| `@capacitor/geolocation` | 8.2.0 | GPS-tag exceptions | Yes |
| `@capacitor/haptics` | 8.0.2 | Haptic feedback on actions | Yes |
| `@powersync/capacitor` | 0.5.2 | Offline SQLite sync | Yes |
| `@tanstack/react-router` | 1.168.10 | SPA routing | Yes |
| `zustand` | 5.0.12 | State management | Yes |
| `react-hook-form` | 7.72.0 | Form handling | Yes |
| `react-signature-canvas` | 1.0.7 | DVIR signature, shift sign-off | Yes |
| `motion` | 12.38.0 | Animations | Yes |

### No New Dependencies

Phase 26 requires zero new package installations. All needed capabilities (camera, GPS, offline sync, forms, signatures) are already available from Phase 24/25. This is by design -- the driver app scaffold was built to support all driver features.

## Architecture Patterns

### New Routes for Phase 26
```
apps/driver/src/
├── routes/
│   ├── exception.tsx              # Screen 11: Exception reporting wizard
│   ├── end-of-day.tsx             # Screen 13: End of day multi-step
│   ├── job-offers.tsx             # Screen 14: Job listing (external only)
│   ├── job-detail.tsx             # Screen 14: Single job detail + accept
│   └── earnings.tsx               # Screen 15: Earnings dashboard
├── components/
│   ├── exception/
│   │   ├── ExceptionWizard.tsx     # Coordinator: selects type, shows steps
│   │   ├── CustomerUnavailable.tsx  # Type 1: call log, wait timer, actions
│   │   ├── SiteBlocked.tsx          # Type 2: photo, blockage type, actions
│   │   ├── WrongAddress.tsx         # Type 3: photo, text, recalculate
│   │   ├── DamagedGoods.tsx         # Type 4: item select, damage type, photos
│   │   ├── PartialDelivery.tsx      # Type 5: item checkboxes, dispatch contact
│   │   ├── WeatherDelay.tsx         # Type 6: condition, impact, Khamsin check
│   │   ├── VehicleIssue.tsx         # Type 7: issue type, severity, emergency
│   │   └── ExceptionSummary.tsx     # Review + submit
│   ├── end-of-day/
│   │   ├── ReturnsList.tsx          # Returns processing with reason codes
│   │   ├── FuelReport.tsx           # Fuel gauge selector + receipt photo
│   │   ├── PostTripDVIR.tsx         # Reuses inspection components from Phase 24
│   │   ├── EndOdometer.tsx          # Numeric input + photo
│   │   ├── DaySummary.tsx           # Stats in Geist Mono
│   │   └── ShiftSignOff.tsx         # Signature + red "End Shift" button
│   ├── jobs/
│   │   ├── JobCard.tsx              # Job offer card with countdown
│   │   ├── JobDetail.tsx            # Full job details + accept/decline
│   │   └── CountdownTimer.tsx       # Geist Mono countdown, large
│   └── earnings/
│       ├── EarningsSummary.tsx       # This week/month/pending/available
│       ├── EarningsHistory.tsx       # Per-job breakdown list
│       ├── EarningsBreakdown.tsx     # Expandable row: base + bonuses
│       ├── WithdrawalForm.tsx        # Amount + bank account + submit
│       └── RatingDisplay.tsx         # Star rating + metrics
├── stores/
│   ├── exception.ts                 # Active exception state
│   ├── end-of-day.ts               # EOD step state + returns
│   └── external-driver.ts          # Job offers + earnings state
```

### Pattern 1: Exception Wizard with Type-Specific Steps
**What:** A coordinator component that renders the appropriate guided workflow based on exception type selection. Each type has its own component with pre-filled data from context (delivery, stop, call log).
**When to use:** Exception reporting (triggered from stop detail, delivery, or route overview).
**Example:**
```typescript
// stores/exception.ts
import { create } from 'zustand'
import { db } from '../lib/powersync'

export type ExceptionType =
  | 'customer_unavailable'
  | 'site_blocked'
  | 'wrong_address'
  | 'damaged_goods'
  | 'partial_delivery'
  | 'weather_delay'
  | 'vehicle_issue'

interface ExceptionState {
  type: ExceptionType | null
  deliveryId: string | null
  stopId: string | null
  photos: string[]
  gpsLat: number | null
  gpsLng: number | null
  details: Record<string, unknown>
  step: number

  setType: (type: ExceptionType) => void
  setDelivery: (deliveryId: string, stopId: string) => void
  addPhoto: (uri: string) => void
  removePhoto: (index: number) => void
  setDetails: (key: string, value: unknown) => void
  setGps: (lat: number, lng: number) => void
  nextStep: () => void
  prevStep: () => void
  submit: () => Promise<string>
  reset: () => void
}

export const useExceptionStore = create<ExceptionState>((set, get) => ({
  type: null,
  deliveryId: null,
  stopId: null,
  photos: [],
  gpsLat: null,
  gpsLng: null,
  details: {},
  step: 0,

  setType: (type) => set({ type, step: 1 }),
  setDelivery: (deliveryId, stopId) => set({ deliveryId, stopId }),
  addPhoto: (uri) => set({ photos: [...get().photos, uri] }),
  removePhoto: (index) => set({ photos: get().photos.filter((_, i) => i !== index) }),
  setDetails: (key, value) => set({ details: { ...get().details, [key]: value } }),
  setGps: (lat, lng) => set({ gpsLat: lat, gpsLng: lng }),
  nextStep: () => set({ step: get().step + 1 }),
  prevStep: () => set({ step: Math.max(0, get().step - 1) }),

  submit: async () => {
    const state = get()
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    await db.execute(
      `INSERT INTO delivery_exceptions (id, delivery_id, stop_id, type, photos, gps_lat, gps_lng, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, state.deliveryId, state.stopId, state.type, JSON.stringify(state.photos),
       state.gpsLat, state.gpsLng, JSON.stringify(state.details), now]
    )

    // Update delivery failure reason
    if (state.deliveryId) {
      const failureMap: Record<ExceptionType, string> = {
        customer_unavailable: 'customer_absent',
        site_blocked: 'access_blocked',
        wrong_address: 'wrong_address',
        damaged_goods: 'damaged_in_transit',
        partial_delivery: 'customer_refused',
        weather_delay: 'weather',
        vehicle_issue: 'vehicle_breakdown',
      }
      await db.execute(
        'UPDATE deliveries SET failure_reason = ?, failure_notes = ? WHERE id = ?',
        [failureMap[state.type!], JSON.stringify(state.details), state.deliveryId]
      )
    }

    // Queue photos for upload
    for (const photoUri of state.photos) {
      await db.execute(
        `INSERT INTO upload_queue (id, file_uri, upload_type, entity_id, status, retry_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), photoUri, 'exception', id, 'pending', 0, now]
      )
    }

    return id
  },

  reset: () => set({
    type: null, deliveryId: null, stopId: null,
    photos: [], gpsLat: null, gpsLng: null, details: {}, step: 0,
  }),
}))
```

### Pattern 2: End-of-Day Linear Wizard
**What:** A multi-step flow that gates shift closure behind required data collection. Steps: Returns -> Fuel -> Post-Trip DVIR -> Odometer -> Summary -> Sign-Off. Steps are linear (must complete in order). External drivers skip Returns and DVIR.
**When to use:** End of day flow.
**Example:**
```typescript
// stores/end-of-day.ts
export type EODStep =
  | 'returns'
  | 'fuel'
  | 'post-trip-dvir'
  | 'odometer'
  | 'summary'
  | 'sign-off'

// For external drivers: skip 'returns' and 'post-trip-dvir'
function getStepsForDriverType(driverType: string): EODStep[] {
  if (driverType === 'internal') {
    return ['returns', 'fuel', 'post-trip-dvir', 'odometer', 'summary', 'sign-off']
  }
  // external (contracted/on_demand) -> no returns, no DVIR
  return ['fuel', 'odometer', 'summary', 'sign-off']
}
```

### Pattern 3: Job Offer with Countdown Timer
**What:** Job cards with real-time countdown (Geist Mono, large). Countdown drives from `expires_at` timestamp. First-to-accept model for on_demand; 30-minute window for contracted.
**When to use:** External driver job offers screen.
**Example:**
```typescript
// components/jobs/CountdownTimer.tsx
import { useState, useEffect } from 'react'

export function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining('00:00')
        return
      }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setRemaining(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return (
    <span style={{ fontFamily: 'var(--font-mono)' }} className="text-2xl font-medium">
      {remaining}
    </span>
  )
}
```

### Pattern 4: Reuse Existing Inspection Components for Post-Trip DVIR
**What:** Post-trip DVIR uses the same 10-item checklist as pre-trip (Phase 24's `DVIRChecklist`, `InspectionItem`, `SignOff`). Pre-trip defects are shown at top. New defects require photos.
**When to use:** End-of-day post-trip inspection step.

### Anti-Patterns to Avoid
- **Building exception forms as blank text areas:** Each exception type has a guided workflow with specific fields. Pre-fill from context (delivery, call log, manifest).
- **Allowing End Shift without flushing upload queue:** The End Shift action must trigger a final PowerSync sync attempt. Remaining queued data pushes on reconnect, but the attempt must be made.
- **Showing job offers to internal drivers:** Job offers are for `on_demand` and `contracted` driver types only. Gate the route with a driver type check.
- **Hardcoding 5% withholding:** Use a constant but document the Egyptian tax law source. The rate is 5% for services (not 1% for goods).
- **Blocking End Shift on failed sync:** If offline, End Shift should still complete locally. Data syncs when back online.

## PowerSync Schema Extension

New tables needed in the PowerSync local schema:

```typescript
const delivery_exceptions = new Table({
  delivery_id: column.text,
  stop_id: column.text,
  type: column.text,          // ExceptionType
  photos: column.text,         // JSON array of URIs
  gps_lat: column.real,
  gps_lng: column.real,
  details: column.text,        // JSON object with type-specific fields
  resolution: column.text,     // 'wait' | 'skip' | 'failed' | 'reroute'
  dispatch_notified: column.text, // boolean as text
  created_at: column.text,
})

const driver_jobs = new Table({
  delivery_id: column.text,
  status: column.text,         // available/offered/accepted/declined/expired/completed/cancelled
  offered_at: column.text,
  expires_at: column.text,
  accepted_at: column.text,
  completed_at: column.text,
  payout_amount: column.real,
  payout_currency: column.text,
  pickup_address: column.text,
  delivery_address: column.text,
  estimated_distance_km: column.real,
  estimated_duration_minutes: column.integer,
  materials_summary: column.text,
  total_weight_kg: column.real,
  requires_moffett: column.text,
  requires_boom: column.text,
})

const driver_earnings = new Table({
  driver_id: column.text,
  period_start: column.text,
  period_end: column.text,
  total_jobs: column.integer,
  total_earned: column.real,
  withholding_tax: column.real,
  net_payable: column.real,
  status: column.text,
  paid_at: column.text,
})

const driver_withdrawals = new Table({
  driver_id: column.text,
  amount: column.real,
  bank_account_id: column.text,
  status: column.text,         // pending/processing/completed/failed
  requested_at: column.text,
  completed_at: column.text,
})

const shift_returns = new Table({
  shift_id: column.text,
  delivery_id: column.text,
  delivery_item_id: column.text,
  product_name: column.text,
  quantity: column.real,
  unit: column.text,
  reason: column.text,         // damaged/customer_refused/not_needed/other
  linked_exception_id: column.text,
  notes: column.text,
  created_at: column.text,
})
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Countdown timer | Custom date math | `Date.getTime()` diff with `setInterval` | Simple enough to inline, but ensure cleanup |
| Photo capture + compression | Raw camera API | Existing `camera.ts` helpers | Already handles permissions, compression to 1920px/JPEG 0.7 |
| Upload queue | New upload logic | Existing `upload-queue.ts` | Already has retry logic, pending count, status tracking |
| DVIR checklist | New inspection UI | Existing `DVIRChecklist` + `InspectionItem` components | Same 10-item checklist, just `inspection_type: 'post_trip'` |
| Offline mutations | Custom sync | PowerSync `db.execute()` | Automatic sync via SupabaseConnector.uploadData |
| Signature capture | Canvas drawing code | `react-signature-canvas` | Already used in Phase 24 shift sign-off |

**Key insight:** Phase 26 is primarily UI + state management work. All underlying infrastructure (offline sync, camera, upload queue, signature capture) was built in Phase 24/25.

## Common Pitfalls

### Pitfall 1: Exception Photos Filling Device Storage
**What goes wrong:** Multiple exceptions with 4-6 photos each (especially damaged goods) can accumulate hundreds of MB on device.
**Why it happens:** Photos are captured at 1920px, stored locally, and may not upload for hours if offline.
**How to avoid:** Monitor queue size in the exception store. Show a warning if pending uploads exceed 50 items or estimated 200MB. Consider a lower quality (60 vs 70) for exception photos since they're evidence, not publication-quality.
**Warning signs:** `getPendingUploadCount()` returning high numbers.

### Pitfall 2: 15-Minute Wait Timer Must Survive App Background
**What goes wrong:** Customer Unavailable exception requires a 15-minute mandatory wait. Timer resets if app goes to background.
**Why it happens:** `setInterval` is paused when Capacitor app is backgrounded.
**How to avoid:** Store the timer start timestamp in PowerSync/Zustand (`waitStartedAt: ISO string`). On foreground, compute elapsed from stored timestamp. The timer is a display concern, not a setInterval concern.
**Warning signs:** Timer showing wrong time after returning from background.

### Pitfall 3: External Driver Type Check Missing
**What goes wrong:** Internal drivers see job offers or earnings screens.
**Why it happens:** Routes not gated by driver type.
**How to avoid:** Check `driverProfile.driver_type` in the auth store. Gate `/job-offers` and `/earnings` routes to `contracted` and `on_demand` types only. Redirect others to home.
**Warning signs:** Internal driver navigating to earnings screen.

### Pitfall 4: End Shift Must Update Multiple Tables Atomically
**What goes wrong:** End Shift updates `driver_shifts` but forgets to update route status, delivery statuses, or create the post-trip inspection record.
**Why it happens:** Multiple tables need coordinated updates.
**How to avoid:** The `endShift` action in the store should execute all updates in sequence: (1) insert post-trip inspection, (2) update shift record (end fields), (3) update route status to `completed`, (4) flush upload queue. Use PowerSync's local transactions.
**Warning signs:** Shift marked completed but route still shows `in_progress`.

### Pitfall 5: 5% Withholding Tax Calculation Precision
**What goes wrong:** Floating point arithmetic produces incorrect tax amounts (e.g., EGP 42.500000001).
**Why it happens:** JavaScript floating point.
**How to avoid:** `Math.round(amount * 5) / 100` per the same pattern used in Phase 12 for VAT. Display with exactly 2 decimal places using `Intl.NumberFormat`.
**Warning signs:** Earnings totals not adding up (total_earned - withholding != net_payable).

### Pitfall 6: 48-Hour Hold Logic is Server-Side
**What goes wrong:** Driver app tries to compute "Available" balance from pending earnings.
**Why it happens:** The 48-hour hold (job completion -> available for withdrawal) must be computed by the server, not the client.
**How to avoid:** The `driver_earnings` table has `status` field (pending/approved/paid). The driver app reads this status -- it does not compute availability. Server-side cron or trigger moves `pending` to `approved` after 48 hours. The app just displays what PowerSync syncs.
**Warning signs:** Amount showing as "Available" before 48 hours.

### Pitfall 7: Fuel Level Below Minimum Warning
**What goes wrong:** Driver ends shift with fuel below 1/2 tank, system allows it.
**Why it happens:** Fuel check is a warning, not a hard gate (per spec: "Fill up before ending shift").
**How to avoid:** Show a prominent warning if fuel < 1/2 but DO NOT block End Shift. The warning should be a yellow banner, not a blocking modal. Log the low-fuel state in the shift record.
**Warning signs:** No feedback when fuel is reported low.

## Code Examples

### Exception Type Selection Screen
```typescript
// Pattern for the exception type picker (first step)
const EXCEPTION_TYPES: Array<{
  type: ExceptionType
  labelKey: string
  icon: string
  requiresPhoto: boolean
}> = [
  { type: 'customer_unavailable', labelKey: 'exception.customerUnavailable', icon: 'person-off', requiresPhoto: false },
  { type: 'site_blocked', labelKey: 'exception.siteBlocked', icon: 'block', requiresPhoto: true },
  { type: 'wrong_address', labelKey: 'exception.wrongAddress', icon: 'map-off', requiresPhoto: true },
  { type: 'damaged_goods', labelKey: 'exception.damagedGoods', icon: 'warning', requiresPhoto: true },
  { type: 'partial_delivery', labelKey: 'exception.partialDelivery', icon: 'package-split', requiresPhoto: false },
  { type: 'weather_delay', labelKey: 'exception.weatherDelay', icon: 'cloud-rain', requiresPhoto: true },
  { type: 'vehicle_issue', labelKey: 'exception.vehicleIssue', icon: 'truck-alert', requiresPhoto: true },
]
// Render as a grid of 56dp-min-height buttons in a DriverCard
```

### End Shift with Data Flush
```typescript
// End shift must coordinate multiple updates
async function endShift(state: EODState) {
  const now = new Date().toISOString()
  const gps = await getCurrentPosition() // may fail if GPS off

  // 1. Insert post-trip inspection (if internal driver)
  let postTripId: string | null = null
  if (state.postTripInspection) {
    postTripId = crypto.randomUUID()
    await db.execute(
      `INSERT INTO vehicle_inspections (id, vehicle_id, driver_id, inspection_type, status, odometer_reading, signature_url, gps_lat, gps_lng, created_at)
       VALUES (?, ?, ?, 'post_trip', ?, ?, ?, ?, ?, ?)`,
      [postTripId, state.vehicleId, state.driverId,
       state.hasMajorDefect ? 'failed' : 'passed',
       state.endOdometer, state.signatureDataUrl,
       gps?.lat ?? 0, gps?.lng ?? 0, now]
    )
  }

  // 2. Update shift record
  await db.execute(
    `UPDATE driver_shifts SET ended_at = ?, status = 'completed',
     end_odometer = ?, end_location = ?,
     fuel_level_end = ?, post_trip_inspection_id = ?
     WHERE id = ?`,
    [now, state.endOdometer, gps ? JSON.stringify(gps) : '',
     state.fuelLevel, postTripId, state.shiftId]
  )

  // 3. Update route status
  if (state.routeId) {
    await db.execute(
      'UPDATE routes SET status = ?, actual_finish = ? WHERE id = ?',
      ['completed', now, state.routeId]
    )
  }

  // 4. Process returns
  for (const ret of state.returns) {
    await db.execute(
      `INSERT INTO shift_returns (id, shift_id, delivery_id, delivery_item_id, product_name, quantity, unit, reason, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), state.shiftId, ret.deliveryId, ret.itemId,
       ret.productName, ret.quantity, ret.unit, ret.reason, ret.notes, now]
    )
  }

  // 5. Attempt sync flush (best effort)
  try {
    await processUploadQueue()
  } catch {
    // Offline -- will sync on reconnect
  }
}
```

### Earnings Display with Withholding
```typescript
// Egyptian 5% services withholding tax display
function formatEarnings(totalEarned: number) {
  const withholding = Math.round(totalEarned * 5) / 100
  const net = totalEarned - withholding
  // Display all amounts in Geist Mono
  return { totalEarned, withholding, net }
}

// Per-job breakdown expandable row
interface JobEarningBreakdown {
  basePay: number
  distanceBonus: number      // > 30km
  heavyLoadSurcharge: number // > 3,000kg
  nightPremium: number       // 10PM-6AM
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Paper-based exception forms | Digital guided workflows with photo evidence | Industry standard 2023+ | Faster dispatch notification, audit trail |
| Manual fuel log sheets | In-app fuel gauge reporting | Standard in fleet management apps | Real-time fleet fuel tracking |
| Cash payouts only | Bank transfer + office cash + auto-payout | Standard in gig economy platforms | Faster driver payment, lower admin overhead |
| Fixed per-trip pay | Base + distance + weight + time bonuses | Standard in logistics platforms | Fairer compensation, driver retention |

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
| DRV-09 | Exception store: 7 types create records | unit | `bun run test -- src/stores/exception.test.ts` | Wave 0 |
| DRV-09 | Exception type -> failure_reason mapping | unit | `bun run test -- src/stores/exception.test.ts` | Wave 0 |
| DRV-09 | Photo queue integration for exceptions | unit | `bun run test -- src/stores/exception.test.ts` | Wave 0 |
| DRV-10 | EOD step progression (internal vs external) | unit | `bun run test -- src/stores/end-of-day.test.ts` | Wave 0 |
| DRV-10 | End shift updates multiple tables | unit | `bun run test -- src/stores/end-of-day.test.ts` | Wave 0 |
| DRV-10 | Fuel level warning (< 1/2) | unit | `bun run test -- src/stores/end-of-day.test.ts` | Wave 0 |
| DRV-11 | Job offer accept/decline mutations | unit | `bun run test -- src/stores/external-driver.test.ts` | Wave 0 |
| DRV-11 | Earnings withholding calculation (5%) | unit | `bun run test -- src/stores/external-driver.test.ts` | Wave 0 |
| DRV-11 | Withdrawal minimum (EGP 500) validation | unit | `bun run test -- src/stores/external-driver.test.ts` | Wave 0 |
| DRV-11 | Driver type gate (only external sees jobs) | unit | `bun run test -- src/stores/external-driver.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd apps/driver && bun run test -- --run`
- **Per wave merge:** Full suite
- **Phase gate:** Full suite green before verify

### Wave 0 Gaps
- [ ] `apps/driver/src/stores/exception.test.ts` -- covers DRV-09
- [ ] `apps/driver/src/stores/end-of-day.test.ts` -- covers DRV-10
- [ ] `apps/driver/src/stores/external-driver.test.ts` -- covers DRV-11

## DB-to-PowerSync Mapping

The following Supabase tables map to PowerSync local schema:

| Supabase Table | PowerSync Table | Sync Direction | Notes |
|----------------|-----------------|----------------|-------|
| `deliveries` (failure_reason, failure_notes) | `deliveries` (existing) | Bidirectional | Exception updates failure_reason |
| N/A (no dedicated exception table) | `delivery_exceptions` (new, local) | Upload only | Detailed exception data, syncs via uploadData |
| `driver_jobs` | `driver_jobs` (new) | Download + accept/decline | Jobs pushed from server, driver accepts locally |
| `driver_earnings` | `driver_earnings` (new) | Download only | Computed server-side, read-only on client |
| `driver_shifts` | `driver_shifts` (existing) | Bidirectional | End-of-day updates end fields |
| `vehicle_inspections` | `vehicle_inspections` (existing) | Upload only | Post-trip DVIR created locally |
| `returns` | `shift_returns` (new, local) | Upload only | Simplified return records, full returns created server-side |

## Sources

### Primary (HIGH confidence)
- CONTEXT.md -- locked decisions from user discussion
- FRONTEND.md spec -- Screens 11-15 specifications (via CONTEXT.md extraction)
- BACKEND.md spec -- Server function signatures (via CONTEXT.md extraction)
- Supabase migrations (20260401000015, 20260401000017) -- DB schema for deliveries, driver_jobs, driver_earnings
- Supabase enums (20260331000002) -- delivery_failure_reason, driver_type, return_status
- Existing driver app code -- PowerSync schema, stores, components, routes

### Secondary (MEDIUM confidence)
- Phase 24 RESEARCH.md -- Architecture patterns, pitfalls, Capacitor plugin usage
- Phase 25 RESEARCH.md -- Map, geofencing, barcode, upload queue patterns

### Tertiary (LOW confidence)
- None -- all findings based on existing codebase and spec

## Project Constraints (from CLAUDE.md)

- **Bun, NOT npm:** All package operations use `bun add`, `bun install`, `bun run`
- **React Aria Components, NOT shadcn:** All interactive UI (buttons, selects, checkboxes, radio groups)
- **Motion v12:** Import from `motion/react`, NOT `framer-motion`
- **Colors in `:root {}`, NEVER `@theme`:** Tailwind v4 color registration rule
- **`useWatch()` NEVER `watch()`:** React 19 compatibility
- **Geist Mono for ALL numbers:** Earnings, distances, times, weights, IDs, countdowns
- **Arabic-Indic numerals:** All numbers in Arabic locale context via `Intl.NumberFormat('ar-EG')`
- **56dp minimum touch targets:** All buttons, especially emergency and exception actions
- **Photo compression:** 1920px max, JPEG 0.7 before queuing
- **Offline-first:** All mutations via PowerSync, sync on reconnect
- **No server functions:** Driver app calls Supabase directly (RLS-protected)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all existing from Phase 24/25
- Architecture: HIGH -- follows established patterns from Phase 24/25 codebase
- Pitfalls: HIGH -- based on existing code review and spec requirements
- DB schema: HIGH -- verified against actual migration files

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (30 days -- stable, no new dependencies)
