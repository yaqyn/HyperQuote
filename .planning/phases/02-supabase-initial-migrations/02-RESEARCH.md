# Phase 2: Supabase + Initial Migrations - Research

**Researched:** 2026-03-31
**Domain:** Supabase PostgreSQL migrations, auth hooks, RLS, database schema
**Confidence:** HIGH

## Summary

Phase 2 establishes the database foundation: extensions, enums, auth tables, helper functions, custom access token hook, and seed data. The Supabase CLI (v2.84.2, already installed) manages migrations as numbered SQL files in `supabase/migrations/`. The CONTEXT.md provides complete SQL for every object, with three critical discrepancies that must be resolved during implementation.

The main technical risks are: (1) `app_role` enum missing 14 roles referenced in seed data, (2) `app_permission` enum using different naming than seed data permissions, and (3) `user_profiles` table missing the `pool` column referenced by `custom_access_token_hook`. All three are well-documented in CONTEXT.md with clear resolutions.

**Primary recommendation:** Use `supabase init` to scaffold, write 6 sequential migrations matching CONTEXT.md spec, resolve all 3 discrepancies in-migration, configure the custom access token hook in `config.toml`, and validate with `supabase db reset`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `supabase init` in project root
- 6 migrations: 001 extensions, 002 enums, 003 auth tables, 004 helper functions, 005 custom_access_token_hook, 006 seed data
- Extensions: pgcrypto, pg_trgm, pgvector, pg_cron, supa_audit
- All 50+ enums from BACKEND.md Section 2
- Auth tables: tenants, user_profiles, user_roles, role_permissions, employees, approvals, audit_log
- 12 auth helper functions from Section 4
- Custom access token hook with proper grants
- Role_permissions seed data
- `(SELECT auth.uid())` pattern enforced in ALL RLS policies
- Bun, NOT npm

### Claude's Discretion
- Resolution approach for app_role enum vs seed data mismatch (expand enum)
- Resolution approach for app_permission enum vs seed data mismatch (expand enum or rewrite seed)
- Resolution approach for missing `pool` column on user_profiles (add column)
- Deferred FK strategy for user_profiles references to tables not yet created
- Audit_log partition creation strategy (how many months ahead)
- credit_status enum default resolution

### Deferred Ideas (OUT OF SCOPE)
- Remaining 87 tables (Phase 13)
- RLS policies for non-auth tables (Phase 13)
- State machine triggers (Phase 13)
- Business logic triggers (Phase 14)
- Materialized views (Phase 14)
- pg_cron jobs (Phase 14)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-02 | Supabase project initialized with all 52 enums + auth/tenant tables + RLS helper functions | Supabase CLI init + 6 sequential migrations cover this completely. CONTEXT.md provides full SQL. |
| DB-02 | All 52 enums created | CONTEXT.md lists all enums with full CREATE TYPE SQL. Must expand app_role to include 14 missing roles from seed data. |
| DB-04 | Auth helper functions (12): pool extractors, role/permission checkers, tenant_id trigger, updated_at trigger, custom access token hook | CONTEXT.md provides complete SQL for all 12 functions + hook. config.toml hook registration required for local dev. |
</phase_requirements>

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Supabase CLI | 2.84.2 | Local dev, migrations, db management | Already installed, manages full local Supabase stack |
| PostgreSQL | 15+ (via Supabase) | Database engine | Supabase bundles Postgres 15 |
| Docker | 29.3.1 | Runs local Supabase containers | Required by `supabase start` |

### Extensions (enabled in Migration 001)
| Extension | Purpose | Notes |
|-----------|---------|-------|
| pgcrypto | `gen_random_uuid()` for UUID PKs | Built into Supabase, just needs `CREATE EXTENSION` |
| pg_trgm | Fuzzy text search via trigram similarity | Standard Postgres extension |
| pgvector (vector) | Vector embeddings for AI search | Extension name is `vector`, not `pgvector` |
| pg_cron | Scheduled database jobs | Available in Supabase, requires schema specification |
| supa_audit (audit) | Automatic audit logging | Supabase's own extension; enable tracking per-table later |

**Installation:**
```bash
# No package installation needed -- this phase is pure SQL migrations
# Supabase CLI is already installed (v2.84.2)
supabase init  # Creates supabase/ directory with config.toml
supabase start # Starts local Postgres + Auth + etc. via Docker
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
  config.toml                    # Local dev config (auth hooks, extensions)
  migrations/
    20260331000001_extensions.sql
    20260331000002_enums.sql
    20260331000003_auth_tables.sql
    20260331000004_auth_functions.sql
    20260331000005_access_token_hook.sql
    20260331000006_seed_role_permissions.sql
  seed.sql                       # Optional dev seed data (test tenant, test user)
```

