# Phase 13: Database -- Order + Delivery + Finance Tables - Research

**Researched:** 2026-04-01
**Domain:** PostgreSQL schema design, Supabase RLS, state machines, multi-tenant indexing
**Confidence:** HIGH

## Summary

Phase 13 creates ~61 business tables across 10 domains (customer, supplier, product extension, quote, order, procurement, inventory, delivery, finance, driver marketplace + delivery zones), adds RLS policies to all of them, implements a state machine transition function with enforcement triggers on 7 tables, and creates 50+ indexes. All table definitions are fully specified in BACKEND.md Sections 3.2-3.12 with complete CREATE TABLE SQL.

The existing codebase already has 9 migrations establishing: extensions, 50 enums, 7 auth/tenant tables, 12 auth helper functions, the products table, seed data, and quote request tables (with customer_addresses and projects as FK-deferred stubs). Phase 13 must create the prerequisite tables first (customers, suppliers, etc.), then retroactively add deferred FKs to existing tables (user_profiles.customer_id, user_profiles.supplier_id, user_profiles.driver_id, customer_addresses.customer_id, projects.customer_id, quote_requests.customer_id).

**Primary recommendation:** Split into 8 migrations by domain in strict FK dependency order. Create prerequisite tables first, then add deferred FKs, then build downstream tables. Use `IF NOT EXISTS` everywhere for idempotency. Financial tables get MFA-gated RLS. State machine function + triggers in a dedicated migration at the end.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
No explicit locked decisions section in CONTEXT.md -- all decisions are embedded in the "What to Build" and "Non-Negotiable Rules" sections:
- All 61 tables must follow BACKEND.md Sections 3.2-3.12 exactly
- RLS on every table with `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`
- `(SELECT auth.uid())` subquery pattern in all RLS policies
- State machine enforcement via trigger (validate_state_transition + enforce_state_transition)
- Financial tables require MFA (AAL2) in RLS
- Partitioned tables: driver_locations by recorded_at
- Idempotent migrations: CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE FUNCTION
- VAT is 14%
- LIFO prohibited under Egyptian Accounting Standards

### Claude's Discretion
- Migration file naming and grouping (how many files, what goes where)
- Order of index creation within migrations
- Whether to combine RLS policies with table creation or separate

### Deferred Ideas (OUT OF SCOPE)
- Business logic triggers (DB-06) -- Phase 14
- Materialized views (DB-07) -- Phase 14
- Computed functions (DB-08) -- Phase 14
- pg_cron jobs (DB-09) -- Phase 14
- Seed data for role_permissions, governorates, system_settings, delivery_zones (DB-10) -- Phase 14
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DB-01 | All 94 tables + 2 materialized views created with correct types, constraints, and indexes | Phase 13 covers 61 of these tables (prerequisite + business). Remaining tables (support, HR, AI, system) and materialized views are in other phases. All CREATE TABLE SQL is in BACKEND.md 3.2-3.12. |
| DB-03 | RLS policies for all tables: internal by tenant, external by customer_id/supplier_id/driver_id | RLS policy patterns documented in BACKEND.md 4.2. Four access patterns: internal (tenant_id), customer (customer_id), supplier (supplier_id), driver (driver_id). Financial tables add AAL2 MFA gate. |
| DB-05 | State machine transition function + enforcement triggers for all state machines | validate_state_transition() covers 7 entity types. enforce_state_transition() trigger applied to quote_requests, quotes, orders, supplier_pos, deliveries, invoices, payments. Full function SQL in CONTEXT.md. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase CLI | 2.84.2 | Migration management | Already installed, `supabase migration new` for each file |
| PostgreSQL | 15+ | Database engine | Supabase-managed, supports GENERATED ALWAYS AS, partitioning |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| psql | 18.3 | Direct SQL execution, EXPLAIN ANALYZE verification | Post-migration index validation |
| Supabase Studio | local | Visual schema inspection | Verify table/policy creation |

**Migration command:**
```bash
supabase migration new <name>
```

## Architecture Patterns

