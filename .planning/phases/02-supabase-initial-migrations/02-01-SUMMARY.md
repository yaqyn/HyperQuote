---
phase: 02-supabase-initial-migrations
plan: 01
subsystem: database
tags: [supabase, postgresql, enums, rls, partitioning, auth-tables, multi-tenant]

requires:
  - phase: 01-monorepo-scaffold
    provides: monorepo structure with Bun workspaces
provides:
  - Supabase project initialized with config.toml and auth hook registration
  - 52 database enums across 8 domains (auth, customer, product, quote, procurement, delivery, finance, support)
  - 7 auth/tenant tables (tenants, employees, user_profiles, user_roles, role_permissions, approvals, audit_log)
  - Partitioned audit_log with 4 monthly partitions (Apr-Jul 2026)
  - 15 RLS-performance indexes on all policy-referenced columns
  - RLS enabled on all 7 tables with tenant isolation policies
affects: [02-02, 13-database-order-delivery-finance-tables, 14-database-support-hr-ai-system-tables, 07-portal-auth-shell]

tech-stack:
  added: [supabase-cli, pgcrypto, pg_trgm, pgvector, pg_cron]
  patterns: [deferred-fk-with-comments, partitioned-audit-log, stub-function-for-rls, conditional-extension-loading]

key-files:
  created:
    - supabase/config.toml
    - supabase/migrations/20260331000001_extensions.sql
    - supabase/migrations/20260331000002_enums.sql
    - supabase/migrations/20260331000003_auth_tables.sql
  modified: []

key-decisions:
  - "Replaced app_permission enum entirely with seed-data-aligned entity.action naming (85 permissions)"
  - "Added pending_review to credit_status enum for Phase 13 compatibility"
  - "Conditional supa_audit loading (not available in local dev, enabled on hosted Supabase)"
  - "Stub current_tenant_id() in migration 003 so RLS policies can be created before migration 004"
  - "Deferred FKs for customer_id/supplier_id/driver_id documented via SQL COMMENTs"

patterns-established:
  - "Deferred FK: omit FK constraint, add COMMENT ON COLUMN explaining deferral and target phase"
  - "Conditional extension: DO $$ block checking pg_available_extensions before CREATE EXTENSION"
  - "RLS stub: create minimal function version in same migration as policies, full version replaces via CREATE OR REPLACE"
  - "Partitioned table: create parent + 4 months of partitions, pg_cron auto-creates future partitions"

requirements-completed: [FOUND-02, DB-02]

duration: 18min
completed: 2026-03-31
---

# Phase 02 Plan 01: Supabase Init + Extensions + Enums + Auth Tables Summary

**Supabase project with 52 enums (expanded app_role 36 values, seed-aligned app_permission 85 values), 7 auth tables with RLS, partitioned audit_log, and 15 performance indexes**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-31T12:55:38Z
- **Completed:** 2026-03-31T13:13:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Supabase project initialized with auth hook pre-configured in config.toml
- All 52 enums created with expanded app_role (36 values) and seed-aligned app_permission (85 entity.action values)
- 7 auth tables created with correct types, constraints, indexes, and RLS tenant isolation policies
- audit_log partitioned by month with 4 pre-created partitions (April-July 2026)
- user_profiles includes pool column (required by custom_access_token_hook, not in original spec)
- Deferred FKs documented with SQL COMMENTs for Phase 13 resolution

## Task Commits

Each task was committed atomically:

1. **Task 1: Supabase init + extensions + enums** - `75e1573` (feat)
2. **Task 2: Auth tables migration** - `859f7ea` (feat)

## Files Created/Modified
- `supabase/config.toml` - Supabase local dev config with auth hook registration
- `supabase/migrations/20260331000001_extensions.sql` - pgcrypto, pg_trgm, vector, pg_cron, supa_audit (conditional)
- `supabase/migrations/20260331000002_enums.sql` - 52 enums across 8 domains
- `supabase/migrations/20260331000003_auth_tables.sql` - 7 tables, 15 indexes, RLS policies, 4 audit partitions

## Decisions Made
- Replaced app_permission enum entirely with seed-data-aligned entity.action naming (85 permissions vs original 68) for direct compatibility with role_permissions seed data
- Added `pending_review` to credit_status enum so Phase 13 customers table can use it as default
- Made supa_audit conditional since it is not available in local Supabase dev (only on hosted)
- Created stub current_tenant_id() in migration 003 to allow RLS policy creation before migration 004 defines the full function
- Used SQL COMMENTs to document deferred FKs on user_profiles (customer_id, supplier_id, driver_id)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] supa_audit extension not available in local dev**
- **Found during:** Task 1 (extensions migration)
- **Issue:** `CREATE EXTENSION supa_audit` fails locally -- extension not installed in local Supabase containers
- **Fix:** Wrapped in DO $$ block that checks pg_available_extensions before attempting CREATE EXTENSION
- **Files modified:** supabase/migrations/20260331000001_extensions.sql
- **Verification:** `supabase db reset` completes with NOTICE instead of ERROR
- **Committed in:** 75e1573 (Task 1 commit)

**2. [Rule 3 - Blocking] RLS policies reference current_tenant_id() which does not exist yet**
- **Found during:** Task 2 (auth tables migration)
- **Issue:** RLS policies reference `public.current_tenant_id()` but the function is defined in migration 004 (Plan 02), causing `supabase db reset` to fail
- **Fix:** Added stub `current_tenant_id()` function in migration 003 using the same implementation as the full version. Migration 004 will safely overwrite it via CREATE OR REPLACE.
- **Files modified:** supabase/migrations/20260331000003_auth_tables.sql
- **Verification:** `supabase db reset` completes successfully, all 3 migrations apply
- **Committed in:** 859f7ea (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking issues)
**Impact on plan:** Both auto-fixes necessary for migrations to apply. No scope creep. The stub function pattern is clean and will be seamlessly replaced.

## Issues Encountered
- Docker network `supabase_network_hyperquote` needed manual creation before `supabase start` would succeed (one-time local dev setup)

## User Setup Required
None - no external service configuration required. All work is local Supabase dev.

## Known Stubs
None - no stubs that prevent the plan's goal from being achieved.

## Next Phase Readiness
- Database foundation ready for Plan 02 (auth helper functions, access token hook, seed data)
- Migration 004 can safely CREATE OR REPLACE the stub current_tenant_id() function
- Migration 004 should also attach updated_at triggers to tenants, user_profiles, employees, approvals
- All 52 enums available for reference by any subsequent table creation

---
*Phase: 02-supabase-initial-migrations*
*Completed: 2026-03-31*
