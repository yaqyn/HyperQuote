---
phase: 25-driver-route-delivery-pod
plan: 03
subsystem: ui
tags: [capacitor, barcode, camera, signature, react-aria, zustand, i18n]

requires:
  - phase: 25-driver-route-delivery-pod
    provides: "PowerSync schema, Zustand stores (loading, shift, route), barcode/camera libs"
provides:
  - "Loading verification screen with barcode scanning, weight check, photos, sign-off"
  - "BarcodeScanner component wrapping ML Kit"
  - "LoadPlan component with loading sequence and shortage handling"
  - "WeightEntry component with tolerance and GVWR check"
  - "LoadSignOff component with signature canvas and gated departure"
affects: [25-driver-route-delivery-pod, driver-app]

tech-stack:
  added: []
  patterns: ["Signature canvas with native touch events (no third-party lib)", "Loading sequence: last delivery loaded first for truck stacking"]

key-files:
  created:
    - apps/driver/src/components/loading/BarcodeScanner.tsx
    - apps/driver/src/components/loading/LoadPlan.tsx
    - apps/driver/src/components/loading/WeightEntry.tsx
    - apps/driver/src/components/loading/LoadSignOff.tsx
    - apps/driver/src/routes/loading.tsx
  modified:
    - apps/driver/src/router.ts
    - apps/driver/src/i18n/locales/en/driver.json
    - apps/driver/src/i18n/locales/ar/driver.json

key-decisions:
  - "Native canvas for signature instead of react-signature-canvas — avoids extra dependency, finger-optimized 200px height"
  - "Loading sequence groups items by stop in reverse stop order (last delivery first) for correct truck stacking"

patterns-established:
  - "Loading component pattern: scanner + manual check fallback per item"
  - "Weight tolerance bands: green <= 2%, yellow 2-5%, red > 5%"

requirements-completed: [DRV-06]

duration: 4min
completed: 2026-04-06
---

# Phase 25 Plan 03: Loading Verification Summary

**Loading verification screen with barcode scanning per item, weight tolerance/GVWR check, required truck+cargo photos, signature canvas, and gated departure**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-06T11:56:37Z
- **Completed:** 2026-04-06T12:00:58Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- BarcodeScanner wraps ML Kit with match (green spring animation) and mismatch (red alert + vibration) feedback
- LoadPlan renders items grouped by delivery stop in loading sequence (last delivery first), with scan, manual check, and shortage reporting
- WeightEntry uses React Aria NumberField with Geist Mono, +/-2% tolerance bands (green/yellow/red), and GVWR overweight departure block
- LoadSignOff with confirmation checkbox (56dp target), native canvas signature (200px finger-optimized), and gated Ready to Depart button
- Loading route screen with progress indicator (items/photos/weight/signature), required photo slots for truck and cargo securement
- Full AR+EN i18n with Arabic translations for all loading verification keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Barcode scanner and load plan components** - `12ca5ea` (feat)
2. **Task 2: Weight entry, sign-off, loading route, and i18n** - `a6f720b` (feat)

## Files Created/Modified
- `apps/driver/src/components/loading/BarcodeScanner.tsx` - ML Kit barcode scanner with match/mismatch haptic feedback
- `apps/driver/src/components/loading/LoadPlan.tsx` - Item list grouped by stop, scan/manual check, shortage indicators
- `apps/driver/src/components/loading/WeightEntry.tsx` - Scale ticket input with tolerance and GVWR overweight block
- `apps/driver/src/components/loading/LoadSignOff.tsx` - Confirmation checkbox, signature canvas, gated departure
- `apps/driver/src/routes/loading.tsx` - Loading verification route with progress indicator and photo sections
- `apps/driver/src/router.ts` - Added loading route to route tree
- `apps/driver/src/i18n/locales/en/driver.json` - English loading verification keys
- `apps/driver/src/i18n/locales/ar/driver.json` - Arabic loading verification keys

## Decisions Made
- Used native HTML canvas for signature instead of react-signature-canvas to avoid extra dependency; 200px height is finger-optimized for driver use
- Loading sequence groups items by stop in reverse order (last delivery loaded first) matching truck stacking requirements per FRONTEND.md Screen 7

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build verification could not run in worktree (dependencies not installed). All grep-based acceptance criteria passed. Build will be validated by orchestrator post-merge.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are fully wired to the loading Zustand store from Plan 01.

## Next Phase Readiness
- Loading verification screen complete and ready for integration testing
- Depends on route data being available in PowerSync for real item loading
- Sign-off submits load verification record to PowerSync for offline sync

---
*Phase: 25-driver-route-delivery-pod*
*Completed: 2026-04-06*