### Migration File Structure
```
supabase/migrations/
  20260401000010_customers_suppliers.sql      # Domain: customer + supplier prerequisite tables
  20260401000011_product_extensions.sql        # Domain: product_suppliers, pricing_rules, contract_prices
  20260401000012_deferred_fks.sql              # Add FKs to existing tables (user_profiles, customer_addresses, projects, quote_requests)
  20260401000013_quotes_orders.sql             # Domain: quotes, quote_items, orders, order_items
  20260401000014_procurement_inventory.sql     # Domain: supplier_pos, inventory, warehouses, etc.
  20260401000015_delivery.sql                  # Domain: vehicles, drivers, routes, deliveries, POD, driver_locations (partitioned)
  20260401000016_finance.sql                   # Domain: invoices, payments, cheques, credit notes, returns, etc.
  20260401000017_marketplace_zones_feedback.sql # Domain: driver_jobs, driver_earnings, delivery_zones, customer_feedback
  20260401000018_state_machine.sql             # validate_state_transition() + enforce_state_transition() + triggers
  20260401000019_indexes.sql                   # All indexes (after tables exist)
  20260401000020_rls_policies.sql              # All RLS policies (ENABLE + FORCE + CREATE POLICY)
```

### Pattern 1: FK Dependency Order
**What:** Tables must be created in strict dependency order since PostgreSQL enforces FK constraints at CREATE TABLE time.
**When to use:** Every migration.
**Critical chain:**
```
tenants (exists)
  -> customers -> customer_contacts, credit_applications, customer_feedback
  -> suppliers -> supplier_contacts, supplier_price_lists, supplier_agreements
  -> products (exists) -> product_suppliers, pricing_rules, contract_prices
  -> addresses (polymorphic, no customer FK)
  -> projects (has customer FK)
  -> quote_requests (exists, needs customer FK added)
  -> quotes -> quote_items
  -> orders -> order_items
  -> supplier_pos -> supplier_po_items
  -> supplier_inquiries
  -> warehouses -> warehouse_locations -> inventory
  -> vehicles, drivers
  -> delivery_routes -> deliveries -> delivery_items, proof_of_delivery, drop_ship_pod
  -> driver_locations (partitioned, no FK enforcement)
  -> vehicle_inspections, driver_shifts, load_verifications
  -> invoices -> invoice_items, invoice_disputes
  -> payments -> payment_applications, cheque_tracking
  -> letters_of_credit
  -> returns (circular: references credit_notes AND orders AND deliveries)
  -> credit_notes (references returns -- circular with returns)
  -> credit_note_applications
  -> withholding_tax_certificates, company_bank_accounts
  -> supplier_invoices -> supplier_invoice_items
  -> ar_aging_snapshots, revenue_recognition_events
  -> driver_jobs, driver_earnings
  -> delivery_zones
```

### Pattern 2: Deferred FK Resolution
**What:** Several existing tables have columns that were created WITHOUT FK constraints because the referenced table didn't exist yet. Phase 13 must add these FKs.
**Tables needing FK addition:**
```sql
-- user_profiles: customer_id, supplier_id, driver_id
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_customer FOREIGN KEY (customer_id) REFERENCES customers(id);
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_driver FOREIGN KEY (driver_id) REFERENCES drivers(id);

-- customer_addresses: customer_id
ALTER TABLE customer_addresses ADD CONSTRAINT fk_customer_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

-- projects: customer_id (already has column, needs FK constraint)
ALTER TABLE projects ADD CONSTRAINT fk_projects_customer FOREIGN KEY (customer_id) REFERENCES customers(id);

-- quote_requests: customer_id
ALTER TABLE quote_requests ADD CONSTRAINT fk_quote_requests_customer FOREIGN KEY (customer_id) REFERENCES customers(id);
```

### Pattern 3: Deferred FK Columns (within Phase 13)
**What:** Some tables within this phase have cross-references that require deferred handling.
```sql
-- order_items.supplier_po_id -> supplier_pos(id) -- added after supplier_pos created
-- order_items.warehouse_id -> warehouses(id) -- added after warehouses created
-- deliveries.invoice_id -> invoices(id) -- added after invoices created
-- supplier_pos.receiving_warehouse_id -> warehouses(id) -- added after warehouses created
-- credit_notes.return_id -> returns(id) -- circular: create returns first, credit_notes second, add FK later
-- drop_ship_pod.invoice_id -> invoices(id) -- added after invoices created
```

