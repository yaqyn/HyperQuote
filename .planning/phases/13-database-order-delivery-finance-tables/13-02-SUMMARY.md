---
phase: 13-database-order-delivery-finance-tables
plan: 02
subsystem: database
tags: [postgres, migrations, quotes, orders, procurement, inventory, rls, generated-columns]

requires:
  - phase: 13-01
    provides: "Customer, supplier, product prerequisite tables (customers, suppliers, addresses, products, etc.)"
provides:
  - "quotes and quote_items tables with version chain and margin tracking"
  - "orders and order_items tables with fulfillment tracking"
  - "supplier_pos, supplier_po_items, supplier_inquiries tables"
  - "8 inventory tables (warehouses through inventory_reservations)"
  - "Deferred FKs resolved between order_items, supplier_pos, and warehouses"
affects: [13-03, 13-04, 13-05, delivery-tables, finance-tables, internal-platform]

tech-stack:
  added: []
  patterns:
    - "COALESCE unique index for nullable columns in inventory"
    - "Deferred FK pattern: create column without REFERENCES, add constraint in later migration"
    - "GENERATED ALWAYS AS STORED for computed inventory quantities"

key-files:
  created:
    - "supabase/migrations/20260401000013_quotes_orders.sql"
    - "supabase/migrations/20260401000014_procurement_inventory.sql"
  modified: []

key-decisions:
  - "Used CREATE UNIQUE INDEX instead of UNIQUE constraint for COALESCE-based inventory uniqueness (PostgreSQL limitation)"
  - "Supplier inquiries status uses TEXT not enum (sent/responded/expired/cancelled) per BACKEND.md spec"

patterns-established:
  - "Deferred FK with DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL pattern for idempotent constraint addition"

requirements-completed: [DB-01]

duration: 5min
completed: 2026-04-01
---

# Phase 13 Plan 02: Quotes, Orders, Procurement, Inventory Tables Summary

**15 business tables across quote, order, procurement, and inventory domains with GENERATED ALWAYS AS computed columns and COALESCE-based unique indexing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T21:49:14Z
- **Completed:** 2026-04-01T21:53:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created 4 quote/order tables (quotes, quote_items, orders, order_items) with full BACKEND.md spec columns
- Created 11 procurement/inventory tables (supplier_pos, supplier_po_items, supplier_inquiries, warehouses, warehouse_locations, inventory, stock_movements, inventory_transfers, cycle_counts, source_inventory, inventory_reservations)
- inventory table has quantity_available and atp as GENERATED ALWAYS AS STORED computed columns
- Resolved deferred FKs: order_items.supplier_po_id -> supplier_pos, order_items.warehouse_id -> warehouses, supplier_pos.receiving_warehouse_id -> warehouses
- RLS policies on all 15 tables with (SELECT auth.uid()) pattern

## Task Commits

Each task was committed atomically:

1. **Task 1: Create quotes + orders tables** - `5639aa8` (feat)
2. **Task 2: Create procurement + inventory tables + deferred FKs** - `5d10813` (feat)

## Files Created/Modified
- `supabase/migrations/20260401000013_quotes_orders.sql` - quotes, quote_items, orders, order_items with RLS and indexes
- `supabase/migrations/20260401000014_procurement_inventory.sql` - 11 procurement/inventory tables, deferred FKs, GENERATED columns

## Decisions Made
- Used CREATE UNIQUE INDEX instead of ALTER TABLE ADD CONSTRAINT for inventory COALESCE-based uniqueness -- PostgreSQL does not support expressions in UNIQUE constraints, only in unique indexes
- Supplier inquiries status uses TEXT type (not enum) matching BACKEND.md spec for flexible status values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] COALESCE UNIQUE constraint syntax error**
- **Found during:** Task 2 (procurement + inventory tables)
- **Issue:** ALTER TABLE ADD CONSTRAINT UNIQUE does not support COALESCE expressions in PostgreSQL
- **Fix:** Changed to CREATE UNIQUE INDEX which supports expressions
- **Files modified:** supabase/migrations/20260401000014_procurement_inventory.sql
- **Verification:** supabase db reset completes without error
- **Committed in:** 5d10813 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Syntax fix necessary for correctness. Same logical uniqueness enforcement via index instead of constraint.

## Issues Encountered
None beyond the auto-fixed COALESCE syntax issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 15 quote/order/procurement/inventory tables exist with correct FK chains
- Ready for 13-03 (delivery domain tables) and 13-04 (finance domain tables)
- Deferred FKs from migration 013 are resolved in migration 014

## Self-Check: PASSED

---
*Phase: 13-database-order-delivery-finance-tables*
*Completed: 2026-04-01*
