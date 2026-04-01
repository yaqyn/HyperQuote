---
phase: 14-database-support-hr-ai-system-tables
plan: 01
subsystem: database
tags: [postgresql, rls, pgvector, hnsw, tsvector, support, hr, ai, notifications, search]

requires:
  - phase: 13-database-delivery-finance-marketplace
    provides: "delivery, finance, marketplace tables (FKs for tickets)"
  - phase: 02-supabase-initial-migrations
    provides: "auth functions (is_internal_user, current_tenant_id, etc.)"
provides:
  - "25 tables: support (tickets, ticket_messages), HR/onboarding (onboarding_sequences, onboarding_steps, customer_onboarding_progress, governorates), AI/search (ai_conversations, ai_messages, ai_request_log, document_embeddings, product_embeddings, business_data_embeddings, search_index), system (notifications, notification_groups, documents, system_settings, sequence_counters, state_history, webhook_events, weather_alerts, carrier_routing_config, otp_delivery_log, ceo_digests, unit_translations)"
  - "RLS ENABLE + FORCE on all 25 tables with proper policies"
  - "3 pgvector HNSW indexes for embedding similarity search"
  - "GIN index on search_index tsvector for full-text search"
  - "unit_translations seed data (29 rows)"
affects: [14-02, 14-03, 14-04, 15-internal-platform, 16-triggers]

tech-stack:
  added: []
  patterns:
    - "pgvector HNSW indexes with m=16, ef_construction=64 for embedding tables"
    - "search_index uses entity_tenant_id (not tenant_id) for RLS"
    - "ticket RLS uses requester_user_id (not created_by)"
    - "Reference tables (governorates, unit_translations) use SELECT for all authenticated"

key-files:
  created:
    - "supabase/migrations/20260401000021_support_hr_ai_system_tables.sql"
  modified: []

key-decisions:
  - "ticket_priority DEFAULT 'medium' not 'normal' — enum has no 'normal' value (spec discrepancy)"
  - "tickets RLS uses requester_user_id not created_by per actual DDL column name"
  - "search_index RLS uses entity_tenant_id not tenant_id per actual DDL column name"
  - "webhook_events internal-only RLS (no tenant scoping) since tenant_id is nullable"
  - "governorates and unit_translations use permissive SELECT for all authenticated (reference data)"

patterns-established:
  - "Reference data tables: ENABLE + FORCE RLS with SELECT for all authenticated"
  - "Embedding tables: extensions.vector(1536) with HNSW indexes"

requirements-completed: [DB-10]

duration: 5min
completed: 2026-04-01
---

# Phase 14 Plan 01: Support/HR/AI/System Tables Summary

**25 remaining database tables with RLS, pgvector HNSW indexes, search GIN index, and unit_translations seed completing the 94-table schema**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-01T22:53:01Z
- **Completed:** 2026-04-01T22:58:16Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Created all 25 remaining tables (support, HR/onboarding, AI/search, system) completing the 94-table schema
- RLS ENABLE + FORCE on all 25 tables with proper policies per BACKEND.md Section 4.2
- 3 pgvector HNSW indexes for document/product/business data embeddings
- GIN index on search_index tsvector + tenant/supplier partial indexes
- unit_translations seeded with 29 rows of Arabic/English unit display names
- Universal triggers (set_tenant_id, updated_at) applied to all applicable tables
- Deferred indexes from Phase 13 added (system_settings, state_history, ceo_digests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 25 tables with RLS, indexes, and unit_translations** - `006d14d` (feat)

## Files Created/Modified
- `supabase/migrations/20260401000021_support_hr_ai_system_tables.sql` - 25 tables + RLS + indexes + triggers + seed data (1016 lines)

## Decisions Made
- ticket_priority DEFAULT changed from 'normal' to 'medium' -- enum lacks 'normal' value
- tickets RLS uses requester_user_id (actual column) instead of created_by (BACKEND.md spec error)
- search_index RLS uses entity_tenant_id (actual column) instead of tenant_id
- webhook_events gets internal-only RLS without tenant scoping (tenant_id is nullable)
- Reference tables (governorates, unit_translations) get permissive SELECT for all authenticated users

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ticket_priority DEFAULT value**
- **Found during:** Task 1 (table creation)
- **Issue:** BACKEND.md spec says DEFAULT 'normal' but ticket_priority enum values are (critical, high, medium, low, informational) -- no 'normal' value
- **Fix:** Changed DEFAULT to 'medium' which is the semantic equivalent of 'normal'
- **Files modified:** supabase/migrations/20260401000021_support_hr_ai_system_tables.sql
- **Verification:** supabase db reset passes cleanly
- **Committed in:** 006d14d

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Essential fix for correctness -- invalid enum value would crash inserts. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 94 tables now exist in the schema
- Ready for Phase 14 plans 02-04 (triggers, computed functions, materialized views)
- supabase db reset passes cleanly with all 21 migrations

---
*Phase: 14-database-support-hr-ai-system-tables*
*Completed: 2026-04-01*