### Pattern 4: Partitioned Table (driver_locations)
**What:** driver_locations is partitioned by recorded_at for efficient data pruning.
```sql
CREATE TABLE driver_locations (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id       UUID NOT NULL,
  driver_id       UUID NOT NULL,
  delivery_id     UUID,
  route_id        UUID,
  latitude        DECIMAL(10,7) NOT NULL,
  longitude       DECIMAL(10,7) NOT NULL,
  speed_kmh       DECIMAL(5,1),
  heading         DECIMAL(5,1),
  accuracy_meters DECIMAL(6,1),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (recorded_at, id)
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions
CREATE TABLE driver_locations_2026_04 PARTITION OF driver_locations
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE driver_locations_2026_05 PARTITION OF driver_locations
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE driver_locations_2026_06 PARTITION OF driver_locations
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE driver_locations_2026_07 PARTITION OF driver_locations
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```
**Note:** No FK constraints on partitioned table columns (driver_id, delivery_id, route_id) -- PostgreSQL doesn't support FK references FROM partitioned tables to regular tables when the FK column is not part of the partition key.

### Pattern 5: Generated Columns
**What:** Several tables use GENERATED ALWAYS AS ... STORED for computed fields.
```sql
-- inventory.quantity_available
quantity_available DECIMAL(12,3) GENERATED ALWAYS AS
  (quantity_on_hand - quantity_reserved - quantity_allocated) STORED,

-- inventory.atp (available-to-promise)
atp DECIMAL(12,3) GENERATED ALWAYS AS
  (quantity_on_hand - quantity_reserved - quantity_allocated + quantity_incoming) STORED,

-- invoices.balance_due
balance_due DECIMAL(15,2) GENERATED ALWAYS AS (total - amount_paid - adjustment_amount) STORED,

-- payments.unapplied_amount
unapplied_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount - applied_amount) STORED,

-- letters_of_credit.amount_available
amount_available DECIMAL(15,2) GENERATED ALWAYS AS (amount - amount_drawn) STORED,

-- credit_notes.remaining_amount
remaining_amount DECIMAL(15,2) GENERATED ALWAYS AS (amount - applied_amount) STORED,

-- revenue_recognition_events.gross_margin, margin_percent, fiscal_quarter
```

### Pattern 6: RLS Policy Conventions
**What:** Four access patterns used consistently.
```sql
-- 1. Internal users: tenant-scoped
CREATE POLICY {table}_internal_all ON {table}
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- 2. External customers: customer-scoped
CREATE POLICY {table}_customer_select ON {table}
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

-- 3. External suppliers: supplier-scoped
CREATE POLICY {table}_supplier_select ON {table}
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

-- 4. Financial tables: add MFA gate
CREATE POLICY {table}_internal_all ON {table}
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK (...same...);
```

### Pattern 7: Circular FK Resolution (returns <-> credit_notes)
**What:** `returns` has `credit_note_id UUID REFERENCES credit_notes(id)` and `credit_notes` has `return_id UUID REFERENCES returns(id)`. Both can't reference each other at CREATE TABLE time.
**Solution:** Create `returns` first WITHOUT the `credit_note_id` FK, create `credit_notes` WITH the `return_id` FK, then ALTER TABLE returns to add the `credit_note_id` FK.

