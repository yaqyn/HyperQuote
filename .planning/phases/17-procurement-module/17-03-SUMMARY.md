---
phase: 17-procurement-module
plan: 03
subsystem: ui
tags: [react, tanstack-table, react-aria, procurement, ranking-algorithm, split-sourcing]

requires:
  - phase: 17-01
    provides: "Procurement types (PriceComparison, RankedSupplier, SplitSource, HistoricalPurchase) and server functions (comparePricing, getHistoricalPrices, rankSuppliers)"
provides:
  - "PriceComparisonMatrix component for side-by-side supplier comparison per line item"
  - "Split sourcing dialog for multi-supplier quantity allocation"
  - "Historical price context with delivery performance badges"
  - "Ranking algorithm test suite (6 tests, 40/25/20/15 weight validation)"
affects: [17-po-management, 17-scorecard]

tech-stack:
  added: [zod (dev dependency for test resolution)]
  patterns: [ranking-algorithm-testing, split-sourcing-validation, historical-price-expandable]

key-files:
  created:
    - apps/internal/src/components/procurement/comparison/PriceComparisonMatrix.tsx
    - apps/internal/src/components/procurement/comparison/ComparisonRow.tsx
    - apps/internal/src/components/procurement/comparison/RankingBadge.tsx
    - apps/internal/src/components/procurement/comparison/SplitSourceDialog.tsx
    - apps/internal/src/components/procurement/comparison/HistoricalPriceContext.tsx
  modified:
    - apps/internal/src/__tests__/price-comparison.test.ts

key-decisions:
  - "Mocked @tanstack/react-start and zod in tests to isolate ranking algorithm from server framework"
  - "Added zod as dev dependency to internal app for test import resolution (server file already uses it)"
  - "Split sourcing validation is client-side in dialog; server-side validation deferred to PO creation endpoint"

patterns-established:
  - "Server function mocking pattern: vi.mock for createServerFn and zod to test exported helpers"
  - "Supplier ranking badge: pill with rank number (Geist Mono) + colored tag pills"
  - "Expandable historical context: lazy-loaded on expand via TanStack Query enabled flag"

requirements-completed: [PROC-03]

duration: 5min
completed: 2026-04-05
---

# Phase 17 Plan 03: Price Comparison Matrix Summary

**Supplier comparison matrix with weighted ranking algorithm (40/25/20/15), split sourcing dialog, and historical price context -- all prices in Geist Mono**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-05T20:34:49Z
- **Completed:** 2026-04-05T20:40:19Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 6

## Accomplishments
- Ranking algorithm tested with 6 tests covering price dominance, balanced ranking, normalization, reliability, split validation, and tag assignment
- PriceComparisonMatrix renders per-item supplier tables with TanStack Table, color-coded rows, and radio selection
- SplitSourceDialog validates quantity allocation sums against requested qty with React Aria Dialog (isKeyboardDismissDisabled)
- HistoricalPriceContext shows last 5 purchases with delivery performance badges (on_time/early/late)

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: Ranking algorithm tests** - `8cd837c` (test)
2. **Task 1 GREEN: Price comparison components** - `db81a2e` (feat)

## Files Created/Modified
- `apps/internal/src/__tests__/price-comparison.test.ts` - 6 tests for ranking algorithm weights, normalization, tag assignment
- `apps/internal/src/components/procurement/comparison/PriceComparisonMatrix.tsx` - Main comparison view with total cost summary and Create PO button
- `apps/internal/src/components/procurement/comparison/ComparisonRow.tsx` - Per-item TanStack Table with supplier ranking, radio selection, Split button
- `apps/internal/src/components/procurement/comparison/RankingBadge.tsx` - Pill badges: rank number (Geist Mono) + colored tags
- `apps/internal/src/components/procurement/comparison/SplitSourceDialog.tsx` - React Aria Dialog with NumberField per supplier, quantity validation
- `apps/internal/src/components/procurement/comparison/HistoricalPriceContext.tsx` - Expandable last-5-purchases table with delivery performance

## Decisions Made
- Mocked @tanstack/react-start and zod in test file to isolate the rankSuppliers algorithm from server framework dependencies
- Added zod as dev dependency to apps/internal -- the server function file already imports it but it wasn't declared
- Used computeRankScore Math.round rounding tolerance in Test 4 assertion (7-8 range instead of exact 7.5)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added zod dev dependency for test resolution**
- **Found during:** Task 1 RED (test execution)
- **Issue:** procurement-comparison.ts imports zod but it wasn't in internal app's package.json; Vite import analysis failed before vi.mock could intercept
- **Fix:** Added zod as devDependency via `bun add -d zod`
- **Files modified:** apps/internal/package.json
- **Verification:** Tests run and pass
- **Committed in:** 8cd837c (part of test commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for test execution. No scope creep.

## Issues Encountered
None beyond the zod dependency resolution.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components wire to existing server functions (comparePricing, getHistoricalPrices) via TanStack Query.

## Next Phase Readiness
- Price comparison matrix ready for integration into procurement module tab navigation
- PO creation flow (17-04) can receive selections from PriceComparisonMatrix.onCreatePO callback

---
*Phase: 17-procurement-module*
*Completed: 2026-04-05*

## Self-Check: PASSED

- All 6 files exist
- Both commits verified (8cd837c, db81a2e)
- PriceComparisonMatrix.tsx: 138 lines (min 80)
- SplitSourceDialog.tsx: 159 lines (min 40)
- Tests: 6/6 passing
- Acceptance criteria: all 4 grep checks confirmed
