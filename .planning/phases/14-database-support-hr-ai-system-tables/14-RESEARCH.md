# Phase 14: Database -- Support + HR + AI + System Tables - Research

**Researched:** 2026-04-01
**Domain:** PostgreSQL (Supabase) -- triggers, materialized views, computed functions, pg_cron, seed data
**Confidence:** HIGH

## Summary

Phase 14 completes the 94-table + 2 materialized view database by creating 25 remaining tables (Support, HR/Onboarding, AI/Search, System), 17 business logic triggers, 7 computed functions, 19 pg_cron jobs, 2 materialized views, and all seed data. The SQL for every artifact is fully specified in BACKEND.md Sections 3.13-3.16, 5.2, 7, 9, and 12. Phase 13 tables (quotes, orders, deliveries, invoices, payments, supplier_pos, etc.) MUST exist before Phase 14 triggers can be created, since many triggers fire on Phase 13 tables.

The phase is entirely server-side PostgreSQL -- no frontend code, no Workers code. All pg_cron jobs go in SQL migrations. Cloudflare Cron Trigger jobs are documented but NOT created in this phase (they go in wrangler.jsonc during integration phases). The `generate_sequence_number()` function is critical infrastructure used by multiple triggers and must be created before any trigger that references it.

**Primary recommendation:** Split into 5-6 migration files grouped by domain: (1) remaining tables, (2) computed functions + sequence generator, (3) business logic triggers, (4) materialized views + unique indexes for CONCURRENTLY refresh, (5) pg_cron job scheduling, (6) seed data. All migrations must be idempotent.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- All 94 tables + 2 materialized views from BACKEND.md
- Phase 13 must be complete before Phase 14 triggers
- All migrations idempotent (IF NOT EXISTS, CREATE OR REPLACE, DO $$ BEGIN...EXCEPTION...END $$)
- RLS on every new table (Enable + Force + policies)
- Partitioned tables for driver_locations and audit_log (already done in Phase 13)
- pgvector HNSW indexes for embedding tables (m=16, ef_construction=64)
- LIFO prohibited (trigger enforcement)
- 14% VAT in system_settings seed
- Egyptian weekend Friday+Saturday in system_settings
- pg_cron jobs go in migration SQL; Cloudflare Cron Triggers go in wrangler.jsonc (NOT this phase)
- unit_translations is a standalone CREATE TABLE + INSERT (not just seed)
- holiday_calendar stored in system_settings JSON, not standalone table
- customer_feedback assigned to Phase 13, NOT Phase 14
- ceo_materialized_view_refresh corrected to every 5 min (not 30 min)
- ceo_weekly_insight corrected to Friday 6PM (not Sunday 8PM)

### Claude's Discretion
- Migration file naming and grouping
- Order of trigger creation within migration
- Test approach for verifying triggers/functions

### Deferred Ideas (OUT OF SCOPE)
- Cloudflare Cron Trigger jobs (wrangler.jsonc -- later phases)
- Cloudflare Workers server functions
- Frontend code
- Integration with external services
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-06 | Business logic triggers: quote_accepted -> order + POs, delivery_confirmed -> invoice, payment_bounced -> credit hold, etc. | Full SQL for all 17 triggers in BACKEND.md Section 5.2. Requires generate_sequence_number() as prerequisite. |
| DB-07 | Materialized views: ceo_attention_items (5-min refresh), ap_aging_snapshot (daily) | Full SQL in BACKEND.md Section 7.1-7.2. Need UNIQUE indexes for CONCURRENTLY refresh. |
| DB-08 | Computed functions: payment_behavior_score, customer_tier_score, available_quantity, ar_aging | Full SQL for all 7 functions in BACKEND.md Section 7.3-7.7 plus generate_sequence_number and createNotificationGroup. |
| DB-09 | pg_cron jobs: quote expiry, AR aging snapshots, metrics pre-computation, SLA breach detection | 19 pg_cron jobs listed in BACKEND.md Section 9. Cloudflare Cron jobs (14) are OUT OF SCOPE. |
| DB-10 | Seed data: role_permissions, governorates (27), system_settings defaults, delivery_zones | Full SQL in BACKEND.md Section 12. Role permissions already seeded in Phase 2 (migration 006). |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostgreSQL | 15+ | Database engine | Supabase default |
| pgvector | (vector ext) | Embedding storage | Already enabled in migration 001 |
| pg_cron | (cron ext) | Scheduled jobs | Already enabled in migration 001 |
| pg_trgm | (trgm ext) | Trigram matching | Already enabled in migration 001 |

