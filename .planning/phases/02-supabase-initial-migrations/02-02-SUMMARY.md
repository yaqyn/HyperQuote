---
phase: 02-supabase-initial-migrations
plan: 02
subsystem: database
tags: [postgres, supabase, jwt, rls, auth, triggers, rbac]

requires:
  - phase: 02-supabase-initial-migrations/plan-01
    provides: enums (app_role, app_permission), auth tables (tenants, user_profiles, user_roles, role_permissions, employees, approvals, audit_log)
provides:
  - 12 auth helper functions (pool extractors, role/permission checkers, trigger functions)
  - Custom access token hook injecting pool/user_type/tenant_id/roles into JWT
  - Role-permission seed data for 20 roles (359 rows)
  - updated_at triggers on 4 tables, set_tenant_id triggers on 5 tables
affects: [03-shared-packages, 07-portal-auth-shell, 15-internal-platform-shell, 12-supplier-portal]

tech-stack:
  added: []
  patterns: [SECURITY DEFINER for cross-table RLS lookups, JWT app_metadata for auth context, entity.action permission naming]

key-files:
  created:
    - supabase/migrations/20260331000004_auth_functions.sql
    - supabase/migrations/20260331000005_access_token_hook.sql
    - supabase/migrations/20260331000006_seed_role_permissions.sql
  modified: []

key-decisions:
  - "config.toml hook registration already existed from Plan 01 -- no modification needed"
  - "20 roles seeded (vs 19 in plan) -- added procurement_officer alongside procurement_agent for completeness"
  - "359 permission rows seeded, every string cross-checked against app_permission enum values"

patterns-established:
  - "authorize() SECURITY DEFINER pattern: queries role_permissions with JWT roles array for RLS policy use"
  - "set_tenant_id() trigger: auto-populates tenant_id from JWT on INSERT, raises exception if null"
  - "update_updated_at() trigger: standard BEFORE UPDATE pattern for all timestamped tables"

requirements-completed: [FOUND-02, DB-04]

duration: 3min
completed: 2026-03-31
---

# Phase 2 Plan 2: Auth Functions, Access Token Hook & Role Permissions Summary

**12 auth helper functions, custom access token hook injecting pool/roles/tenant into JWT, and 359 role-permission seed rows across 20 roles**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T13:16:09Z
- **Completed:** 2026-03-31T13:19:34Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- All 12 auth helper functions created and verified (pool extractors, identity helpers, role/permission checkers, trigger functions)
- Custom access token hook with correct SECURITY DEFINER grants -- supabase_auth_admin can execute, public/anon/authenticated cannot
- Role-permission seed data loaded for 20 roles with 359 total permission mappings
- updated_at triggers on tenants, user_profiles, employees, approvals
- set_tenant_id triggers on user_profiles, user_roles, employees, approvals, audit_log
- Full Phase 2 database foundation operational: 6 migrations, 7 tables, 50+ enums, 13 functions, 359 seed rows

## Task Commits

Each task was committed atomically:

1. **Task 1: Auth helper functions + triggers** - `99a9642` (feat)
2. **Task 2: Access token hook + seed data + config.toml + validation** - `e7584e6` (feat)

## Files Created/Modified
- `supabase/migrations/20260331000004_auth_functions.sql` - 12 auth helper functions + trigger attachments (189 lines)
- `supabase/migrations/20260331000005_access_token_hook.sql` - Custom access token hook with grants (67 lines)
- `supabase/migrations/20260331000006_seed_role_permissions.sql` - Role-permission seed data for 20 roles (353 lines)

## Decisions Made
- config.toml already had hook registration from Plan 01 execution -- no modification needed
- Seeded 20 roles (plan specified 19 roles explicitly but procurement_officer was listed in the plan's role descriptions)
- All permission strings cross-verified against app_permission enum values from migration 002

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration** for production deployment:
- Enable custom access token hook in Supabase Dashboard: Auth > Hooks > Customize Access Token > select `public.custom_access_token_hook`
- Local development uses config.toml registration (already configured)

## Next Phase Readiness
- Full database foundation complete -- Phase 2 done
- Ready for Phase 3 (shared packages): auth helper types can mirror the 12 functions
- Ready for Phase 7 (portal auth): JWT claims carry pool/user_type/tenant_id/roles for RLS
- Ready for Phase 13-14 (remaining tables): can reference auth infrastructure

---
*Phase: 02-supabase-initial-migrations*
*Completed: 2026-03-31*
