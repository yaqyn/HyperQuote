---
phase: 21-dispatch-module
plan: 01a
subsystem: dispatch
tags: [dispatch, constraints, zustand, maplibre, i18n, tdd, cairo-truck-ban, prayer-times]

requires: []
provides:
  - All dispatch domain types (routes, vehicles, drivers, POD, GPS, constraints, VRP)
  - Tested constraint validators (Cairo ban, prayer, Jumu'ah, Khamsin, equipment, compliance)
  - Zustand dispatch store with tab nav, entity selection, map viewport
  - EN + AR i18n keys for dispatch module
  - Map dependencies (maplibre-gl, react-map-gl, supercluster)
affects: [21-01b, 21-02, 21-03, 21-04, 21-05]

tech-stack:
  added: [maplibre-gl, react-map-gl, supercluster, "@types/supercluster"]
  patterns: [static-prayer-times-lookup, intl-cairo-timezone, constraint-aggregation]

key-files:
  created:
    - apps/internal/src/types/dispatch.ts
    - apps/internal/src/lib/constraints.ts
    - apps/internal/src/stores/dispatch.ts
    - apps/internal/src/locales/en/dispatch.json
    - apps/internal/src/locales/ar/dispatch.json
    - apps/internal/src/__tests__/constraints.test.ts
    - apps/internal/src/__tests__/driver-compliance.test.ts
  modified:
    - apps/internal/package.json

key-decisions:
  - "Static Cairo prayer times by month for scheduling (not worship) — avoids API dependency"
  - "Intl.DateTimeFormat with Africa/Cairo timezone for all time checks — correct DST handling"
  - "Greater Cairo bounding box (29.75-30.35 lat, 30.85-31.75 lng) for truck ban coordinate checks"
  - "5000kg threshold inclusive for Cairo truck ban (>= 5000, matching Egyptian regulation)"

patterns-established:
  - "Constraint validators as pure functions with type-safe ConstraintViolation returns"
  - "validateAllConstraints aggregator for composing multiple constraint checks"
  - "getCairoPrayerTimes static lookup indexed by month number"

requirements-completed: [DISP-01, DISP-04]

duration: 4min
completed: 2026-04-05
---

# Phase 21 Plan 01a: Dispatch Foundation Summary

**TDD-tested dispatch constraint validators (Cairo truck ban, prayer times, Jumu'ah, Khamsin, equipment) with full type contracts, Zustand store, and bilingual i18n**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-05T06:00:00Z
- **Completed:** 2026-04-05T06:04:27Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 8

## Accomplishments
- 29 constraint tests passing covering Cairo truck ban, Friday Jumu'ah, Khamsin wind, equipment restrictions, prayer time conflicts, driver compliance, and aggregate validation
- Complete dispatch type contracts: 15 types/interfaces covering routes, vehicles, drivers, POD, GPS, constraints, and VRP
- Zustand store following finance.ts pattern with Cairo-centered map viewport default
- Full EN + AR i18n coverage for all dispatch sections (tabs, home, route planning, live map, drivers, delivery log, POD, constraints, issues)
- Map dependencies installed (maplibre-gl, react-map-gl, supercluster)

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): Failing constraint tests** - `d0e82cb` (test)
2. **Task 1 (GREEN): Types, constraints, store, i18n, deps** - `cdb6988` (feat)

## Files Created/Modified
- `apps/internal/src/types/dispatch.ts` - All dispatch domain types (15 types/interfaces)
- `apps/internal/src/lib/constraints.ts` - Pure constraint validators + Cairo prayer times lookup
- `apps/internal/src/stores/dispatch.ts` - Zustand store for dispatch UI state
- `apps/internal/src/locales/en/dispatch.json` - English i18n keys
- `apps/internal/src/locales/ar/dispatch.json` - Arabic i18n keys (real Arabic)
- `apps/internal/src/__tests__/constraints.test.ts` - 25 constraint tests
- `apps/internal/src/__tests__/driver-compliance.test.ts` - 4 driver compliance tests
- `apps/internal/package.json` - Added maplibre-gl, react-map-gl, supercluster

## Decisions Made
- Static Cairo prayer times by month for scheduling (not worship) -- avoids external API dependency while providing reasonable scheduling buffers
- Intl.DateTimeFormat with Africa/Cairo timezone for all time checks -- handles DST correctly without manual offset math
- Greater Cairo bounding box for coordinate-based truck ban detection in validateAllConstraints
- 5000kg inclusive threshold for Cairo truck ban (>= 5000kg matches Egyptian regulation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all functions are fully implemented with real logic.

## Next Phase Readiness
- All type contracts stable for Plan 01b UI components
- Constraint validators ready for route planning integration in Plan 02
- Store ready for tab navigation and entity selection
- Map dependencies available for live map in Plan 03

---
*Phase: 21-dispatch-module*
*Completed: 2026-04-05*
