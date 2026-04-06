---
phase: 26-driver-remaining
plan: 02
subsystem: driver-exception-reporting
tags: [driver-app, exception, offline, capacitor, react-aria]
dependency_graph:
  requires: [26-01]
  provides: [exception-wizard, exception-types, exception-summary, photo-grid]
  affects: [stop-detail, delivery, route-overview]
tech_stack:
  added: []
  patterns: [timestamp-based-timer, guided-wizard, type-specific-workflows]
key_files:
  created:
    - apps/driver/src/components/exception/ExceptionWizard.tsx
    - apps/driver/src/components/exception/PhotoGrid.tsx
    - apps/driver/src/components/exception/CustomerUnavailable.tsx
    - apps/driver/src/components/exception/SiteBlocked.tsx
    - apps/driver/src/components/exception/WrongAddress.tsx
    - apps/driver/src/components/exception/DamagedGoods.tsx
    - apps/driver/src/components/exception/PartialDelivery.tsx
    - apps/driver/src/components/exception/WeatherDelay.tsx
    - apps/driver/src/components/exception/VehicleIssue.tsx
    - apps/driver/src/components/exception/ExceptionSummary.tsx
  modified:
    - apps/driver/src/routes/exception.tsx
    - apps/driver/src/routes/stop-detail.tsx
    - apps/driver/src/routes/delivery.tsx
    - apps/driver/src/routes/route-overview.tsx
decisions:
  - Timestamp-based timer for CustomerUnavailable (ISO string in store details, survives backgrounding)
  - Summary step threshold per exception type rather than isComplete flag
  - GPS capture via Capacitor Geolocation in exception route (best-effort, silent failure)
metrics:
  duration: ~6min
  completed: 2026-04-06
  tasks: 3/3
  files_created: 10
  files_modified: 4
---

# Phase 26 Plan 02: Exception Reporting UI Summary

Exception reporting wizard with 7 guided type-specific workflows, PhotoGrid for evidence capture, ExceptionSummary for review/submit, all wired to existing routes via Report Issue buttons.

## What Was Built

### Task 1: ExceptionWizard + PhotoGrid + 3 Simpler Types
- **ExceptionWizard.tsx** (117 lines): Coordinator component that renders a 2-column type selection grid at step 0, delegates to type-specific components at step 1+, and shows ExceptionSummary when step exceeds the type's threshold. Reads all state from useExceptionStore.
- **PhotoGrid.tsx** (68 lines): Shared photo capture/display grid. Shows 80x80 thumbnails, dashed-border add button (56dp), and `current/min required` count in Geist Mono.
- **CustomerUnavailable.tsx** (164 lines): 5-step workflow -- called contact, tried alternate, response received, 15-minute mandatory wait timer, resolution actions (wait/skip/fail). Timer uses ISO timestamp stored in details (`waitStartedAt`), computed via `useEffect` with 1-second interval -- survives app backgrounding.
- **SiteBlocked.tsx** (114 lines): Photo of obstruction (required), blockage type radio (5 options), called contact radio, wait/skip/fail actions.
- **WrongAddress.tsx** (116 lines): Photo of location (required), location description textarea, called customer radio, conditional new address field with navigation option.

### Task 2: 4 Complex Exception Types
- **DamagedGoods.tsx** (209 lines): Most complex type. When discovered radio, CheckboxGroup item selection from delivery items, per-item damage type/severity/quantity fields, PhotoGrid (min 2, max 6), who noticed, customer decision. Stores `damagedItems` array with per-item detail objects.
- **PartialDelivery.tsx** (130 lines): Customer statement textarea, CheckboxGroup for items customer wants now, Call Dispatch button, dispatch approved radio, confirm partial action that tags undelivered items with `customer_request_not_ready` reason.
- **WeatherDelay.tsx** (106 lines): Condition radio (heavy rain, sandstorm/Khamsin, extreme heat, high wind), impact radio, photo of conditions. Shows prominent yellow Khamsin warning banner when sandstorm or high wind selected.
- **VehicleIssue.tsx** (121 lines): Safety warning banner at TOP. Prominent 56dp red Call Dispatch button. Issue type radio (6 options), severity radio (can/cannot continue), photos. When `cannot_continue`: shows emergency buttons for 123 (Ambulance) and 122 (Traffic Police), both 56dp red.

### Task 3: Route Wiring + Summary + Integration
- **ExceptionSummary.tsx** (163 lines): Review screen showing exception type, timestamp, GPS coordinates (Geist Mono), photo count, all type-specific details, read-only photo thumbnails. Submit calls store.submit(), shows success state, then navigates home. Edit button goes back. Error display for retry.
- **routes/exception.tsx** (45 lines): Replaced stub. Reads deliveryId/stopId from search params, initializes store on mount, captures GPS via Capacitor Geolocation (best-effort), renders ExceptionWizard.
- **Report Issue buttons**: Added to stop-detail (with deliveryId + stopId), delivery (with deliveryId), and route-overview (without params). All navigate to `/exception` with appropriate search params.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 825ab75 | feat(26-02): ExceptionWizard coordinator, PhotoGrid, and 3 type components |
| 2 | 85fc4f0 | feat(26-02): DamagedGoods, PartialDelivery, WeatherDelay, VehicleIssue components |
| 3 | c2fd881 | feat(26-02): ExceptionSummary, wired exception route, Report Issue buttons |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None. All components are fully implemented with store integration, React Aria components, i18n keys, and proper data flow. The i18n translation keys reference `exception.*` namespace which will need actual translation values added to locale files in a future plan.

## Verification Results

| Check | Result |
|-------|--------|
| 10 exception component files exist | PASS |
| useExceptionStore imported in ExceptionWizard | PASS |
| waitStartedAt timestamp-based timer in CustomerUnavailable | PASS |
| /exception route link in stop-detail | PASS |
| submit action in ExceptionSummary | PASS |

## Self-Check: PASSED

All 10 created files verified on disk. All 3 commit hashes found in git log.
