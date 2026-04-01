---
phase: 13-database-order-delivery-finance-tables
plan: 05
subsystem: database
tags: [postgresql, rls, state-machine, indexes, security, mfa, triggers]

requires:
  - phase: 13-04
    provides: marketplace, zones, feedback, driver jobs/earnings tables
  - phase: 13-01
    provides: customer, supplier, product tables
  - phase: 13-02
    provides: quotes, orders, procurement tables
  - phase: 13-03
    provides: delivery, logistics, driver tables
  - phase: 02
    provides: auth functions (is_internal_user, current_tenant_id, etc.)
provides:
  - validate_state_transition() function for 7 entity types
  - enforce_state_transition() triggers on all state machine tables
  - 137 indexes (RLS-critical, composite, partial, full-text)
  - RLS ENABLED + FORCED on all 78 business tables
  - 139 policies (internal, customer, supplier, driver patterns)
  - AAL2 MFA gating on all financial tables
affects: [phase-14, phase-15, phase-16, all-future-phases]

tech-stack:
  added: []
  patterns: [state-machine-trigger-enforcement, four-rls-policy-patterns, exists-subquery-for-child-tables, aal2-mfa-gating]

key-files:
  created:
    - supabase/migrations/20260401000018_state_machine.sql
    - supabase/migrations/20260401000019_indexes.sql
    - supabase/migrations/20260401000020_rls_policies.sql
  modified: []

key-decisions:
  - "RAISE EXCEPTION inside CASE requires variable assignment pattern (cannot use RAISE as expression)"
  - "vehicles table has no assigned_driver_id -- driver access via deliveries/routes, not direct vehicle assignment"
  - "cheque_tracking uses internal-only MFA policy (no customer_id column -- Pitfall 7)"
  - "Partition tables (audit_log_2026_*, driver_locations_2026_*) inherit RLS from parent -- no separate ENABLE needed"
  - "ceo_digests, system_settings, state_history indexes deferred to Phase 14 (tables not yet created)"

patterns-established:
  - "State machine: validate_state_transition() centralized function with enforce trigger on each table"
  - "RLS Pattern 1: Internal users -- tenant-scoped via (SELECT current_tenant_id())"
  - "RLS Pattern 2: External customers -- customer-scoped via (SELECT current_customer_id())"
  - "RLS Pattern 3: External suppliers -- supplier-scoped via (SELECT current_supplier_id())"
  - "RLS Pattern 4: Financial tables -- AAL2 MFA gate added to internal policy"
  - "Child tables without tenant_id use EXISTS subquery through parent for tenant scoping"

requirements-completed: [DB-01, DB-03, DB-05]

duration: 11min
completed: 2026-04-01
---

# Phase 13 Plan 05: State Machine, Indexes, and RLS Policies Summary

**State machine enforcement for 7 entity types, 137 indexes for RLS-optimized queries, and 139 RLS policies across all 78 business tables with AAL2 MFA gating on financial tables**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-01T22:09:01Z
- **Completed:** 2026-04-01T22:20:01Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments
- State machine validation function handles 7 entity types (quote_request, quote, order, supplier_po, delivery, invoice, payment) with comprehensive transition maps
- 137 indexes created including RLS-critical tenant_id indexes, composite indexes for common queries, and partial indexes for active quotes, overdue invoices, unmatched payments
- RLS ENABLED + FORCED on all 78 business tables with 139 policies covering 4 access patterns
- Financial tables (invoices, payments, cheques, credit_notes, etc.) gated with AAL2 MFA requirement
- EXPLAIN confirms index usage on tenant_id + status queries (Index Scan, not Seq Scan)

## Task Commits

Each task was committed atomically:

1. **Task 1: State machine function + enforcement triggers** - `e8d9ef8` (feat)
2. **Task 2: All indexes + all RLS policies** - `24f7629` (feat)

## Files Created
- `supabase/migrations/20260401000018_state_machine.sql` - validate_state_transition() + enforce triggers on 7 tables
- `supabase/migrations/20260401000019_indexes.sql` - 137 indexes (single-column, composite, partial, GIN)
- `supabase/migrations/20260401000020_rls_policies.sql` - RLS ENABLE+FORCE + 139 policies for all tables

## Decisions Made
- RAISE EXCEPTION cannot be used inside a CASE expression in PostgreSQL -- restructured to use variable assignment with NULL check
- vehicles table has no assigned_driver_id column -- removed driver-scoped policy (drivers access vehicles via deliveries/routes)
- cheque_tracking has no customer_id -- internal-only MFA policy per Pitfall 7
- Deferred indexes for ceo_digests, system_settings, state_history (Phase 14 tables)
- Partition tables inherit RLS from parent -- only 8 partition tables show as "no RLS" which is correct behavior

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed RAISE EXCEPTION inside CASE expression**
- **Found during:** Task 1 (state machine function)
- **Issue:** PostgreSQL does not allow RAISE EXCEPTION as an expression inside CASE -- caused syntax error
- **Fix:** Changed to variable assignment pattern: result := CASE ... ELSE NULL END; IF result IS NULL THEN RAISE; END IF;
- **Files modified:** supabase/migrations/20260401000018_state_machine.sql
- **Verification:** supabase db reset passes cleanly

**2. [Rule 1 - Bug] Fixed missing assigned_driver_id column reference**
- **Found during:** Task 2 (RLS policies)
- **Issue:** BACKEND.md spec references vehicles.assigned_driver_id but actual table schema has no such column
- **Fix:** Removed driver-scoped policy for vehicles (drivers access via deliveries/routes)
- **Files modified:** supabase/migrations/20260401000020_rls_policies.sql
- **Verification:** supabase db reset passes cleanly

**3. [Rule 3 - Blocking] Removed references to Phase 14 tables**
- **Found during:** Task 2 (indexes)
- **Issue:** system_settings, state_history, ceo_digests tables don't exist yet (Phase 14)
- **Fix:** Commented out indexes for non-existent tables, added deferred note
- **Files modified:** supabase/migrations/20260401000019_indexes.sql
- **Verification:** supabase db reset passes cleanly

---

**Total deviations:** 3 auto-fixed (2 bug fixes, 1 blocking)
**Impact on plan:** All auto-fixes necessary for migration correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 13 database layer complete: all 78 tables, state machine, indexes, RLS policies
- Ready for Phase 14 (remaining infrastructure tables) or Phase 15 (internal platform)
- All migrations (010-020) apply cleanly via supabase db reset

## Known Stubs
None.

---
*Phase: 13-database-order-delivery-finance-tables*
*Completed: 2026-04-01*