### Extensions Already Enabled (Phase 2)
All required extensions (`vector`, `pg_cron`, `pg_trgm`) are already created in `20260331000001_extensions.sql`. No new extensions needed.

## Architecture Patterns

### Migration File Structure
```
supabase/migrations/
  20260401000021_support_hr_ai_system_tables.sql     # 25 new tables + RLS
  20260401000022_computed_functions.sql                # 7 computed functions + generate_sequence_number
  20260401000023_business_logic_triggers.sql           # 17 business logic triggers
  20260401000024_materialized_views.sql                # 2 mat views + unique indexes
  20260401000025_pg_cron_jobs.sql                      # 19 pg_cron job schedules
  20260401000026_seed_data.sql                         # governorates, system_settings, sequence_counters, unit_translations
```

### Pattern 1: Idempotent Table Creation
**What:** All DDL wrapped in IF NOT EXISTS / CREATE OR REPLACE
**When to use:** Every migration in this phase
**Example:**
```sql
-- Tables: IF NOT EXISTS
CREATE TABLE IF NOT EXISTS tickets ( ... );

-- Functions: CREATE OR REPLACE
CREATE OR REPLACE FUNCTION on_quote_accepted() ...;

-- Triggers: DROP IF EXISTS + CREATE
DROP TRIGGER IF EXISTS trg_quote_accepted ON quotes;
CREATE TRIGGER trg_quote_accepted ...;

-- pg_cron: Use DO block with exception handling
DO $$
BEGIN
  PERFORM cron.schedule('quote_expiry_check', '*/15 * * * *', $$...$$);
EXCEPTION WHEN duplicate_object THEN
  PERFORM cron.alter('quote_expiry_check', '*/15 * * * *', $$...$$);
END $$;
```

### Pattern 2: Trigger Function with Status Transition Guard
**What:** Business logic triggers check OLD.status != NEW.status before acting
**When to use:** All state-transition triggers
**Example:**
```sql
IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN
  -- business logic here
END IF;
```

### Pattern 3: SECURITY DEFINER for Trigger Functions
**What:** Functions that modify other tables must run as definer to bypass RLS
**When to use:** All business logic trigger functions that INSERT/UPDATE other tables
**Example:**
```sql
CREATE OR REPLACE FUNCTION on_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$ ... $$;
```

### Pattern 4: Materialized View with CONCURRENTLY Support
**What:** Create unique index to enable `REFRESH MATERIALIZED VIEW CONCURRENTLY`
**When to use:** Both materialized views
**Example:**
```sql
CREATE MATERIALIZED VIEW ceo_attention_items AS ... WITH NO DATA;
CREATE UNIQUE INDEX idx_ceo_attention_unique ON ceo_attention_items (item_type, entity_id);
-- Now can use: REFRESH MATERIALIZED VIEW CONCURRENTLY ceo_attention_items;
```

### Anti-Patterns to Avoid
- **Creating triggers before target tables exist:** Phase 14 triggers fire on Phase 13 tables. Verify Phase 13 migrations ran first.
- **Using REFRESH without CONCURRENTLY:** Blocks reads during refresh. Always use CONCURRENTLY after creating unique index.
- **Forgetting SECURITY DEFINER:** Trigger functions that cross table boundaries will fail RLS checks without it.
- **Not using FOR UPDATE in sequence generation:** Race conditions under concurrent inserts. `generate_sequence_number()` MUST use row-level locking.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sequence numbers | Custom app-level counters | `generate_sequence_number()` with FOR UPDATE | Race conditions, gaps, duplicates |
| Materialized view refresh | Manual queries in Workers | pg_cron + `REFRESH CONCURRENTLY` | Reliability, no external dependency |
| State transition validation | App-level checks | `validate_state_transition()` (Phase 13) | Already exists, triggers enforce at DB level |
| Search index sync | Application-level sync | `sync_search_index()` trigger | Consistency guaranteed at DB level |