### Pattern 1: Migration Naming
**What:** Supabase CLI uses timestamp-prefixed migration files.
**When to use:** Always -- `supabase migration new <name>` generates the timestamp automatically.
**Example:**
```bash
supabase migration new extensions
# Creates: supabase/migrations/20260331XXXXXX_extensions.sql
```

### Pattern 2: Custom Access Token Hook Registration
**What:** The hook must be registered in `config.toml` for local development.
**When to use:** After creating the hook function in a migration.
```toml
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```
**Source:** [Supabase Auth Hooks Docs](https://supabase.com/docs/guides/auth/auth-hooks)

### Pattern 3: Deferred Foreign Keys
**What:** `user_profiles` references `customers`, `suppliers`, `drivers` tables that don't exist until Phase 13.
**When to use:** Phase 2 -- omit these FK constraints now, add them in Phase 13 migrations.
**Example:**
```sql
-- Phase 2: Create user_profiles WITHOUT deferred FKs
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  user_type     user_type NOT NULL,
  customer_id   UUID,          -- FK added in Phase 13
  supplier_id   UUID,          -- FK added in Phase 13
  driver_id     UUID,          -- FK added in Phase 13
  employee_id   UUID REFERENCES employees(id),  -- employees created in this phase
  pool          TEXT NOT NULL DEFAULT 'external' CHECK (pool IN ('internal', 'external')),
  -- ... rest of columns
);

-- COMMENT explaining deferred FKs
COMMENT ON COLUMN user_profiles.customer_id IS 'FK to customers(id) added in Phase 13';
COMMENT ON COLUMN user_profiles.supplier_id IS 'FK to suppliers(id) added in Phase 13';
COMMENT ON COLUMN user_profiles.driver_id IS 'FK to drivers(id) added in Phase 13';
```

### Pattern 4: Partitioned Audit Log
**What:** `audit_log` is partitioned by month on `created_at`. Partitions must be pre-created.
**When to use:** Migration 003 for the parent table, then create initial partitions.
**Example:**
```sql
-- Create parent (partitioned) table
CREATE TABLE audit_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY,
  -- ... columns ...
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);

-- Create partitions for current + next 3 months
CREATE TABLE audit_log_2026_04 PARTITION OF audit_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE audit_log_2026_05 PARTITION OF audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE audit_log_2026_06 PARTITION OF audit_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE audit_log_2026_07 PARTITION OF audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```
**Source:** [Supabase Partitioning Docs](https://supabase.com/docs/guides/database/partitions)

### Anti-Patterns to Avoid
- **`auth.uid()` without subquery:** NEVER use `auth.uid()` directly in RLS policies. Always `(SELECT auth.uid())` -- avoids per-row re-evaluation, 99.99% perf improvement on large tables.
- **Hardcoded enum values in app code:** Always reference the database enum; never duplicate enum lists in TypeScript.
- **Missing indexes on RLS columns:** Every column used in RLS policies (`user_id`, `tenant_id`, `created_by`, `assigned_to`) MUST have an index.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audit logging | Custom trigger-based audit | `supa_audit` extension | Handles edge cases (TRUNCATE, schema changes), stable record_id UUIDs |
| UUID generation | Custom UUID functions | `pgcrypto` + `gen_random_uuid()` | Built-in, cryptographically secure |
| Fuzzy text search | Custom LIKE/ILIKE queries | `pg_trgm` + GIN indexes | Orders of magnitude faster, supports similarity scoring |
| Migration management | Manual SQL scripts | `supabase migration` CLI | Tracks applied state, supports `db reset`, integrates with CI |

## Common Pitfalls

### Pitfall 1: app_role Enum Missing Seed Data Roles
**What goes wrong:** Seed migration fails with "invalid input value for enum app_role" because 14 roles in seed data aren't in the enum.
**Why it happens:** BACKEND.md Section 12.1 seed data references roles (`ceo`, `sales_director`, `bdr`, `quoting_specialist`, `procurement_officer`, `warehouse_worker`, `quality_inspector`, `dispatcher`, `accountant`, `ar_clerk`, `ap_clerk`, `credit_manager`, `cs_agent`, `cs_manager`) not in the original `app_role` enum.
**How to avoid:** Expand `app_role` enum in Migration 002 to include ALL roles referenced anywhere in the codebase. Add the 14 missing roles.
**Warning signs:** Seed migration (006) fails on INSERT.

### Pitfall 2: app_permission Enum vs Seed Data Naming Mismatch
**What goes wrong:** Seed data uses permission strings like `quote_requests.read`, `orders.read_own`, `payments.create` that don't match enum values like `quotes.create`, `finance.record_payment`.
**Why it happens:** The enum was designed with grouped prefixes (e.g., `finance.*`) while seed data uses entity-specific prefixes (e.g., `payments.*`, `invoices.*`).
**How to avoid:** Audit every permission string in seed data against the enum. Choose ONE naming convention and align both. Recommendation: expand the enum to match seed data (more granular = better RBAC).
**Warning signs:** Seed migration fails, or `authorize()` function returns false for permissions that should be granted.

### Pitfall 3: Missing `pool` Column on user_profiles
**What goes wrong:** `custom_access_token_hook` queries `p.pool` from `user_profiles` but the column doesn't exist, causing login failures.
**Why it happens:** BACKEND.md table definition omits `pool` but the hook function references it.
**How to avoid:** Add `pool TEXT NOT NULL DEFAULT 'external' CHECK (pool IN ('internal', 'external'))` to `user_profiles` in Migration 003.
**Warning signs:** Auth hook errors on user login, JWT missing `pool` claim.

### Pitfall 4: Partitioned Table Without Partitions
**What goes wrong:** INSERT into `audit_log` fails with "no partition of relation audit_log found for row".
**Why it happens:** Parent partitioned table exists but no child partitions created for the current date range.
**How to avoid:** Create partitions for current month + 3 months ahead in Migration 003. Plan a pg_cron job (Phase 14) to auto-create future partitions.
**Warning signs:** Any audit_log INSERT fails immediately.

### Pitfall 5: Extension Schema Placement
**What goes wrong:** Extensions created without specifying schema end up in `public`, polluting the namespace.
**Why it happens:** Default behavior puts extensions in the current schema.
**How to avoid:** Use `CREATE EXTENSION IF NOT EXISTS <ext> SCHEMA extensions;` for pgcrypto, pg_trgm, pgvector. Note: `pg_cron` and `supa_audit` have their own schemas (`cron` and `audit` respectively). Supabase pre-creates an `extensions` schema for this purpose.
**Warning signs:** `\dx` shows extensions in public schema.

### Pitfall 6: credit_status Enum Default Mismatch
**What goes wrong:** `customers` table (Phase 13) will use `DEFAULT 'pending_review'` which isn't a valid `credit_status` enum value.
**Why it happens:** Spec inconsistency between enum definition and table default.
**How to avoid:** Add `'pending_review'` to the `credit_status` enum in Migration 002, or document that Phase 13 must use `'not_evaluated'` as the default.
**Warning signs:** Phase 13 migration fails on customers table creation.

### Pitfall 7: SECURITY DEFINER Functions Without search_path
**What goes wrong:** SECURITY DEFINER functions can be exploited via `search_path` manipulation.
**Why it happens:** Without `SET search_path = public`, malicious schema objects could intercept function calls.
**How to avoid:** Always include `SET search_path = public` on SECURITY DEFINER functions. The CONTEXT.md SQL already includes this -- don't remove it.
**Warning signs:** Security audit flags.

## Code Examples

### Migration 001: Extensions
```sql
-- Source: CONTEXT.md + Supabase docs
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;  -- pgvector
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA cron;       -- pg_cron uses cron schema
CREATE EXTENSION IF NOT EXISTS supa_audit CASCADE;        -- creates audit schema
```

### config.toml Auth Hook Configuration
```toml
# Source: https://supabase.com/docs/guides/auth/auth-hooks
[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/public/custom_access_token_hook"
```

### Validation Query: Enum Count
```sql
-- Verify all enums exist
SELECT typname, array_length(enum_range(null::app_role), 1) AS role_count;
SELECT typname, array_length(enum_range(null::app_permission), 1) AS perm_count;
-- Expected: role_count >= 36, perm_count >= 76 (after expansion)
```

### Validation Query: Auth Functions
```sql
-- Verify all 12 functions exist
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN (
  'get_user_pool', 'is_internal_user', 'is_external_user',
  'current_tenant_id', 'current_user_type', 'current_customer_id',
  'current_supplier_id', 'current_driver_id',
  'has_role', 'authorize', 'set_tenant_id', 'update_updated_at'
)
ORDER BY proname;
-- Expected: 12 rows
```

### Validation Query: Tables
```sql
-- Verify auth tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'tenants', 'user_profiles', 'user_roles', 'role_permissions',
  'employees', 'approvals', 'audit_log'
)
ORDER BY tablename;
-- Expected: 7 rows
```

### Validation Query: Seed Data
```sql
-- Verify role_permissions populated
SELECT role, count(*) AS perm_count
FROM role_permissions
GROUP BY role
ORDER BY perm_count DESC;
-- Expected: 15+ roles with permissions assigned
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `supabase db push` (diff-based) | `supabase migration up` (file-based) | 2024 | Use migration files for reproducibility |
| pgAudit (log-based) | supa_audit (table-based) | 2023 | supa_audit gives queryable audit data, pgAudit writes to log files |
| Manual JWT claim injection | Auth hooks (custom_access_token) | 2024 | config.toml registration, cleaner than raw triggers |
| Custom RBAC in app layer | DB-level authorize() with SECURITY DEFINER | Standard | RLS + DB functions = zero-trust at data layer |

## Open Questions

1. **Enum expansion scope**
   - What we know: 14 roles and ~30 permissions need adding to match seed data
   - What's unclear: Whether to add them all now or only the ones needed for Phase 2
   - Recommendation: Add ALL now in Migration 002. Cheaper to have unused enum values than to ALTER TYPE later (Postgres enum modification is limited).

2. **supa_audit tracking targets**
   - What we know: Extension will be installed in Phase 2
   - What's unclear: Which tables to enable tracking on immediately
   - Recommendation: Install extension only. Enable tracking per-table in Phase 13 when remaining tables are created. Auth tables (user_profiles, user_roles) are good candidates for immediate tracking.

3. **Local vs Remote Supabase**
   - What we know: `supabase init` + `supabase start` runs fully local
   - What's unclear: Whether a remote Supabase project exists yet
   - Recommendation: Work fully local for Phase 2. Link to remote project later. All migrations are version-controlled and reproducible.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | All migrations | Yes | 2.84.2 | -- |
| Docker | `supabase start` | Yes | 29.3.1 | -- |
| PostgreSQL client (psql) | Validation queries | Yes | 18.3 | -- |
| Bun | Package management | Yes | 1.3.11 | -- |

**Missing dependencies with no fallback:** None -- all tools available.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Supabase CLI + raw SQL assertions |
| Config file | `supabase/config.toml` (created in this phase) |
| Quick run command | `supabase db reset` (applies all migrations + seed) |
| Full suite command | `supabase db reset && psql $DATABASE_URL -f tests/validate_phase2.sql` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-02 | All enums + tables + functions exist | smoke | `psql -c "SELECT count(*) FROM pg_type WHERE typname = 'app_role'"` | No -- Wave 0 |
| DB-02 | All 52+ enums queryable | smoke | `psql -c "SELECT typname FROM pg_type WHERE typtype = 'e' AND typnamespace = 'public'::regnamespace"` | No -- Wave 0 |
| DB-04 | 12 auth functions execute | smoke | `psql -c "SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname LIKE '%user%' OR proname LIKE '%tenant%' OR proname LIKE '%role%' OR proname LIKE '%authorize%'"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `supabase db reset` (verifies migrations apply cleanly)
- **Per wave merge:** Full validation queries against local DB
- **Phase gate:** All validation queries pass, `supabase db reset` is idempotent

### Wave 0 Gaps
- [ ] `supabase/config.toml` -- created by `supabase init`
- [ ] Validation SQL script for smoke-testing all enums, tables, and functions

## Sources

### Primary (HIGH confidence)
- CONTEXT.md (02-CONTEXT.md) -- complete SQL for all migrations, discrepancies documented
- [Supabase Auth Hooks Docs](https://supabase.com/docs/guides/auth/auth-hooks) -- config.toml syntax for custom_access_token hook
- [Supabase Partitioning Docs](https://supabase.com/docs/guides/database/partitions) -- PARTITION BY RANGE pattern
- [supa_audit GitHub](https://github.com/supabase/supa_audit) -- extension usage, 3k ops/sec limit

### Secondary (MEDIUM confidence)
- [Supabase Local Development Docs](https://supabase.com/docs/guides/local-development/overview) -- migration workflow
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) -- migration best practices
- [Supabase PGAudit Docs](https://supabase.com/docs/guides/database/extensions/pgaudit) -- pgAudit vs supa_audit distinction

### Tertiary (LOW confidence)
- None -- all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Supabase CLI verified installed, all tools available
- Architecture: HIGH -- CONTEXT.md provides complete SQL, patterns are standard Supabase
- Pitfalls: HIGH -- All 3 critical discrepancies are documented with resolutions
- Enum/seed alignment: MEDIUM -- exact final enum values need careful audit during implementation

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (stable domain, Supabase CLI evolves slowly)