### Anti-Patterns to Avoid
- **auth.uid() without SELECT wrapper:** Always `(SELECT auth.uid())` -- 94-99% performance improvement from initPlan caching.
- **OR in permissive RLS policies:** Use separate policies instead -- OR creates security holes.
- **FK on partitioned table columns:** PostgreSQL doesn't support FK constraints from partitioned tables when FK column isn't in partition key. driver_locations intentionally has no FK.
- **Missing FORCE ROW LEVEL SECURITY:** Must use both ENABLE and FORCE -- FORCE ensures table owner is also subject to RLS.
- **Non-idempotent migrations:** Always use `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `CREATE INDEX IF NOT EXISTS`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State machine validation | Custom per-table check constraints | Single validate_state_transition() function | Centralized, testable, 7 entity types in one function |
| Tenant isolation | Per-query WHERE clauses | RLS policies with set_tenant_id() trigger | Impossible to forget, enforced at DB level |
| Updated timestamps | Application-level setting | update_updated_at() trigger | Cannot be bypassed by direct SQL |
| Number sequences | Application-generated numbers | PostgreSQL sequences + generate functions | Race-condition-free, gap-free under normal operation |

## Common Pitfalls

### Pitfall 1: FK Order in Migrations
**What goes wrong:** CREATE TABLE fails with "relation does not exist" because referenced table hasn't been created yet.
**Why it happens:** Tables have complex cross-domain FKs (orders -> addresses, deliveries -> warehouses, invoices -> deliveries).
**How to avoid:** Follow the strict dependency chain documented above. When circular, use ALTER TABLE ADD CONSTRAINT after both tables exist.
**Warning signs:** Migration error mentioning "relation X does not exist".

### Pitfall 2: Existing Table Conflicts
**What goes wrong:** Phase 13 tries to create tables that already exist from earlier migrations (products, customer_addresses, projects, quote_requests).
**Why it happens:** Phase 9 migration already created customer_addresses, projects, quote_requests with deferred FKs.
**How to avoid:** Do NOT re-create these tables. Only ALTER TABLE to add missing FK constraints. The products table also already exists (migration 007) -- do NOT recreate.
**Existing tables to NOT create:** `products`, `customer_addresses`, `projects`, `quote_requests`, `quote_request_items`, `quote_request_attachments`.

### Pitfall 3: BACKEND.md vs Existing Migration Schema Differences
**What goes wrong:** BACKEND.md spec has a richer schema for tables like `projects` and `quote_requests` than what was created in Phase 9 (migration 009). Phase 9 created simplified versions.
**Why it happens:** Phase 9 was built from portal needs (minimal fields), while BACKEND.md has the full enterprise spec.
**How to avoid:** For already-created tables, use ALTER TABLE ADD COLUMN to add missing columns from the BACKEND.md spec rather than dropping and recreating. Compare column-by-column.
**Key differences to reconcile:**
- `projects`: Phase 9 has (id, tenant_id, customer_id, name, description, is_active, created_at, updated_at). BACKEND.md adds: project_number, address_id, start_date, estimated_end_date, actual_end_date, project_budget, total_quoted/ordered/delivered/invoiced/paid, status, assigned_sales_rep, notes, tags, stage, UNIQUE constraint.
- `quote_requests`: Phase 9 has simplified version. BACKEND.md adds: requested_delivery_date (vs delivery_date), sla_deadline, hold_reason, rejection_reason, source, reviewed_at, priority_score, estimated_value. Phase 9 has extra fields: attachment_urls, submitted_by, idempotency_key, approval_required, approved_by, approval_notes.
- `customer_addresses`: BACKEND.md uses `addresses` (polymorphic) instead of `customer_addresses`. These are DIFFERENT tables with different schemas. Both need to exist.

### Pitfall 4: inventory UNIQUE Constraint with COALESCE
**What goes wrong:** The inventory table has a complex unique constraint using COALESCE for nullable columns.
**Why it happens:** Same product can be in multiple locations within a warehouse, and lot tracking is optional.
**How to avoid:** Use the exact COALESCE pattern from BACKEND.md:
```sql
UNIQUE (tenant_id, product_id, warehouse_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'), COALESCE(lot_number, ''))
```

### Pitfall 5: RLS Policy Name Conflicts
**What goes wrong:** Multiple policies with the same name on different tables cause confusion; or policies on already-RLS-enabled tables (like products) conflict.
**Why it happens:** Phase 2 migration 007 already created RLS policies on products. Phase 13 may need to update them.
**How to avoid:** Check existing policies before creating. Use `DROP POLICY IF EXISTS` before `CREATE POLICY` when updating existing tables. For products, the BACKEND.md spec has richer policies (supplier-scoped SELECT) that Phase 2 didn't include.

### Pitfall 6: BACKEND.md RLS Uses Different Table Names
**What goes wrong:** BACKEND.md Section 4.2 references table names that don't match actual table names (e.g., `quote_line_items` vs `quote_items`, `purchase_order_items` vs `supplier_po_items`, `delivery_stops` which doesn't exist).
**Why it happens:** The RLS section was written separately from the CREATE TABLE section and uses slightly different naming.
**How to avoid:** Use the CREATE TABLE names as authoritative. Adapt RLS policy SQL to use correct table names: `quote_items` (not `quote_line_items`), `supplier_po_items` (not `purchase_order_items`). Skip policies for tables that don't exist in Phase 13 (delivery_stops, notifications, documents, search_index, etc.).

### Pitfall 7: cheque_tracking Has No customer_id Column
**What goes wrong:** BACKEND.md RLS for cheque_tracking uses `customer_id = (SELECT current_customer_id())` but the CREATE TABLE definition has no customer_id column.
**Why it happens:** cheque_tracking is linked to customer via payment_id -> payments.customer_id (indirect).
**How to avoid:** Use EXISTS subquery through payments table for customer-scoped RLS, OR skip customer-scoped policy for cheque_tracking (internal-only access is more appropriate for cheque management).

### Pitfall 8: order_items Has No tenant_id Column
**What goes wrong:** BACKEND.md RLS for order_items uses `tenant_id = (SELECT current_tenant_id())` but order_items CREATE TABLE has no tenant_id.
**Why it happens:** Child tables (order_items, delivery_items, quote_items, etc.) inherit tenant scope from parent via FK.
**How to avoid:** For child tables without tenant_id, use EXISTS subquery through parent:
```sql
CREATE POLICY oi_internal_all ON order_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND (SELECT is_internal_user()) AND o.tenant_id = (SELECT current_tenant_id())));
```

### Pitfall 9: Generated Column References in revenue_recognition_events
**What goes wrong:** The `fiscal_quarter` column uses `CEIL(fiscal_month / 3.0)::int` which requires careful type handling.
**Why it happens:** PostgreSQL GENERATED ALWAYS AS requires the expression to match the column type exactly.
**How to avoid:** Use the exact expression from BACKEND.md. Test with INSERT after creation.

### Pitfall 10: Remaining RLS Tables Use current_setting Pattern
**What goes wrong:** BACKEND.md Section 4.2 "Remaining Tables" uses `(current_setting('app.current_tenant_id'))::UUID` instead of `(SELECT current_tenant_id())`.
**Why it happens:** Inconsistency in the spec -- two different patterns for the same thing.
**How to avoid:** Normalize ALL policies to use `(SELECT current_tenant_id())` which is the project standard (uses JWT claims, not session settings). The `current_setting` pattern requires SET statements which are reset after each Hyperdrive transaction.

## Code Examples

### State Machine Function (verified from CONTEXT.md)
```sql
-- Full implementation in 13-CONTEXT.md lines 316-408
-- Covers: quote_request, quote, order, supplier_po, delivery, invoice, payment
CREATE OR REPLACE FUNCTION public.validate_state_transition(
  entity_type TEXT, old_status TEXT, new_status TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
-- ... (see CONTEXT.md for complete implementation)
$$;
```

### Enforcement Trigger (verified from CONTEXT.md)
```sql
CREATE OR REPLACE FUNCTION public.enforce_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_entity_type TEXT;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'quote_requests' THEN 'quote_request'
    WHEN 'quotes' THEN 'quote'
    WHEN 'orders' THEN 'order'
    WHEN 'supplier_pos' THEN 'supplier_po'
    WHEN 'deliveries' THEN 'delivery'
    WHEN 'invoices' THEN 'invoice'
    WHEN 'payments' THEN 'payment'
    ELSE TG_TABLE_NAME
  END;
  IF NOT public.validate_state_transition(v_entity_type, OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid % status transition: % -> %', v_entity_type, OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
```

### MFA-Gated Financial RLS (verified from BACKEND.md 4.2)
```sql
CREATE POLICY invoices_internal_all ON invoices
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user())
    AND tenant_id = (SELECT current_tenant_id())
    AND (auth.jwt()->>'aal') = 'aal2'
  )
  WITH CHECK (
    (SELECT is_internal_user())
    AND tenant_id = (SELECT current_tenant_id())
    AND (auth.jwt()->>'aal') = 'aal2'
  );
