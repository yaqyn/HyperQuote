---
phase: 21-dispatch-module
plan: 01a
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/internal/package.json
  - apps/internal/src/types/dispatch.ts
  - apps/internal/src/lib/constraints.ts
  - apps/internal/src/__tests__/constraints.test.ts
  - apps/internal/src/__tests__/driver-compliance.test.ts
  - apps/internal/src/stores/dispatch.ts
  - apps/internal/src/locales/en/dispatch.json
  - apps/internal/src/locales/ar/dispatch.json
autonomous: true
requirements: [DISP-01, DISP-04]

must_haves:
  truths:
    - "Dispatch types define all domain entities for routes, vehicles, drivers, deliveries, POD, and GPS positions"
    - "Constraint validators correctly enforce Cairo truck ban, prayer times, Friday Jumu'ah, Khamsin, and equipment-tagged dispatch"
    - "Zustand store manages dispatch tab navigation and module-level UI state"
    - "maplibre-gl, react-map-gl, and supercluster installed in internal app"
  artifacts:
    - path: "apps/internal/src/types/dispatch.ts"
      provides: "All dispatch domain types"
      exports: ["DispatchTab", "DeliveryRoute", "RouteStop", "Vehicle", "Driver", "DriverType", "ComplianceItem", "GPSPosition", "VehicleStatus", "PODRecord", "PODValidationChecklist", "DeliveryIssue", "DriverPerformance", "ConstraintViolation", "VRPResult"]
    - path: "apps/internal/src/stores/dispatch.ts"
      provides: "Dispatch UI state"
      exports: ["useDispatchStore"]
    - path: "apps/internal/src/lib/constraints.ts"
      provides: "Scheduling constraint validators"
      exports: ["isCairoTruckBanViolation", "isPrayerTimeConflict", "isFridayJumuahBlocked", "isKhamsinBlocked", "isEquipmentRestricted", "validateAllConstraints"]
  key_links:
    - from: "apps/internal/src/lib/constraints.ts"
      to: "apps/internal/src/types/dispatch.ts"
      via: "imports DriverType, ConstraintViolation, PrayerTime, RouteStop, Driver, Vehicle"
      pattern: "import.*dispatch"
---

<objective>
Types, Zustand store, constraint validation library (with TDD tests), i18n keys, and dependency installation (maplibre-gl, react-map-gl, supercluster).

Purpose: Establish all type contracts, state management, and tested constraint validators so Plan 01b and Wave 2 plans can build against stable interfaces.
Output: All types exported, constraint validators tested, store created, i18n keys in both languages, map deps installed.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/21-dispatch-module/21-CONTEXT.md
@.planning/phases/21-dispatch-module/21-RESEARCH.md
@.planning/phases/21-dispatch-module/21-VALIDATION.md
@apps/internal/src/types/finance.ts
@apps/internal/src/stores/finance.ts
@apps/internal/src/locales/en/finance.json

<interfaces>
<!-- Existing patterns to follow -->

