---
phase: 25-driver-route-delivery-pod
plan: 02
subsystem: ui
tags: [maplibre, capacitor, geofence, truck-ban, navigation, sygic, motion-v12, i18n]

# Dependency graph
requires:
  - phase: 25-01
    provides: Zustand stores (route, delivery, shift), lib modules (map, navigation, truck-ban, geofence)
provides:
  - Route overview screen with map + list toggle
  - Stop detail screen with customer info, truck ban, PPE gate, navigation
  - StopCard, StopStatusBadge, RouteMap, RouteList components
  - Full AR+EN i18n for route and stop detail
affects: [25-03-delivery-pod, 25-04-proof-of-delivery, 26-exception-report]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bottom sheet via Motion v12 spring animation
    - MapLibre numbered markers with status-coded colors
    - Geofence DWELL auto-arrival pattern
    - PPE acknowledgment gate before action buttons

key-files:
  created:
    - apps/driver/src/routes/route-overview.tsx
    - apps/driver/src/routes/stop-detail.tsx
    - apps/driver/src/components/route/RouteMap.tsx
    - apps/driver/src/components/route/RouteList.tsx
    - apps/driver/src/components/route/StopCard.tsx
    - apps/driver/src/components/route/StopStatusBadge.tsx
  modified:
    - apps/driver/src/router.ts
    - apps/driver/src/routes/home.tsx
    - apps/driver/src/i18n/locales/en/driver.json
    - apps/driver/src/i18n/locales/ar/driver.json

key-decisions:
  - "StopCard uses React Aria Button for accessibility with 56dp min height"
  - "RouteList bottom sheet toggles expand via click on drag handle (simplified vs full drag gesture)"
  - "Delivery window status computed client-side comparing current time to window end"
  - "Phone masking shows first 4 and last 2 digits for privacy"

patterns-established:
  - "Status color mapping: shared record-based lookup for badge and marker colors"
  - "Geofence DWELL -> auto-arrival: 120s loiter delay prevents GPS jitter triggers"

requirements-completed: [DRV-03, DRV-04, DRV-05]

# Metrics
duration: 6min
completed: 2026-04-06
---

# Phase 25 Plan 02: Route Overview + Stop Detail Summary

**Route overview with MapLibre numbered pins, expandable list sheet, and stop detail with Cairo truck ban indicator, PPE gate, and Sygic/HERE navigation deep-links**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-06T13:28:07Z
- **Completed:** 2026-04-06T13:34:03Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Route overview screen with map/list toggle: MapLibre map with color-coded numbered pins, blue polyline route, current position pulsing dot, and expandable bottom sheet list
- Stop detail screen with full customer info, delivery window on-time/late indicator, Cairo truck ban banner, PPE acknowledgment gate, items manifest table, navigation deep-links to Sygic/HERE
- Home screen Start Route and View Full Route buttons wired to /route-overview
- Complete AR+EN i18n coverage including Arabic-Indic numerals in truck ban text

## Task Commits

Each task was committed atomically:

1. **Task 1: Route overview screen with map and list views** - `a014669` (feat)
2. **Task 2: Stop detail screen with navigation deep-links and Cairo truck ban** - `31d048e` (feat)

## Files Created/Modified
- `apps/driver/src/routes/route-overview.tsx` - Route overview with map/list toggle, geofence integration
- `apps/driver/src/routes/stop-detail.tsx` - Stop detail with truck ban, PPE gate, navigation, items manifest
- `apps/driver/src/components/route/RouteMap.tsx` - MapLibre map with numbered markers and polyline
- `apps/driver/src/components/route/RouteList.tsx` - Bottom sheet list with Motion v12 spring animation
- `apps/driver/src/components/route/StopCard.tsx` - 56dp touch target card with status badge and actions
- `apps/driver/src/components/route/StopStatusBadge.tsx` - Color-coded status pill badge
- `apps/driver/src/router.ts` - Added route-overview and stop-detail routes
- `apps/driver/src/routes/home.tsx` - Wired Start Route and View Full Route to /route-overview
- `apps/driver/src/i18n/locales/en/driver.json` - EN keys for route, stopDetail, truckBan, navigation
- `apps/driver/src/i18n/locales/ar/driver.json` - AR keys with Arabic-Indic numerals

## Decisions Made
- StopCard uses React Aria Button for full accessibility with 56dp min-height touch targets
- RouteList bottom sheet uses click toggle for expand/collapse (simplified from full drag gesture)
- Delivery window status computed client-side: green (on-time), yellow (within 30min), red (late)
- Phone masking shows first 4 + last 2 digits for site contact privacy
- No-nav-app dialog prompts Sygic download when neither Sygic nor HERE is installed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

- `stopDetail.reportIssue` button navigates nowhere (Phase 26 exception report)
- Weight column in items manifest shows "-" (delivery items don't have a weight field, only quantity + unit)

## Next Phase Readiness
- Route overview and stop detail screens complete, ready for delivery workflow (Plan 03)
- Geofence DWELL auto-arrival wired to route store
- Navigation deep-links functional for Sygic and HERE

---
*Phase: 25-driver-route-delivery-pod*
*Completed: 2026-04-06*
