---
phase: 19-warehouse-module
plan: 03
subsystem: ui
tags: [warehouse, putaway, picking, fefo, barcode-scan, react-aria, tanstack-query]

requires:
  - phase: 19-01
    provides: "Shared warehouse components (ScanInput, StepIndicator, LargeNumberInput), types, stores, server functions"
provides:
  - "PutawayWorkflow — directed putaway task list with two-scan confirmation"
  - "PutawayTask — single task with override location (mandatory reason)"
  - "PickQueue — orders sorted by shipping deadline with priority colors"
  - "DirectedPicking — step-by-step FEFO-enforced picking with two-scan verification"
  - "PickExceptions — short pick, skip item, substitute exception dialogs"
  - "WeightTracker — running weight vs truck capacity progress bar"
affects: [19-staging, 19-cycle-count, warehouse-integration]

tech-stack:
  added: []
  patterns:
    - "Two-scan confirmation flow (source + destination) for warehouse task verification"
    - "FEFO enforcement via validateFEFOPick() before confirmPick — strict, blocks newer lot picks"
    - "Exception handling pattern: short pick / skip / substitute with typed results"
    - "Weight tracking with color-coded thresholds (green <75%, yellow 75-90%, red >90%)"

key-files:
  created:
    - apps/internal/src/components/warehouse/putaway/PutawayWorkflow.tsx
    - apps/internal/src/components/warehouse/putaway/PutawayTask.tsx
    - apps/internal/src/components/warehouse/picking/PickQueue.tsx
    - apps/internal/src/components/warehouse/picking/DirectedPicking.tsx
    - apps/internal/src/components/warehouse/picking/PickExceptions.tsx
    - apps/internal/src/components/warehouse/picking/WeightTracker.tsx
  modified: []

key-decisions:
  - "FEFO enforcement is strict — validateFEFOPick blocks picks of newer lots when older lots have sufficient quantity"
  - "Override location requires mandatory reason selection from fixed set (location_full, blocked, equipment_issue)"
  - "Weight tracker uses rough per-unit estimate for cumulative load; production will use actual product weights"

patterns-established:
  - "Two-scan confirmation: source scan enables destination scan (progressive disclosure)"
  - "Exception dialog pattern: typed PickExceptionResult with union discriminator for different flows"

requirements-completed: [WH-02, WH-03]

duration: 4min
completed: 2026-04-06
---

# Phase 19 Plan 03: Putaway & Picking Workflows Summary

**Directed putaway with two-scan confirmation and FEFO-enforced picking with exception handling and weight tracking**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-06T02:10:19Z
- **Completed:** 2026-04-06T02:14:19Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments
- Putaway workflow with task list, progress indicator, drill-into single task, and next-task preview for continuous flow
- Two-scan confirmation on both putaway (source + destination location) and picking (location + product barcode)
- FEFO enforcement in directed picking: strict validation blocks newer lot picks when older lots are available
- Pick exception handling: short pick (partial qty + redirect), skip item (queued for re-pick), substitute (scan alternate barcode)
- Weight tracker with color-coded progress bar (green/yellow/red thresholds)

## Task Commits

Each task was committed atomically:

1. **Task 1: Putaway workflow with directed tasks and two-scan confirmation** - `de8b427` (feat)
2. **Task 2: Picking workflow with FEFO enforcement, exceptions, and weight tracking** - `1918b02` (feat)

## Files Created/Modified
- `apps/internal/src/components/warehouse/putaway/PutawayWorkflow.tsx` - Task list with StepIndicator, drill into single task, next task preview
- `apps/internal/src/components/warehouse/putaway/PutawayTask.tsx` - Two-scan confirmation, quantity input, override location with mandatory reason, success animation
- `apps/internal/src/components/warehouse/picking/PickQueue.tsx` - Orders sorted by shipping deadline, priority color borders, filter by priority
- `apps/internal/src/components/warehouse/picking/DirectedPicking.tsx` - Step-by-step FEFO-enforced picking, two-scan verification, exception buttons, weight tracker
- `apps/internal/src/components/warehouse/picking/PickExceptions.tsx` - Short pick, skip, substitute dialogs with isKeyboardDismissDisabled
- `apps/internal/src/components/warehouse/picking/WeightTracker.tsx` - Running weight vs capacity bar, color-coded thresholds, Geist Mono numbers

## Decisions Made
- FEFO enforcement is strict: validateFEFOPick() called before confirmPick(), blocks newer lot picks when older lots have sufficient quantity
- Override location requires mandatory reason from fixed set (location_full, blocked, equipment_issue)
- Weight tracker uses rough per-unit estimate during picking; production will use actual product weight data from inventory

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Putaway and picking workflows complete, ready for staging/load verification (19-04)
- Shared components (ScanInput, StepIndicator, LargeNumberInput) proven across both workflows

---
*Phase: 19-warehouse-module*
*Completed: 2026-04-06*