## Common Pitfalls

### Pitfall 1: Trigger Ordering on quotes Table
**What goes wrong:** `trg_quote_accepted` fires BEFORE `trg_quotes_state` (state machine enforcement), allowing invalid transitions to create orders.
**Why it happens:** PostgreSQL fires BEFORE triggers in alphabetical order by default, then AFTER triggers.
**How to avoid:** State machine trigger is BEFORE UPDATE (enforces valid transition). Business logic trigger is AFTER UPDATE (acts on valid transition). This is already correctly specified in BACKEND.md -- state machine is BEFORE, on_quote_accepted is AFTER.
**Warning signs:** Orders created from quotes that should have been rejected.

### Pitfall 2: Materialized View Initial Refresh
**What goes wrong:** Views created WITH NO DATA are empty until first REFRESH. pg_cron won't trigger until its schedule fires.
**Why it happens:** `WITH NO DATA` means the view starts empty.
**How to avoid:** Add an initial `REFRESH MATERIALIZED VIEW` after creating the view in the migration. Cannot use CONCURRENTLY on first refresh (no data yet).
**Warning signs:** CEO dashboard shows no attention items immediately after deployment.

### Pitfall 3: pg_cron Database Context
**What goes wrong:** pg_cron jobs execute in the `postgres` database by default, not the Supabase project database.
**Why it happens:** Supabase pg_cron extension is configured for the project database, but jobs must specify the correct database context.
**How to avoid:** Use `cron.schedule(job_name, schedule, command)` where command is raw SQL that runs in the current database context. For Supabase, this works correctly since pg_cron is installed in the project database.
**Warning signs:** Jobs scheduled but never produce results.

### Pitfall 4: Circular Trigger Dependencies
**What goes wrong:** `on_quote_accepted` creates an order -> `trg_order_tier4_bypass` fires -> order update triggers other logic -> cascading triggers.
**Why it happens:** INSERT on orders fires BEFORE INSERT triggers (tier4 bypass), which is expected behavior.
**How to avoid:** This is actually correct behavior -- tier4 bypass is a BEFORE INSERT trigger that modifies NEW before the row is committed. No circular dependency. But verify that no trigger UPDATE on orders causes re-entry.
**Warning signs:** Infinite loops, stack overflow errors.

### Pitfall 5: pg_cron Schedule Syntax for Supabase
**What goes wrong:** Supabase managed pg_cron may have different API than self-hosted.
**Why it happens:** Supabase wraps pg_cron in their own management layer.
**How to avoid:** Use standard `SELECT cron.schedule(name, schedule, command)` syntax. Supabase supports this directly. Use `SELECT cron.unschedule(name)` to remove.
**Warning signs:** `ERROR: permission denied for schema cron`.

### Pitfall 6: cheque_tracking Missing Columns
**What goes wrong:** `on_cheque_cleared()` references `NEW.payment_id` but cheque_tracking table structure may not have this column.
**Why it happens:** Spec may have inconsistencies between trigger function and table definition.
**How to avoid:** Cross-verify every column referenced in trigger functions against Phase 13 table definitions.
**Warning signs:** `column "payment_id" does not exist` errors at trigger execution time.

### Pitfall 7: Notifications Table Foreign Key
**What goes wrong:** `customer_onboarding_progress.notification_id` references `notifications(id)`, but notifications table must be created first.
**Why it happens:** Table creation order matters when FK constraints exist.
**How to avoid:** Create notifications table BEFORE customer_onboarding_progress in the migration. Order: notifications -> notification_groups -> then tables that reference them.
**Warning signs:** FK constraint violation during table creation.

### Pitfall 8: Role Permissions Already Seeded
**What goes wrong:** Double-inserting role_permissions causes unique constraint violations.
**Why it happens:** Phase 2 migration `20260331000006_seed_role_permissions.sql` already seeded 359 role-permission rows.
**How to avoid:** Use `ON CONFLICT DO NOTHING` for any role_permission seed inserts, or skip entirely if Phase 2 already covers all needed permissions.
**Warning signs:** Migration failure on unique constraint for role_permissions.

