---
phase: 26-driver-remaining
plan: 03
subsystem: ui
tags: [react, zustand, capacitor, powersync, dvir, signature-canvas, offline-first]

# Dependency graph
requires:
  - phase: 26-driver-remaining/01
    provides: EOD store, shift store, auth store, inspection components, shared components
provides:
  - 6 end-of-day step components (returns, fuel, DVIR, odometer, summary, sign-off)
  - Wired end-of-day route with step navigation and driver-type-aware flow
  - End Shift danger button on home screen
affects: [driver-app, end-of-day-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-step wizard with Zustand store navigation, driver-type-conditional steps, signature canvas reuse]

key-files:
  created:
    - apps/driver/src/components/end-of-day/ReturnsList.tsx
    - apps/driver/src/components/end-of-day/FuelReport.tsx
    - apps/driver/src/components/end-of-day/PostTripDVIR.tsx
    - apps/driver/src/components/end-of-day/EndOdometer.tsx
    - apps/driver/src/components/end-of-day/DaySummary.tsx
    - apps/driver/src/components/end-of-day/ShiftSignOff.tsx
  modified:
    - apps/driver/src/routes/end-of-day.tsx
    - apps/driver/src/routes/home.tsx

key-decisions:
  - "PostTripDVIR uses inline checklist rather than DVIRChecklist component reuse — the pre-trip component is tightly coupled to useShiftStore, post-trip needs independent local state"
  - "ShiftSignOff uses window.__onShiftEnd callback for post-completion navigation since the route manages store resets"
  - "External driver earnings shown as placeholder (---) since earnings data source not yet wired"

patterns-established:
  - "EOD step components call store.nextStep() internally via their Continue buttons"
  - "Driver-type-aware step filtering via getStepsForDriverType at route init"

requirements-completed: [DRV-10]

# Metrics
duration: 8min
completed: 2026-04-06
---

# Phase 26 Plan 03: End-of-Day Flow Summary

**6-step end-of-day wizard with returns processing, fuel reporting, post-trip DVIR, odometer capture, day summary (Geist Mono stats), and red End Shift sign-off with confirmation modal**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-06T07:00:44Z
- **Completed:** 2026-04-06T07:08:44Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Built 6 end-of-day step components covering the full shift closure flow for both internal (6 steps) and external (4 steps) drivers
- ReturnsList queries PowerSync for refused/damaged delivery items with reason code Select and warehouse confirmation
- FuelReport with 4 fuel gauge buttons, yellow warning at 1/4 level (non-blocking), receipt photo capture
- PostTripDVIR shows pre-trip defects at top, full 10-item checklist with required photos for new defects
- EndOdometer with large text-4xl Geist Mono NumberField, computed distance display, photo capture
- DaySummary displays all shift stats in font-[var(--font-mono)] font-medium grid
- ShiftSignOff with signature canvas, "End Shift" danger button (56dp, full-width), confirmation modal with cancel/confirm
- Wired end-of-day route with step indicator, back navigation, driver-type-aware init, store reset on completion
- Added End Shift danger button to home screen, visible only when shift is active

## Task Commits

Each task was committed atomically:

1. **Task 1: Build 6 end-of-day step components** - `1bc7a44` (feat)
2. **Task 2: Wire end-of-day route + add End Shift button to home** - `340a32e` (feat)

## Files Created/Modified
- `apps/driver/src/components/end-of-day/ReturnsList.tsx` - Returns processing with reason codes and warehouse confirmation
- `apps/driver/src/components/end-of-day/FuelReport.tsx` - Fuel gauge selector with 4 levels and receipt photo
- `apps/driver/src/components/end-of-day/PostTripDVIR.tsx` - Post-trip inspection with pre-trip defects and 10-item checklist
- `apps/driver/src/components/end-of-day/EndOdometer.tsx` - End odometer with large Geist Mono input and distance computation
- `apps/driver/src/components/end-of-day/DaySummary.tsx` - Shift statistics grid all in Geist Mono 500
- `apps/driver/src/components/end-of-day/ShiftSignOff.tsx` - Signature capture, danger End Shift button, confirmation overlay
- `apps/driver/src/routes/end-of-day.tsx` - Full route with step navigation and driver-type init
- `apps/driver/src/routes/home.tsx` - Added End Shift danger button in bottom action area

## Decisions Made
- PostTripDVIR manages its own local inspection state rather than reusing the shift store's DVIRChecklist component, because the pre-trip component is tightly coupled to shift store actions (setShiftStep, etc.) that don't apply to post-trip flow
- ShiftSignOff earnings display for external drivers uses placeholder since earnings data source is not yet available from backend
- Signature canvas implementation duplicated from pre-trip SignOff rather than extracting a shared component — extraction deferred to avoid scope creep

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs
- `ShiftSignOff.tsx` line ~120: External driver earnings displayed as "EGP ---" placeholder — earnings data source not yet wired from backend job completion data

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- End-of-day flow complete and navigable from home screen
- External driver earnings display needs backend wiring in a future plan
- Store reset and navigation to /login works on shift end

---
*Phase: 26-driver-remaining*
*Completed: 2026-04-06*