```

### Deferred FK Addition
```sql
-- After customers table exists, add FK to user_profiles
DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `auth.uid()` in RLS | `(SELECT auth.uid())` subquery | Supabase performance guide | 94-99% faster RLS evaluation |
| Single RLS policy with OR | Separate permissive policies per role | PostgreSQL security best practice | Prevents security holes from OR logic |
| App-level tenant filtering | RLS + FORCE ROW LEVEL SECURITY | Supabase standard | Cannot be bypassed, even by table owner |

## Open Questions

1. **Projects table schema reconciliation**
   - What we know: Phase 9 created a minimal `projects` table. BACKEND.md has a much richer schema with 20+ columns.
   - What's unclear: Whether to ALTER TABLE add all missing columns now or defer to when they're needed.
   - Recommendation: Add all columns now -- they're defined in the spec, cost nothing to have, and prevent future ALTER TABLE migrations.

2. **Addresses table vs customer_addresses**
   - What we know: Phase 9 created `customer_addresses`. BACKEND.md defines `addresses` (polymorphic, addressable_type + addressable_id). Both exist in the spec.
   - What's unclear: Whether customer_addresses should be migrated to addresses or both should coexist.
   - Recommendation: Create the `addresses` table as specified in BACKEND.md. The existing `customer_addresses` table can coexist -- it's used by the portal already. A future migration can consolidate if needed.

