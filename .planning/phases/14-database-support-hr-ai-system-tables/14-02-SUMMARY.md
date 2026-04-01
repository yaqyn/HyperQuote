---
phase: 14-database-support-hr-ai-system-tables
plan: 02
subsystem: database
tags: [postgresql, plpgsql, computed-functions, sequence-generator, wac, aging, scoring]

requires:
  - phase: 14-database-support-hr-ai-system-tables
    provides: "25 tables including sequence_counters, notifications, notification_groups, inventory"
  - phase: 13-database-delivery-finance-marketplace
    provides: "invoices, orders, customers, payments, inventory tables for function queries"
provides:
  - "7 computed/utility functions: generate_sequence_number, calculate_payment_behavior_score, calculate_customer_tier_score, calculate_available_quantity, calculate_ar_aging, recalculate_wac, create_notification_group"
  - "Thread-safe sequence generation with FOR UPDATE row-level locking"
  - "Notification grouping with upsert and batch insert"
affects: [14-03, 14-04, 15-internal-platform]

tech-stack:
  added: []
  patterns:
    - "SECURITY DEFINER + SET search_path = public on all cross-table functions"
    - "FOR UPDATE row-level locking for sequence generation and WAC calculation"
    - "ON CONFLICT upsert for idempotent sequence counter and notification group creation"

key-files:
  created:
    - "supabase/migrations/20260401000022_computed_functions.sql"
  modified: []

key-decisions:
  - "Used quantity_on_hand instead of spec's quantity column for expired inventory hold calculation (column does not exist)"

patterns-established:
  - "Computed functions as STABLE SECURITY DEFINER for read-only cross-table queries"
  - "Utility functions as SECURITY DEFINER (non-STABLE) for write operations (WAC, notifications)"

requirements-completed: [DB-08]

duration: 2min
completed: 2026-04-01
---

# Phase 14 Plan 02: Computed Functions Summary

**7 PostgreSQL computed/utility functions: sequence generator with row-level locking, payment/tier scoring, inventory availability, AR aging buckets, WAC recalculation, and notification grouping**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T22:59:51Z
- **Completed:** 2026-04-01T23:02:19Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created all 7 computed/utility functions as prerequisites for business logic triggers (Plan 03)
- generate_sequence_number() uses FOR UPDATE row-level locking for thread-safe concurrent access
- create_notification_group() supports batch notification creation with upsert conflict handling
- All migrations 001-022 apply cleanly via supabase db reset

## Task Commits

Each task was committed atomically:

1. **Task 1: Create computed functions and utility functions** - `476c6a1` (feat)

## Files Created/Modified
- `supabase/migrations/20260401000022_computed_functions.sql` - 7 CREATE OR REPLACE FUNCTION statements

## Decisions Made
- Used `quantity_on_hand` instead of spec's `quantity` column in calculate_available_quantity expired inventory query -- the inventory table has no `quantity` column, only `quantity_on_hand`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed calculate_available_quantity expired inventory query**
- **Found during:** Task 1
- **Issue:** BACKEND.md spec uses `SUM(quantity)` for expired lot hold calculation, but inventory table has no `quantity` column
- **Fix:** Changed to `SUM(quantity_on_hand)` which is the correct column name in the inventory table
- **Files modified:** supabase/migrations/20260401000022_computed_functions.sql
- **Verification:** supabase db reset passes cleanly
- **Committed in:** 476c6a1

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Column name fix necessary for function correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 functions available for Plan 03 (business logic triggers)
- generate_sequence_number() ready for on_quote_accepted trigger
- create_notification_group() ready for notification triggers

---
*Phase: 14-database-support-hr-ai-system-tables*
*Completed: 2026-04-01*
