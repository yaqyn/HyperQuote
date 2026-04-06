---
phase: 24-driver-app-scaffold-auth-shift
plan: 04
subsystem: driver-app
tags: [shift-start, dvir, inspection, home-dashboard, offline, powersync, zustand]
dependency_graph:
  requires: [driver-app-scaffold, driver-supabase-client, driver-router, driver-i18n, driver-test-infra, driver-auth-store, driver-shared-components, powersync-database]
  provides: [shift-store, dvir-inspection-flow, shift-start-screen, home-dashboard]
  affects: [25-driver-delivery-flow]
tech_stack:
  added: ["@capacitor/device", "@capacitor/geolocation", "@capacitor/app"]
  patterns: [zustand-computed-state, capacitor-dynamic-import, native-canvas-signature, motion-v12-step-transitions]
key_files:
  created:
    - apps/driver/src/stores/shift.ts
    - apps/driver/src/stores/shift.test.ts
    - apps/driver/src/components/inspection/HealthCheck.tsx
    - apps/driver/src/components/inspection/VehicleSelect.tsx
    - apps/driver/src/components/inspection/InspectionItem.tsx
    - apps/driver/src/components/inspection/DVIRChecklist.tsx
    - apps/driver/src/components/inspection/OdometerEntry.tsx
    - apps/driver/src/components/inspection/GPSConsent.tsx
    - apps/driver/src/components/inspection/SignOff.tsx
  modified:
    - apps/driver/src/routes/shift-start.tsx
    - apps/driver/src/routes/home.tsx
    - apps/driver/src/i18n/locales/en/driver.json
    - apps/driver/src/i18n/locales/ar/driver.json
    - apps/driver/package.json
    - bun.lock
decisions:
  - "Native canvas signature instead of react-signature-canvas -- fewer deps, same functionality"
  - "Capacitor plugins imported dynamically in HealthCheck to avoid build failures on web"
  - "Computed state (hasMajorDefect, canComplete, progress) recalculated on every inspection item update via helper"
metrics:
  duration: 454s
  completed: 2026-04-06
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 6
---

# Phase 24 Plan 04: Shift Start & Home Dashboard Summary

Zustand shift store with 10-point DVIR inspection, 7-step shift start wizard (health check, vehicle select, DVIR checklist, odometer, GPS consent, sign-off), and home dashboard with route summary -- all offline-capable via PowerSync.

## Task Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Shift store and inspection components (TDD) | b251bc3 (RED), a8dcafe (GREEN) | Done |
| 2 | Shift start screen and home dashboard | 1b3f8ba | Done |

## What Was Built

**Task 1 -- Shift store + 7 inspection components (TDD):**
- Zustand shift store with 7-step state machine (health-check -> vehicle-select -> inspection -> odometer -> gps-consent -> sign-off -> complete)
- 10 DVIR items: Tires, Lights, Mirrors, Brakes, Fluid Levels, Horn & Wipers, Fire Extinguisher, Load Securement Equipment, Cab Condition, Moffett/Specialized Equipment
- Computed state: hasMajorDefect (fail + major), canComplete (all checked), completedCount, progress
- submitInspection() and startShift() write to PowerSync (vehicle_inspections, vehicle_inspection_items, driver_shifts)
- HealthCheck: battery/GPS/camera/app version auto-check, auto-advances after 2s if no blocks
- VehicleSelect: pre-assigned vehicle card, React Aria Select for change, Geist Mono plate numbers
- InspectionItem: 56dp Pass/Fail/NA toggle buttons, severity on fail (minor/major), camera capture, notes
- DVIRChecklist: progress "X of 10 checked", previous defects collapsed section, major defect blocks with vehicle change
- OdometerEntry: Geist Mono 24sp NumberField, odometer photo capture
- GPSConsent: Law 151/2020 reference, permission request, consent checkbox
- SignOff: pass/fail/na summary, confirmation checkbox, native canvas signature (200px), GPS auto-capture, timestamp in Geist Mono
- 9 shift store tests passing (TDD red/green)

**Task 2 -- Shift start screen + home dashboard:**
- shift-start.tsx: 6-step wizard driven by shiftStep state, Motion v12 spring enter (stiffness 200, damping 20) / tween exit (200ms easeIn), progress bar, back navigation
- home.tsx: route data from PowerSync (routes + route_stops), stop count/distance/weight in Geist Mono, first stop preview (name, address, ETA, unloading method), dispatch notes, Start Route/View Full Route/Messages/Contact Dispatch buttons, vehicle info strip, redirects to /shift-start if no active shift
- 40+ i18n keys added for AR + EN covering all inspection, health check, and home dashboard strings

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing @capacitor/geolocation and @capacitor/app**
- **Found during:** Task 2 build verification
- **Issue:** HealthCheck and GPSConsent dynamically import @capacitor/geolocation, but Vite build still requires it resolvable
- **Fix:** `bun add @capacitor/geolocation @capacitor/app @capacitor/device`
- **Files modified:** apps/driver/package.json, bun.lock
- **Commit:** 1b3f8ba

**2. [Rule 2 - Enhancement] Native canvas signature instead of react-signature-canvas**
- **Found during:** Task 1 (SignOff component)
- **Issue:** Plan specified react-signature-canvas but native canvas API is simpler and avoids an extra dependency
- **Fix:** Implemented touch/mouse signature drawing directly on HTMLCanvasElement with toDataURL export
- **Files modified:** apps/driver/src/components/inspection/SignOff.tsx
- **Commit:** a8dcafe

## Known Stubs

- **home.tsx Start Route button** (line ~154): onPress is empty -- route overview screen is Phase 25
- **home.tsx View Full Route / Messages / Contact Dispatch buttons**: onPress handlers empty -- Phase 25 delivery flow

These stubs are intentional -- the home dashboard UI is complete but route navigation and messaging are built in Phase 25.

## Verification

- `bun run build` succeeds (196 modules, 5.77s)
- `bun vitest run` passes all 31 tests (9 shift store + 14 PowerSync + 8 auth)
- Shift start flow: 6 steps with animated transitions
- DVIR checklist: 10 items with Pass/Fail/NA at 56dp each
- Home dashboard: route summary with Geist Mono numbers
- All data operations use PowerSync db.execute/db.getAll (offline-capable)
- All touch targets 56dp minimum
- All numbers in Geist Mono
- GPS consent references Law 151/2020
- Full AR + EN i18n coverage

## Self-Check: PASSED