3. **letters_of_credit.status default value**
   - What we know: BACKEND.md says `DEFAULT 'active'` but the lc_status enum doesn't have 'active' -- it has 'draft', 'issued', 'advised', etc.
   - Recommendation: Use `DEFAULT 'draft'` which matches the enum and business logic.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Supabase CLI | Migration management | Yes | 2.84.2 | -- |
| PostgreSQL (via Supabase) | Database engine | Yes | 15+ (local) | -- |
| psql | EXPLAIN ANALYZE verification | Yes | 18.3 | Supabase Studio SQL editor |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | psql + Supabase CLI |
| Config file | supabase/config.toml |
| Quick run command | `supabase db reset` |
| Full suite command | `supabase db reset && psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f tests/phase13_verify.sql` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DB-01 | All tables exist with correct columns | smoke | `psql ... -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"` | No -- Wave 0 |
| DB-03 | RLS blocks cross-tenant access | integration | `psql ... -c "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public'"` | No -- Wave 0 |
| DB-05 | State machine blocks invalid transitions | unit | `psql ... -c "SELECT validate_state_transition('order', 'confirmed', 'completed')"` (should return FALSE) | No -- Wave 0 |
| DB-01 | Indexes exist on RLS columns | smoke | `psql ... -c "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_%'"` | No -- Wave 0 |
| DB-01 | EXPLAIN ANALYZE shows index usage | integration | `psql ... -c "EXPLAIN ANALYZE SELECT * FROM orders WHERE tenant_id = '...' AND status = 'confirmed'"` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `supabase db reset` (applies all migrations)
- **Per wave merge:** Full reset + table count + policy count + index count verification
- **Phase gate:** All migrations apply cleanly, state machine rejects invalid transitions, EXPLAIN ANALYZE confirms index usage

### Wave 0 Gaps
- [ ] `tests/phase13_verify.sql` -- SQL script that counts tables, policies, indexes, and tests state machine transitions
- [ ] Verification queries for each domain (customer, supplier, order, delivery, finance)

## Sources

### Primary (HIGH confidence)
- BACKEND.md Sections 3.2-3.12 -- Complete CREATE TABLE SQL for all 61 tables
- BACKEND.md Section 4.2 -- Complete RLS policy SQL
- BACKEND.md Section 8 -- Complete index definitions (50+ indexes)
- 13-CONTEXT.md -- State machine function, enforcement triggers, key indexes, RLS patterns
- Existing migrations (003, 004, 007, 009) -- Current schema baseline

### Secondary (MEDIUM confidence)
- Supabase RLS performance guide -- (SELECT auth.uid()) pattern, FORCE ROW LEVEL SECURITY

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already installed and verified
- Architecture: HIGH - All SQL defined in BACKEND.md, existing patterns established in Phase 2
- Pitfalls: HIGH - Identified from direct comparison of existing migrations vs BACKEND.md spec

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable -- PostgreSQL DDL patterns don't change)