From apps/internal/src/stores/finance.ts:
```typescript
// Store pattern
import { create } from 'zustand'
interface FinanceStore {
  activeTab: FinanceTab
  setActiveTab: (tab: FinanceTab) => void
  // ... entity selection state
}
export const useFinanceStore = create<FinanceStore>((set) => ({...}))
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Types, constraints library (TDD), store, i18n, deps</name>
  <files>
    apps/internal/package.json,
    apps/internal/src/types/dispatch.ts,
    apps/internal/src/lib/constraints.ts,
    apps/internal/src/__tests__/constraints.test.ts,
    apps/internal/src/__tests__/driver-compliance.test.ts,
    apps/internal/src/stores/dispatch.ts,
    apps/internal/src/locales/en/dispatch.json,
    apps/internal/src/locales/ar/dispatch.json
  </files>
  <read_first>
    apps/internal/package.json,
    apps/internal/src/types/finance.ts,
    apps/internal/src/stores/finance.ts,
    apps/internal/src/locales/en/finance.json
  </read_first>
  <behavior>
    - isCairoTruckBanViolation(7000, new Date('2026-04-06T08:00'), true) === true (5+ tons, 8AM Cairo, Greater Cairo)
    - isCairoTruckBanViolation(4000, new Date('2026-04-06T08:00'), true) === false (under 5 tons, exempt)
    - isCairoTruckBanViolation(7000, new Date('2026-04-06T03:00'), true) === false (midnight-6AM window)
    - isCairoTruckBanViolation(7000, new Date('2026-04-06T08:00'), false) === false (not Greater Cairo)
    - isFridayJumuahBlocked(new Date('2026-04-10T12:00')) === true (Friday noon)
    - isFridayJumuahBlocked(new Date('2026-04-10T14:00')) === false (Friday 2PM, after blackout)
    - isFridayJumuahBlocked(new Date('2026-04-09T12:00')) === false (Thursday noon)
    - isKhamsinBlocked(35, true) === true (wind > 30 km/h with sheet materials)
    - isKhamsinBlocked(25, true) === false (wind <= 30)
    - isKhamsinBlocked(35, false) === false (no sheet materials)
    - isEquipmentRestricted('moffett', 'ON_DEMAND') === true (equipment job to on-demand)
    - isEquipmentRestricted('moffett', 'INTERNAL') === false
    - isEquipmentRestricted('none', 'ON_DEMAND') === false (light load, on-demand OK)
    - isPrayerTimeConflict checks time within 15min buffer of prayer
    - Driver compliance: expired license blocks dispatch, valid license allows dispatch
  </behavior>
  <action>
    1. Install map dependencies: `cd apps/internal && bun add maplibre-gl react-map-gl supercluster @types/supercluster`

    2. Create `apps/internal/src/types/dispatch.ts` with ALL dispatch domain types:
       - `DispatchTab = 'home' | 'route-planning' | 'live-map' | 'driver-management' | 'delivery-log'`
       - `VehicleStatus = 'loading' | 'transit' | 'at_site' | 'delivered' | 'problem' | 'offline'`
       - `DriverType = 'INTERNAL' | 'CONTRACTED' | 'ON_DEMAND'`
       - `DeliveryRoute` with id, driverId, vehicleId, stops (RouteStop[]), date, status, totalWeight, totalDistance, estimatedDuration
       - `RouteStop` with id, deliveryId, orderId, customerName, address, lat, lng, weight, equipmentNeeded, timeWindow (start/end), sequence, status
       - `Vehicle` with id, plateNumber, type, capacityKg, hasEquipment (moffett/boom/crane), currentDriverId, status
       - `Driver` with id, name, type (DriverType), phone, vehicleId, licenseExpiry, medicalExpiry, certifications (string[]), complianceStatus ('valid'|'expiring'|'expired'|'blocked'), activeRouteId, available
       - `ComplianceItem` with type, label, expiryDate, status ('valid'|'expiring'|'expired')
       - `GPSPosition` with driverId, lat, lng, speed, heading, timestamp, status (VehicleStatus)
       - `PODRecord` with id, deliveryId, driverId, photos (string[]), signatureUrl, gpsLat, gpsLng, timestamp, deliveredQty (Record<string, number>), driverNotes, durationMinutes, autoChecksPassed
       - `PODValidationChecklist` with photosOk, signatureOk, quantitiesOk, gpsOk, noDamage (all boolean)
       - `DeliveryIssue` with id, deliveryId, type ('partial'|'damage'|'wrong_items'|'signature_issue'|'customer_unavailable'|'access_denied'|'other'), description, photos
       - `DriverPerformance` with driverId, onTimeRate, podComplianceRate, damageRate, avgDeliveriesPerDay, avgDeliveryDuration
       - `ConstraintViolation` with type ('cairo_ban'|'prayer_time'|'jumuah'|'khamsin'|'equipment'|'cdl'|'capacity'), message, severity ('error'|'warning')
       - `VRPResult` with optimizedStops (RouteStop[]), estimatedDuration (minutes), estimatedDistance (km), timeWindowViolations (number)
       - `PrayerTime` with name, time (Date)

    3. Create `apps/internal/src/lib/constraints.ts` with pure functions:
       - `isCairoTruckBanViolation(weightKg: number, scheduledTime: Date, isGreaterCairo: boolean): boolean` — 5+ tons blocked 6AM-midnight in Greater Cairo. Use `Intl.DateTimeFormat('en', { timeZone: 'Africa/Cairo', hour: 'numeric', hour12: false })` to get Cairo hour.
       - `isPrayerTimeConflict(scheduledTime: Date, prayerTimes: PrayerTime[], bufferMinutes = 15): PrayerTime | null` — returns conflicting prayer or null
       - `isFridayJumuahBlocked(scheduledTime: Date): boolean` — Friday 11:30-13:30 blocked. Must check day is Friday (getDay() === 5 in Cairo timezone).
       - `isKhamsinBlocked(windSpeedKmh: number, hasSheetMaterials: boolean): boolean` — wind > 30 + sheet materials
       - `isEquipmentRestricted(equipmentNeeded: string, driverType: DriverType): boolean` — moffett/boom/cdl jobs only INTERNAL or CONTRACTED
       - `validateAllConstraints(stop: RouteStop, driver: Driver, vehicle: Vehicle, date: Date, weather?: { windSpeedKmh: number }): ConstraintViolation[]` — aggregates all checks
       - `isDriverComplianceValid(driver: Driver): boolean` — checks license/medical not expired
       - Static Cairo prayer times lookup by month (approximate, per RESEARCH.md recommendation)

    4. Write tests FIRST in `apps/internal/src/__tests__/constraints.test.ts` covering all behaviors listed above. Tests must FAIL initially (RED), then implement to make them GREEN.

    5. Write `apps/internal/src/__tests__/driver-compliance.test.ts`:
       - Expired license -> blocked
       - Valid license -> allowed
       - Expiring soon (within 30 days) -> 'expiring' status but still allowed
       - Missing medical -> blocked

    6. Create `apps/internal/src/stores/dispatch.ts` following finance.ts pattern:
       - `activeTab: DispatchTab` (default 'home')
       - `setActiveTab(tab)`
       - `selectedDriverId: string | null`
       - `setSelectedDriverId(id)`
       - `selectedDeliveryId: string | null`
       - `setSelectedDeliveryId(id)`
       - `selectedRouteId: string | null`
       - `setSelectedRouteId(id)`
       - `mapViewport: { latitude: number; longitude: number; zoom: number }` (default Cairo: 30.0444, 31.2357, zoom 11)
       - `setMapViewport(viewport)`
       - `routePlanningDate: string` (default tomorrow's date ISO)
       - `setRoutePlanningDate(date)`

    7. Create i18n files `apps/internal/src/locales/en/dispatch.json` and `ar/dispatch.json` with keys for: tabs (home, routePlanning, liveMap, driverManagement, deliveryLog, reports), home view labels, constraint messages, POD validation labels, driver management labels. Arabic translations must be real Arabic, not transliterated.
  </action>
  <verify>
    <automated>cd apps/internal && bun run vitest run src/__tests__/constraints.test.ts src/__tests__/driver-compliance.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - grep -q "maplibre-gl" apps/internal/package.json
    - grep -q "react-map-gl" apps/internal/package.json
    - grep -q "supercluster" apps/internal/package.json
    - grep -q "DispatchTab" apps/internal/src/types/dispatch.ts
    - grep -q "isCairoTruckBanViolation" apps/internal/src/lib/constraints.ts
    - grep -q "isFridayJumuahBlocked" apps/internal/src/lib/constraints.ts
    - grep -q "isKhamsinBlocked" apps/internal/src/lib/constraints.ts
    - grep -q "isEquipmentRestricted" apps/internal/src/lib/constraints.ts
    - grep -q "useDispatchStore" apps/internal/src/stores/dispatch.ts
    - grep -q "routePlanning" apps/internal/src/locales/en/dispatch.json
  </acceptance_criteria>
  <done>All dispatch types exported, constraint validators passing all tests (Cairo ban, prayer times, Jumu'ah, Khamsin, equipment restrictions, driver compliance), store created, i18n keys in both languages, map deps installed.</done>
</task>

</tasks>

<verification>
- All constraint tests pass: `cd apps/internal && bun run vitest run src/__tests__/constraints.test.ts src/__tests__/driver-compliance.test.ts --reporter=verbose`
- maplibre-gl, react-map-gl, supercluster in package.json
- Types export all domain entities
- Store exports useDispatchStore
</verification>

<success_criteria>
All dispatch types exported, constraint validators tested and passing, Zustand store created, i18n keys in both languages, map dependencies installed. Plan 01b can build UI components against these contracts.
</success_criteria>

<output>
After completion, create `.planning/phases/21-dispatch-module/21-01a-SUMMARY.md`
</output>
