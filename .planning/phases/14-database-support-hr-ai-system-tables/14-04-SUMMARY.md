---
phase: 14-database-support-hr-ai-system-tables
plan: 04
subsystem: database
tags: [pg_cron, seed-data, governorates, system-settings, delivery-zones, postgresql]

requires:
  - phase: 14-03
    provides: materialized views (ceo_attention_items, ap_aging_snapshot) for cron refresh targets
  - phase: 14-01
    provides: tables (system_settings, sequence_counters, governorates, notifications) for seed data and cron job targets
  - phase: 13
    provides: business tables (quotes, invoices, customers, deliveries, etc.) for cron job UPDATE targets
provides:
  - 20 pg_cron jobs for automated database maintenance
  - seed data for governorates (27), system_settings (~25/tenant), sequence_counters (13/tenant), delivery_zones (10/tenant)
affects: [phase-15-internal-platform, phase-27-notifications, phase-29-eta-einvoicing]

tech-stack:
  added: []
  patterns: [idempotent cron scheduling via unschedule+schedule, CROSS JOIN tenant seed pattern, UTC time conversion for Cairo]

key-files:
  created:
    - supabase/migrations/20260401000025_pg_cron_jobs.sql
    - supabase/migrations/20260401000026_seed_data.sql
  modified: []

key-decisions:
  - "Staggered same-hour cron jobs by 1-2 minutes to avoid connection spikes (cheque_maturity +2min, driver_compliance +4min, auto_confirm_drop_ship +2min, dispute_sla +2min)"
  - "ap_aging_snapshot_refresh at 0:02 UTC (not 0:00) to avoid collision with ceo_materialized_view_refresh and account_deletion_purge"

patterns-established:
  - "Cron idempotency: SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname = X; SELECT cron.schedule(X, schedule, SQL);"
  - "Per-tenant seed: CROSS JOIN (VALUES ...) AS vals FROM tenants ON CONFLICT DO NOTHING"

requirements-completed: [DB-09, DB-10]

duration: 4min
completed: 2026-04-01
---

# Phase 14 Plan 04: pg_cron Jobs + Seed Data Summary

**20 pg_cron jobs scheduled with UTC-converted Cairo times, plus seed data for governorates (27), system settings (14% VAT, Egyptian weekend, AI routing), sequence counters (13 types), and delivery zones (10 Cairo-area + regional)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T23:15:49Z
- **Completed:** 2026-04-01T23:19:46Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 20 database-side cron jobs scheduled with proper UTC conversion (Cairo UTC+2), staggered to avoid connection spikes
- CEO materialized view refresh corrected to 5-minute interval (from spec's 30 min) per CONTEXT.md
- Seed data loaded: 27 governorates, ~25 system settings per tenant (14% VAT, Fri+Sat weekend, AI routing config), 13 sequence counters, 10 delivery zones with EGP pricing
- All INSERTs idempotent via ON CONFLICT DO NOTHING; role permissions correctly skipped (already in migration 006)

## Task Commits

Each task was committed atomically:

1. **Task 1: Schedule 20 pg_cron jobs** - `97d9378` (feat)
2. **Task 2: Load seed data** - `ca03d50` (feat)

## Files Created/Modified
- `supabase/migrations/20260401000025_pg_cron_jobs.sql` - 20 pg_cron job schedules with idempotent unschedule+schedule pattern
- `supabase/migrations/20260401000026_seed_data.sql` - Governorates, system_settings, sequence_counters, delivery_zones seed data

## Decisions Made
- Staggered same-hour cron jobs by 1-2 minutes to avoid connection spikes per database.md rule (max 8 concurrent)
- ap_aging_snapshot_refresh offset to 0:02 UTC to avoid collision with other midnight jobs
- Cron job SQL kept simple (direct UPDATE/INSERT/DELETE) -- complex logic deferred to dedicated functions in future phases
- Cheque maturity and driver compliance checks include deduplication (NOT EXISTS on recent notifications)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 14 database layer complete (4/4 plans done): all 94 tables, 2 materialized views, 17 triggers, 7 computed functions, 20 cron jobs, and seed data
- Database ready for Phase 15 (Internal Platform) which will build UI over these tables
- All migrations numbered 001-026 in correct dependency order

---
*Phase: 14-database-support-hr-ai-system-tables*
*Completed: 2026-04-01*