## Code Examples

### generate_sequence_number() -- Thread-Safe
```sql
-- Source: BACKEND.md Section 7 (CONTEXT.md requirement DB-08 #6)
CREATE OR REPLACE FUNCTION generate_sequence_number(
  p_tenant_id UUID,
  p_entity_type TEXT,
  p_prefix TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
  v_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
BEGIN
  UPDATE sequence_counters
  SET current_value = current_value + 1
  WHERE tenant_id = p_tenant_id
    AND entity_type = p_entity_type
    AND COALESCE(year, 0) = COALESCE(v_year, 0)
  RETURNING current_value INTO v_seq;

  IF NOT FOUND THEN
    INSERT INTO sequence_counters (tenant_id, entity_type, prefix, current_value, year)
    VALUES (p_tenant_id, p_entity_type, p_prefix, 1, v_year)
    ON CONFLICT (tenant_id, entity_type, COALESCE(year, 0))
    DO UPDATE SET current_value = sequence_counters.current_value + 1
    RETURNING current_value INTO v_seq;
  END IF;

  RETURN p_prefix || '-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;
```

### pg_cron Job Scheduling (Idempotent)
```sql
-- Source: BACKEND.md Section 9
-- Quote expiry: every 15 min
SELECT cron.schedule(
  'quote_expiry_check',
  '*/15 * * * *',
  $$
    UPDATE quotes
    SET status = 'expired'
    WHERE status IN ('sent', 'viewed')
      AND valid_until < NOW();
  $$
);

-- CEO materialized view refresh: every 5 min (CORRECTED from BACKEND.md's 30 min)
SELECT cron.schedule(
  'ceo_materialized_view_refresh',
  '*/5 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY ceo_attention_items;$$
);

-- AP aging snapshot: daily at 2 AM Cairo time (UTC+2 = midnight UTC)
SELECT cron.schedule(
  'ap_aging_snapshot_refresh',
  '0 0 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY ap_aging_snapshot;$$
);
```

### RLS Pattern for New Tables
```sql
-- Source: BACKEND.md Section 4
-- Standard pattern for system tables with tenant isolation
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY system_settings_internal_all ON system_settings
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY system_settings_external_select ON system_settings
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND tenant_id = (SELECT current_tenant_id()));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| REFRESH MATERIALIZED VIEW | REFRESH ... CONCURRENTLY | PostgreSQL 9.4+ | Non-blocking reads during refresh |
| Application-level cron | pg_cron in-database | Supabase default | No external scheduler needed |
| Manual search index | tsvector + GIN index | Standard PostgreSQL | Built-in full-text search |

## Open Questions

1. **cheque_tracking.payment_id column existence**
   - What we know: `on_cheque_cleared()` references `NEW.payment_id` and `NEW.cheque_number`
   - What's unclear: Need to verify these columns exist in Phase 13's cheque_tracking table definition
   - Recommendation: Cross-check Phase 13 migration 016 during plan execution

2. **pg_cron timezone handling**
   - What we know: Cron schedules are in server timezone (UTC for Supabase)
   - What's unclear: Some jobs specify Cairo time (e.g., "Daily 6:00 AM") -- need to convert to UTC
   - Recommendation: Convert all times: Cairo (UTC+2) to UTC. 6:00 AM Cairo = 4:00 AM UTC

3. **inventory_movements table name**
   - What we know: `trg_inventory_movement` fires on `inventory_movements` but Phase 13 may use `stock_movements`
   - What's unclear: Exact table name in Phase 13 migration
   - Recommendation: Verify table name in migration 014 before creating trigger

4. **on_delivery_confirmed references**
   - What we know: Function references `delivery_items`, `supplier_po_items` tables
   - What's unclear: Whether these Phase 13 tables have the exact column names used
   - Recommendation: Cross-verify column names during implementation

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 (exists in portal app) + raw SQL verification |
| Config file | Portal has vitest config; DB tests are SQL-based |
| Quick run command | `cd supabase && supabase db push --dry-run` |
| Full suite command | `supabase db reset && supabase db push` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-06 | Business triggers fire on status changes | integration | SQL INSERT/UPDATE + verify side effects | Wave 0 |
| DB-07 | Mat views return correct data after refresh | integration | SQL REFRESH + SELECT | Wave 0 |
| DB-08 | Computed functions return expected values | unit | SQL SELECT function(test_data) | Wave 0 |
| DB-09 | pg_cron jobs are scheduled | smoke | `SELECT * FROM cron.job` | Wave 0 |
| DB-10 | Seed data loaded correctly | smoke | `SELECT COUNT(*) FROM governorates` etc. | Wave 0 |

### Sampling Rate
- **Per task commit:** `supabase db push --dry-run` (syntax validation)
- **Per wave merge:** `supabase db reset` (full schema rebuild)
- **Phase gate:** All migrations apply cleanly on fresh database

### Wave 0 Gaps
- [ ] SQL test script for trigger verification (INSERT test data, UPDATE status, verify cascading effects)
- [ ] SQL test script for computed function verification (INSERT test invoices/payments, call functions, verify scores)
- [ ] Verification query for pg_cron job listing

## Migration Dependency Graph

```
Phase 2 (extensions, enums, auth) ──┐
                                     ├──> Phase 14 Migration 021 (tables)
