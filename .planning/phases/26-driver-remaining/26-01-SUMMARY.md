---
phase: 26-driver-remaining
plan: 01
subsystem: driver-app
tags: [powersync, zustand, stores, routes, offline-first]
dependency_graph:
  requires: [phase-25-driver-route-delivery-pod]
  provides: [delivery_exceptions-schema, driver_jobs-schema, driver_earnings-schema, driver_withdrawals-schema, shift_returns-schema, exception-store, eod-store, external-driver-store, exception-route, end-of-day-route, job-offers-route, job-detail-route, earnings-route]
  affects: [apps/driver]
tech_stack:
  added: []
  patterns: [driver-type-aware-steps, failure-reason-mapping, external-driver-gate]
key_files:
  created:
    - apps/driver/src/stores/exception.ts
    - apps/driver/src/stores/end-of-day.ts
    - apps/driver/src/stores/external-driver.ts
    - apps/driver/src/stores/exception.test.ts
    - apps/driver/src/stores/end-of-day.test.ts
    - apps/driver/src/stores/external-driver.test.ts
    - apps/driver/src/routes/exception.tsx
    - apps/driver/src/routes/end-of-day.tsx
    - apps/driver/src/routes/job-offers.tsx
    - apps/driver/src/routes/job-detail.tsx
    - apps/driver/src/routes/earnings.tsx
  modified:
    - apps/driver/src/lib/powersync.ts
    - apps/driver/src/lib/upload-queue.ts
    - apps/driver/src/stores/auth.ts
    - apps/driver/src/router.ts
decisions:
  - "endShift takes shiftId param rather than reading from store -- allows external callers to specify which shift"
  - "calcWithholding uses Math.round(amount * 5) / 100 per plan spec for 5% Egyptian services tax"
  - "External driver routes use beforeLoad + throw redirect pattern for gate check"
metrics:
  duration: 5min
  completed: "2026-04-06T14:32:05Z"
  tasks_completed: 4
  tasks_total: 4
  files_created: 11
  files_modified: 4
---

# Phase 26 Plan 01: Driver Remaining Foundation Summary

Extended driver app with PowerSync schema tables, Zustand stores, Wave 0 tests, and route stubs for exception reporting, end-of-day, and external driver features.

**One-liner:** 5 new PowerSync tables, 3 Zustand stores with offline-first business logic, Wave 0 test scaffolds, 5 route stubs with external driver gates.

## What Was Built

### Task 1: PowerSync Schema + Upload Queue + Auth Store
- Added 5 tables to PowerSync schema: `delivery_exceptions`, `driver_jobs`, `driver_earnings`, `driver_withdrawals`, `shift_returns` (16 total)
- Extended `UploadMetadata.type` union with `'exception'` and `'inspection'`
- Added `driver_type` field to `DriverProfile` interface (`internal` | `contracted` | `on_demand`)
- Added `isExternalDriver` computed getter to auth store

### Task 2: Three Zustand Stores
- **Exception store:** 7 exception types with photo collection, GPS tagging, failure reason mapping (e.g. `customer_unavailable` -> `customer_absent`), upload queue integration
- **EOD store:** Linear wizard with driver-type-aware steps (6 for internal, 4 for external), returns processing, fuel/odometer/signature tracking, shift closure with PowerSync writes
- **External driver store:** Job offers (load/accept/decline), earnings aggregation, withdrawal with EGP 500 minimum, `calcWithholding` helper for 5% services tax

### Task 3: Wave 0 Test Scaffolds
- Exception tests: 8 test cases covering type setting, photo management, all 7 failure reason mappings, upload queue integration
- EOD tests: 10 test cases covering step progression by driver type, fuel warning, canEndShift guard, shift closure SQL
- External driver tests: 8 test cases covering withholding calc, withdrawal minimum, job accept/decline, loadJobs query

### Task 4: Route Stubs + Router Extension
- 5 route stubs: `/exception`, `/end-of-day`, `/job-offers`, `/job-detail/$jobId`, `/earnings`
- Exception route accepts `deliveryId` and `stopId` search params
- Job offers, job detail, and earnings routes gated to external drivers via `beforeLoad` redirect
- Router extended to 13 routes total

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 0196213 | feat(26-01): extend PowerSync schema, upload queue types, and auth store driver_type |
| 2 | 7a2532a | feat(26-01): create exception, end-of-day, and external-driver Zustand stores |
| 3 | 2872fea | test(26-01): add Wave 0 test scaffolds for exception, EOD, and external-driver stores |
| 4 | 078c978 | feat(26-01): add 5 route stubs with external driver gates to router |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| apps/driver/src/routes/exception.tsx | 7 | `<div>Exception Reporting</div>` | Placeholder UI -- will be implemented in wave 2 |
| apps/driver/src/routes/end-of-day.tsx | 7 | `<div>End of Day</div>` | Placeholder UI -- will be implemented in wave 2 |
| apps/driver/src/routes/job-offers.tsx | 7 | `<div>Job Offers</div>` | Placeholder UI -- will be implemented in wave 2 |
| apps/driver/src/routes/job-detail.tsx | 7 | `<div>Job Detail</div>` | Placeholder UI -- will be implemented in wave 2 |
| apps/driver/src/routes/earnings.tsx | 7 | `<div>Earnings</div>` | Placeholder UI -- will be implemented in wave 2 |

These stubs are intentional -- this plan builds foundation infrastructure. Wave 2 plans (26-02, 26-03, 26-04) will replace these with full UI implementations.

## Verification Results

All 8 verification checks passed:
1. 16 PowerSync tables (11 existing + 5 new)
2. 10+ schema references to new tables
3. useExceptionStore exported
4. useEODStore exported
5. useExternalDriverStore exported
6. 3 test files (5 total including pre-existing)
7. exceptionRoute registered in router
8. isExternalDriver gate on job-offers route

## Self-Check: PASSED

All 11 created files exist. All 4 commit hashes verified in git log.