Phase 13 (orders, deliveries, etc.) ─┘         │
                                               v
                                    Migration 022 (computed functions)
                                               │
                                               v
                                    Migration 023 (triggers) ──> depends on 022 for generate_sequence_number
                                               │
                                               v
                                    Migration 024 (materialized views)
                                               │
                                               v
                                    Migration 025 (pg_cron) ──> depends on 024 for REFRESH commands
                                               │
                                               v
                                    Migration 026 (seed data) ──> depends on 021 for tables
```

## Key Implementation Details

### Tables to Create (25 total)

| Domain | Tables | Count |
|--------|--------|-------|
| Support | tickets, ticket_messages | 2 |
| HR/Onboarding | onboarding_sequences, onboarding_steps, customer_onboarding_progress, governorates | 4 |
| AI/Search | ai_conversations, ai_messages, ai_request_log, document_embeddings, product_embeddings, business_data_embeddings, search_index | 7 |
| System | notifications, notification_groups, documents, system_settings, sequence_counters, state_history, webhook_events, weather_alerts, carrier_routing_config, otp_delivery_log, ceo_digests, unit_translations | 12 |

### Triggers to Create (17 business logic + universal)

| Trigger | Fires On | Type | Prerequisite |
|---------|----------|------|-------------|
| trg_quote_accepted | quotes (Phase 13) | AFTER UPDATE | generate_sequence_number() |
| trg_delivery_confirmed | deliveries (Phase 13) | AFTER UPDATE | None |
| trg_payment_bounced | payments (Phase 13) | AFTER UPDATE | notifications table |
| trg_cheque_cleared | cheque_tracking (Phase 13) | AFTER UPDATE | None |
| trg_inventory_movement | inventory_movements (Phase 13) | AFTER INSERT | None |
| trg_search_index_sync | multiple tables | AFTER INSERT/UPDATE | search_index table |
| trg_new_driver_signup | drivers (Phase 13) | BEFORE INSERT | notifications table |
| trg_customer_created_onboarding | customers (Phase 13) | AFTER INSERT | onboarding tables |
| trg_product_wind_sensitivity | products (Phase 13) | BEFORE INSERT/UPDATE | None |
| trg_weather_set_blocking | weather_alerts (Phase 14) | BEFORE INSERT/UPDATE | weather_alerts table |
| trg_prevent_lifo | tenants (Phase 2) | BEFORE INSERT/UPDATE | None |
| trg_drop_ship_dispatched | deliveries (Phase 13) | AFTER UPDATE | drop_ship_pod (Phase 13) |
| trg_order_tier4_bypass | orders (Phase 13) | BEFORE INSERT | None |
| trg_check_exchange_rate_variance | supplier_pos (Phase 13) | BEFORE INSERT | notifications, system_settings |
| trg_generate_coded_delivery_reference | supplier_pos (Phase 13) | BEFORE INSERT | sequence_counters |
| trg_on_po_confirmed_send_delivery_note | supplier_pos (Phase 13) | AFTER UPDATE | notifications |
| trg_set_dispute_sla_deadline | invoice_disputes (Phase 13) | BEFORE INSERT | None |

Plus universal triggers (set_tenant, updated_at, audit) for all 25 new tables.

### pg_cron Jobs (19 database-side only)

| Job | Schedule (UTC) | Core SQL |
|-----|---------------|----------|
| quote_expiry_check | */15 * * * * | UPDATE quotes SET status = 'expired' WHERE ... |
| invoice_overdue_check | 0 4 * * * | UPDATE invoices SET status = 'overdue' WHERE ... |
| credit_hold_check | 0 6 * * * | UPDATE customers SET credit_hold = true WHERE ... |
| ceo_materialized_view_refresh | */5 * * * * | REFRESH CONCURRENTLY ceo_attention_items |
| cheque_maturity_check | 0 4 * * * | SELECT + notify for maturing cheques |
| account_deletion_purge | 0 0 * * * | DELETE + anonymize expired accounts |
| driver_compliance_check | 0 4 * * * | Check license/registration expiry |
| search_index_sync | */5 * * * * | Batch tsvector updates |
| escalation_check | */30 * * * * | SLA breach detection |
| inventory_reorder_alert | 0 5 * * * | Below reorder point check |
| session_cleanup | 0 1 * * * | Purge expired sessions |
| audit_log_archive | 0 23 1 * * | Archive old audit entries |
| ai_usage_aggregation | 0 21 * * * | Aggregate AI token usage |
| revenue_recognition_audit | 0 0 1 * * | Verify revenue events |
| otp_delivery_rate_update | 0 21 * * 0 | Calculate OTP delivery rates |
| onboarding_stale_check | 0 7 * * * | Flag stalled onboarding |
| auto_confirm_drop_ship | 0 6 * * * | Auto-confirm 72h drop-ships |
| dispute_sla_check | 0 7 * * * | Escalate 48h SLA breaches |
| ai_log_cleanup | 0 1 * * 0 | Delete old AI logs |

### Seed Data

| Data Set | Source | Count | Notes |
|----------|--------|-------|-------|
| Governorates | BACKEND.md 12.3 | 27 rows | Static reference data |
| System Settings | BACKEND.md 12.2 | ~25 rows | Per-tenant defaults |
| Sequence Counters | BACKEND.md 12.4 | 13 types per tenant | For document numbering |
| Unit Translations | BACKEND.md 12.5 | 29 rows | CREATE TABLE + INSERT |
| Role Permissions | BACKEND.md 12.1 | Already done in Phase 2 | Skip or ON CONFLICT |

## Project Constraints (from CLAUDE.md)

- **Architecture:** Supabase PostgreSQL, NOT any other database
- **Egyptian law:** 14% VAT, LIFO prohibited, ETA e-invoicing, Sun-Thu work week, Cairo truck ban 6AM-midnight
- **Code conventions:** All migrations must be idempotent
- **Non-negotiable:** RLS on every table, pgvector HNSW indexes for embeddings (m=16, ef_construction=64)

## Sources

### Primary (HIGH confidence)
- BACKEND.md Section 3.13-3.16 -- all 25 table definitions (CREATE TABLE SQL)
- BACKEND.md Section 5.2 -- all 17 trigger function SQL
- BACKEND.md Section 7 -- materialized views + computed functions SQL
- BACKEND.md Section 9 -- pg_cron job list with schedules
- BACKEND.md Section 12 -- seed data SQL
- BACKEND.md Section 4 -- RLS policies for new tables
- Existing migrations (20260331000001 through 20260401000020) -- verified current state

### Secondary (MEDIUM confidence)
- CONTEXT.md corrections (ceo refresh 5min, weekly insight Friday 6PM) -- user-specified overrides

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all PostgreSQL, extensions already enabled
- Architecture: HIGH - full SQL provided in BACKEND.md, pattern matches Phase 13
- Pitfalls: HIGH - known PostgreSQL behaviors, verified against spec

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable PostgreSQL patterns, no version changes expected)
