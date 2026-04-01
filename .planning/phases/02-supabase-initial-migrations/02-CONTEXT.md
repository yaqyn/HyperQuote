# Phase 2: Supabase + Initial Migrations

## Goal
Database foundation exists with all enums, auth tables, RLS helpers, and seed data so that auth and tenancy work end-to-end.

## Dependencies
Phase 1 (Monorepo Scaffold must be complete).

## Requirements

- **FOUND-02**: Supabase project initialized with all 52 enums + auth/tenant tables + RLS helper functions
- **DB-02**: All 52 enums created
- **DB-04**: Auth helper functions (12): pool extractors, role/permission checkers, tenant_id trigger, updated_at trigger, custom access token hook

## Success Criteria
1. All 52 enums are queryable in the database
2. Auth tables (tenants, user_profiles, user_roles, role_permissions, employees, approvals, audit_log) exist with correct constraints
3. All 12 auth helper functions execute correctly (pool extractors, role checkers, tenant trigger, updated_at trigger, access token hook)
4. Role_permissions seed data is loaded and `(SELECT auth.uid())` pattern is enforced in all RLS policies

## What to Build
- `supabase init` in project root
- Migration 001: extensions (`pgcrypto`, `pg_trgm`, `pgvector`, `pg_cron`, `supa_audit`)
- Migration 002: all 52 enums from BACKEND.md Section 2
- Migration 003: `tenants`, `user_profiles`, `user_roles`, `role_permissions`, `employees`, `approvals`, `audit_log` tables
- Migration 004: auth helper functions (12 functions from Section 4)
- Migration 005: custom_access_token_hook
- Migration 006: role_permissions seed data
- `supabase db push` or `supabase migration up`

## Spec References

### Migration 001: Extensions

| Extension | Purpose |
|-----------|---------|
| `pgcrypto` | `gen_random_uuid()` for UUID primary keys |
| `pg_trgm` | Trigram similarity for fuzzy text search |
| `pgvector` | Vector embeddings for AI search (1536-dim) |
| `pg_cron` | Scheduled database jobs (quote expiry, AR aging, etc.) |
| `supa_audit` | Automatic audit logging for all table changes |

### All 50 Enums

#### Auth & System
```sql
CREATE TYPE app_role AS ENUM (
  'super_admin', 'admin', 'operations_manager', 'sales_manager', 'sales_rep',
  'procurement_manager', 'procurement_agent', 'warehouse_manager', 'warehouse_staff',
  'logistics_manager', 'logistics_coordinator', 'driver', 'finance_manager',
  'finance_accountant', 'finance_clerk', 'hr_manager', 'hr_staff',
  'support_manager', 'support_agent', 'customer_admin', 'customer_user', 'supplier_contact'
);

CREATE TYPE app_permission AS ENUM (
  'quotes.create', 'quotes.read', 'quotes.update', 'quotes.delete',
  'quotes.approve', 'quotes.send', 'quotes.negotiate', 'quotes.override_price',
  'orders.create', 'orders.read', 'orders.update',
  'orders.cancel', 'orders.approve', 'orders.override_status',
  'customers.create', 'customers.read', 'customers.update',
  'customers.delete', 'customers.manage_credit',
  'suppliers.create', 'suppliers.read', 'suppliers.update',
  'suppliers.delete', 'suppliers.manage_terms',
  'products.create', 'products.read', 'products.update',
  'products.delete', 'products.manage_pricing',
  'inventory.read', 'inventory.adjust', 'inventory.transfer',
  'inventory.receive', 'inventory.inspect', 'inventory.write_off',
  'procurement.create_po', 'procurement.read_po', 'procurement.approve_po',
  'procurement.receive_po', 'procurement.cancel_po',
  'deliveries.create', 'deliveries.read', 'deliveries.update',
  'deliveries.assign_driver', 'deliveries.confirm',
  'finance.create_invoice', 'finance.read_invoice', 'finance.void_invoice',
  'finance.record_payment', 'finance.manage_credit',
  'finance.approve_credit_note', 'finance.view_reports',
  'hr.read_employees', 'hr.manage_employees', 'hr.manage_payroll',
  'hr.manage_attendance', 'hr.manage_leave',
  'support.create_ticket', 'support.read_ticket',
  'support.assign_ticket', 'support.resolve_ticket',
  'admin.manage_users', 'admin.manage_roles', 'admin.manage_settings',
  'admin.view_audit_log', 'admin.manage_integrations',
  'reports.view_sales', 'reports.view_operations',
  'reports.view_finance', 'reports.export',
  'ai.use_assistant', 'ai.manage_models', 'ai.view_analytics',
  'notifications.manage', 'notifications.broadcast',
  'approvals.override'
);

CREATE TYPE user_type AS ENUM ('internal', 'customer', 'supplier', 'driver');
CREATE TYPE audit_action AS ENUM ('create', 'read', 'update', 'delete', 'login', 'logout', 'approve', 'reject', 'export', 'import', 'escalate');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'escalated', 'expired');
CREATE TYPE approval_type AS ENUM ('quote_discount', 'quote_override', 'order_cancellation', 'credit_extension', 'credit_note', 'purchase_order', 'price_adjustment', 'write_off', 'refund');
CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'whatsapp', 'push');
CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE urgency AS ENUM ('standard', 'rush', 'emergency');
CREATE TYPE inventory_costing_method AS ENUM ('wac', 'fifo');
```

#### Customer & Contact
```sql
CREATE TYPE customer_tier AS ENUM ('tier_1_new', 'tier_2_verified', 'tier_3_established', 'tier_4_preferred', 'tier_5_suspended');
CREATE TYPE address_type AS ENUM ('billing', 'shipping', 'site', 'warehouse', 'office', 'other');
CREATE TYPE contact_type AS ENUM ('primary', 'billing', 'shipping', 'technical', 'procurement', 'executive', 'site_engineer');
CREATE TYPE credit_status AS ENUM ('not_evaluated', 'under_review', 'approved', 'conditional', 'suspended', 'revoked', 'expired');
```

#### Product & Inventory
```sql
CREATE TYPE product_category AS ENUM (
  'cement', 'reinforcing_steel', 'structural_steel', 'aggregates', 'sand',
  'ready_mix_concrete', 'bricks', 'blocks', 'tiles_ceramic', 'tiles_porcelain',
  'marble', 'granite', 'lumber', 'plywood', 'insulation', 'waterproofing',
  'pipes_pvc', 'pipes_metal', 'electrical_cable', 'electrical_conduit',
  'paint', 'adhesives', 'glass', 'aluminum_profiles', 'gypsum_board',
  'roofing', 'hardware_fasteners'
);

CREATE TYPE unit_of_measure AS ENUM (
  'ton', 'kg', 'g', 'cubic_meter', 'liter', 'meter', 'centimeter', 'millimeter',
  'square_meter', 'piece', 'unit', 'bag', 'bag_50kg', 'bag_25kg', 'pallet',
  'bundle', 'roll', 'sheet', 'panel', 'box', 'carton', 'drum', 'coil',
  'bar', 'length', 'trip', 'load', 'set', 'pair'
);

CREATE TYPE inventory_status AS ENUM ('available', 'reserved', 'quarantine', 'damaged', 'in_transit', 'pending_inspection', 'returned', 'committed', 'write_off');
CREATE TYPE stock_movement_type AS ENUM ('receipt', 'issue', 'transfer_in', 'transfer_out', 'adjustment_up', 'adjustment_down', 'return_in', 'return_out', 'write_off', 'cycle_count', 'reservation');
CREATE TYPE inspection_result AS ENUM ('pass', 'fail', 'conditional', 'pending');
CREATE TYPE stock_confidence AS ENUM ('fresh', 'aging', 'stale');
CREATE TYPE reservation_type AS ENUM ('soft', 'hard');
CREATE TYPE reservation_status AS ENUM ('active', 'expired', 'converted');
```

#### Quote & Order
```sql
CREATE TYPE quote_request_status AS ENUM ('draft', 'submitted', 'under_review', 'sourcing', 'quote_ready', 'on_hold', 'rejected', 'withdrawn', 'cancelled');
CREATE TYPE quote_status AS ENUM ('draft', 'internal_review', 'pending_approval', 'approved', 'sent', 'viewed', 'negotiating', 'revised', 'accepted', 'declined', 'expired', 'cancelled', 'requires_re_quote');
CREATE TYPE order_status AS ENUM ('confirmed', 'processing', 'partially_fulfilled', 'fulfilled', 'completed', 'on_hold', 'cancellation_requested', 'back_ordered', 'cancelled');
```

#### Procurement
```sql
CREATE TYPE supplier_po_status AS ENUM ('draft', 'sent', 'confirmed', 'in_production', 'shipped', 'partially_received', 'received', 'inspected', 'closed', 'rejected', 'cancelled');
CREATE TYPE po_type AS ENUM ('stock', 'customer_linked');
CREATE TYPE fulfillment_source AS ENUM ('own_stock', 'supplier_drop', 'supplier_cross', 'inter_transfer');
```

#### Delivery & Logistics
```sql
CREATE TYPE delivery_status AS ENUM ('scheduled', 'picking_loading', 'dispatched', 'in_transit', 'at_site', 'delivered', 'partially_delivered', 'failed', 'rescheduled', 'returned', 'cancelled');
CREATE TYPE driver_type AS ENUM ('internal', 'contracted', 'on_demand');
CREATE TYPE vehicle_type AS ENUM ('pickup', 'flatbed', 'box_truck', 'tanker', 'dump_truck', 'trailer', 'semi_trailer', 'crane_truck', 'concrete_mixer');
CREATE TYPE vehicle_status AS ENUM ('available', 'in_use', 'maintenance', 'out_of_service', 'reserved');
CREATE TYPE egyptian_license_class AS ENUM ('third_degree', 'second_degree', 'first_degree');
CREATE TYPE delivery_failure_reason AS ENUM ('customer_refused', 'site_not_ready', 'access_blocked', 'wrong_address', 'customer_absent', 'safety_concern', 'vehicle_breakdown', 'weather', 'documentation_issue', 'damaged_in_transit');
CREATE TYPE shipping_method AS ENUM ('own_fleet', 'three_pl', 'supplier_direct', 'customer_pickup');
CREATE TYPE drop_ship_pod_status AS ENUM ('awaiting_supplier_pod', 'awaiting_customer_confirmation', 'confirmed', 'disputed', 'auto_confirmed');
```

#### Finance
```sql
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'viewed', 'partially_paid', 'paid', 'overdue', 'collections', 'disputed', 'adjusted', 'cancelled', 'written_off');
CREATE TYPE invoice_type AS ENUM ('standard', 'proforma', 'credit_note', 'debit_note', 'advance', 'retention', 'final');
CREATE TYPE payment_status AS ENUM ('expected', 'received', 'matched', 'fully_applied', 'partially_applied', 'overpayment', 'unmatched', 'bounced', 'refunded');
CREATE TYPE payment_method AS ENUM ('wire_transfer', 'post_dated_cheque', 'certified_cheque', 'cash', 'letter_of_credit', 'bank_guarantee');
CREATE TYPE payment_terms AS ENUM ('cod', 'cia', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'lc_at_sight', 'lc_30_days', 'lc_60_days', 'custom');
CREATE TYPE credit_note_status AS ENUM ('draft', 'pending_approval', 'approved', 'applied', 'partially_applied', 'void');
CREATE TYPE cheque_status AS ENUM ('received', 'deposited', 'cleared', 'bounced', 'replaced', 'written_off');
CREATE TYPE lc_status AS ENUM ('draft', 'issued', 'advised', 'confirmed', 'partially_drawn', 'fully_drawn', 'expired', 'cancelled', 'amended');
CREATE TYPE return_status AS ENUM ('requested', 'under_review', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'inspecting', 'restocked', 'credit_issued', 'closed');
CREATE TYPE dispute_reason AS ENUM ('incorrect_amount', 'damaged_goods', 'wrong_items', 'missing_items', 'duplicate_invoice', 'pricing_disagreement', 'other');
CREATE TYPE dispute_status AS ENUM ('open', 'investigating', 'awaiting_evidence', 'resolved', 'escalated');
CREATE TYPE dispute_resolution_type AS ENUM ('adjusted', 'credit_note_issued', 'invoice_maintained', 'partially_adjusted');
```

#### Support & Documents
```sql
CREATE TYPE ticket_status AS ENUM ('new', 'open', 'in_progress', 'awaiting_customer', 'awaiting_internal', 'awaiting_supplier', 'escalated', 'resolved', 'closed', 'reopened');
CREATE TYPE ticket_priority AS ENUM ('critical', 'high', 'medium', 'low', 'informational');
CREATE TYPE ticket_category AS ENUM ('order_issue', 'delivery_issue', 'quality_complaint', 'billing_dispute', 'product_inquiry', 'return_request', 'account_issue', 'technical_support', 'general');
CREATE TYPE document_type AS ENUM ('commercial_register', 'tax_card', 'vat_certificate', 'insurance_certificate', 'bank_letter', 'delivery_note', 'weight_ticket', 'inspection_report', 'material_test_certificate', 'photo', 'signed_contract', 'purchase_order', 'invoice', 'packing_list', 'other');
```

### Auth Tables (Section 3.1) — Full CREATE TABLE SQL

```sql
CREATE TABLE tenants (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT UNIQUE NOT NULL,
  domain                    TEXT,
  logo_url                  TEXT,
  settings                  JSONB DEFAULT '{}',
  timezone                  TEXT DEFAULT 'Africa/Cairo',
  currency                  TEXT DEFAULT 'EGP',
  tax_id                    TEXT,
  commercial_register       TEXT,                          -- Egyptian commercial register
  tax_registration_number   TEXT,                          -- Egyptian 9-digit TRN
  inventory_costing_method  inventory_costing_method NOT NULL DEFAULT 'wac', -- WAC or FIFO only; LIFO prohibited (EAS)
  is_active                 BOOLEAN DEFAULT TRUE,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  user_type     user_type NOT NULL,               -- 'internal','customer','supplier','driver'
  customer_id   UUID REFERENCES customers(id),    -- deferred FK
  supplier_id   UUID REFERENCES suppliers(id),    -- deferred FK
  driver_id     UUID REFERENCES drivers(id),      -- deferred FK
  employee_id   UUID REFERENCES employees(id),    -- deferred FK
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  display_name  TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email         TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  locale        TEXT DEFAULT 'en',                -- 'en' or 'ar'
  is_active     BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  mfa_enabled   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE user_roles (
  id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       app_role NOT NULL,
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, role, tenant_id)
);
```

```sql
CREATE TABLE role_permissions (
  id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  role       app_role NOT NULL,
  permission app_permission NOT NULL,
  UNIQUE (role, permission)
);
```

```sql
CREATE TABLE employees (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  user_id                  UUID UNIQUE REFERENCES auth.users(id),
  employee_number          TEXT NOT NULL,
  first_name_ar            TEXT,                         -- Arabic first name
  last_name_ar             TEXT,                         -- Arabic last name
  department               TEXT NOT NULL,
  title                    TEXT,
  reports_to               UUID REFERENCES employees(id),
  hire_date                DATE,
  base_salary              DECIMAL(15,2),                -- monthly base salary in EGP
  social_insurance_salary  DECIMAL(15,2),                -- salary basis for social insurance calc
  is_driver                BOOLEAN DEFAULT FALSE,        -- whether this employee is a delivery driver
  cdl_class                egyptian_license_class,       -- Egyptian driving license class
  medical_card_expiry      DATE,                         -- driver medical card expiration
  drug_test_status         TEXT,                         -- latest drug test result
  moffett_certified        BOOLEAN DEFAULT FALSE,        -- forklift / moffett certification
  is_active                BOOLEAN DEFAULT TRUE,
  phone_extension          TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, employee_number)
);
```

```sql
CREATE TABLE approvals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  approval_type     approval_type NOT NULL,
  entity_type       TEXT NOT NULL,
  entity_id         UUID NOT NULL,
  requested_by      UUID NOT NULL REFERENCES auth.users(id),
  requested_at      TIMESTAMPTZ DEFAULT NOW(),
  assigned_to       UUID NOT NULL REFERENCES auth.users(id),
  status            approval_status DEFAULT 'pending',
  decision_notes    TEXT,
  decided_at        TIMESTAMPTZ,
  escalated_to      UUID REFERENCES auth.users(id),
  escalated_at      TIMESTAMPTZ,
  escalation_reason TEXT,
  expires_at        TIMESTAMPTZ,
  context           JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
-- Partitioned by month on created_at
CREATE TABLE audit_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id      UUID NOT NULL,
  user_id        UUID,
  user_email     TEXT,
  user_role      TEXT,
  ip_address     INET,
  user_agent     TEXT,
  action         audit_action NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      UUID,
  old_values     JSONB,
  new_values     JSONB,
  changed_fields TEXT[],
  description    TEXT,
  metadata       JSONB DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (created_at, id)
) PARTITION BY RANGE (created_at);
```

Key points:
- `tenants`: includes `inventory_costing_method` (WAC or FIFO, LIFO prohibited by EAS), `currency` defaults to EGP, `timezone` defaults to Africa/Cairo
- `user_profiles`: links to auth.users via `user_id`, references customers/suppliers/drivers/employees via nullable FKs, `display_name` is GENERATED ALWAYS
- `user_roles`: composite unique on (user_id, role, tenant_id), supports expiration
- `role_permissions`: maps roles to permissions, seeded with data
- `employees`: includes Egyptian-specific fields (cdl_class as egyptian_license_class, social_insurance_salary)
- `approvals`: generic approval workflow for quotes, credit, POs, etc. — links to any entity via entity_type + entity_id
- `audit_log`: partitioned by month on created_at — requires partition creation per month

### 12 Auth Helper Functions — Full SQL

#### Pool & Identity Extractors

```sql
-- 1. get_user_pool() - Returns pool from JWT app_metadata
CREATE OR REPLACE FUNCTION public.get_user_pool()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'pool'),
    'external'
  );
$$;

-- 2. is_internal_user() - Returns TRUE if pool = 'internal'
CREATE OR REPLACE FUNCTION public.is_internal_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (SELECT public.get_user_pool()) = 'internal';
$$;

-- 3. is_external_user() - Returns TRUE if pool = 'external'
CREATE OR REPLACE FUNCTION public.is_external_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (SELECT public.get_user_pool()) = 'external';
$$;

-- 4. current_tenant_id() - Returns tenant_id UUID from JWT
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'tenant_id')::UUID,
    NULL
  );
$$;

-- 5. current_user_type() - Returns user_type from JWT
CREATE OR REPLACE FUNCTION public.current_user_type()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt()->'app_metadata'->>'user_type'),
    'unknown'
  );
$$;

-- 6. current_customer_id() - Returns customer_id UUID from JWT
CREATE OR REPLACE FUNCTION public.current_customer_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'customer_id')::UUID;
$$;

-- 7. current_supplier_id() - Returns supplier_id UUID from JWT
CREATE OR REPLACE FUNCTION public.current_supplier_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'supplier_id')::UUID;
$$;

-- 8. current_driver_id() - Returns driver_id UUID from JWT
CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT (auth.jwt()->'app_metadata'->>'driver_id')::UUID;
$$;
```

#### Role & Permission Checkers

```sql
-- 9. has_role(required_role TEXT) - Checks JWT roles array
CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(
      COALESCE(auth.jwt()->'app_metadata'->'roles', '[]'::jsonb)
    ) AS role
    WHERE role = required_role
  );
$$;

-- 10. authorize(requested_permission app_permission) - SECURITY DEFINER
--     Checks role_permissions table against user's roles
CREATE OR REPLACE FUNCTION public.authorize(requested_permission app_permission)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_roles jsonb;
  has_permission boolean := false;
BEGIN
  user_roles := COALESCE(auth.jwt()->'app_metadata'->'roles', '[]'::jsonb);

  SELECT EXISTS (
    SELECT 1
    FROM public.role_permissions rp
    WHERE rp.permission = requested_permission
      AND rp.role IN (
        SELECT jsonb_array_elements_text(user_roles)
      )
  ) INTO has_permission;

  RETURN has_permission;
END;
$$;
```

#### Trigger Functions

```sql
-- 11. set_tenant_id() - BEFORE INSERT trigger, auto-sets tenant_id from JWT
CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL OR NEW.tenant_id != (SELECT public.current_tenant_id()) THEN
    NEW.tenant_id := (SELECT public.current_tenant_id());
  END IF;

  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant context found. Ensure user has tenant_id in JWT claims.';
  END IF;

  RETURN NEW;
END;
$$;

-- 12. update_updated_at() - BEFORE UPDATE trigger, sets updated_at = NOW()
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;
```

### Custom Access Token Hook — Full SQL

```sql
-- custom_access_token_hook: Injects pool, user_type, tenant_id, roles,
-- customer_id, supplier_id, driver_id into JWT claims.
-- Configured in Supabase Dashboard > Auth > Hooks > Customize Access Token
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_profile record;
  user_roles jsonb;
  user_id uuid;
BEGIN
  user_id := (event->>'user_id')::UUID;

  SELECT
    p.pool,
    p.user_type,
    p.tenant_id,
    p.customer_id,
    p.supplier_id,
    p.driver_id
  INTO user_profile
  FROM public.user_profiles p
  WHERE p.user_id = custom_access_token_hook.user_id;

  -- BUG FIX: The original BACKEND.md has `WHERE p.id = user_id` which queries the
  -- profile's PK, not the auth user FK. The correct query is
  -- `WHERE p.user_id = custom_access_token_hook.user_id` (using the function parameter
  -- name to avoid ambiguity with the column name).

  IF NOT FOUND THEN
    RETURN event;
  END IF;

  SELECT COALESCE(
    jsonb_agg(ur.role),
    '[]'::jsonb
  )
  INTO user_roles
  FROM public.user_roles ur
  WHERE ur.user_id = custom_access_token_hook.user_id;

  claims := event->'claims';

  claims := jsonb_set(
    claims,
    '{app_metadata}',
    COALESCE(claims->'app_metadata', '{}'::jsonb) ||
    jsonb_build_object(
      'pool',        COALESCE(user_profile.pool, 'external'),
      'user_type',   COALESCE(user_profile.user_type, 'unknown'),
      'tenant_id',   user_profile.tenant_id,
      'roles',       user_roles,
      'customer_id', user_profile.customer_id,
      'supplier_id', user_profile.supplier_id,
      'driver_id',   user_profile.driver_id
    )
  );

  event := jsonb_set(event, '{claims}', claims);

  RETURN event;
END;
$$;

-- Grant execute to supabase_auth_admin (required for hooks)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from public (security best practice)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM anon;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated;
```

### JWT Claims Structure
```json
// External customer
{ "pool": "external", "user_type": "customer", "tenant_id": "...", "customer_id": "..." }
// Internal employee
{ "pool": "internal", "user_type": "employee", "tenant_id": "...", "roles": ["sales_rep"] }
// External driver
{ "pool": "external", "user_type": "driver", "tenant_id": "...", "driver_id": "...", "driver_status": "active" }
```

### Role-Permission Seed Data (Section 12.1)

```sql
-- CEO: ALL 76 permissions
INSERT INTO role_permissions (role, permission) VALUES
  ('ceo', 'quote_requests.read'), ('ceo', 'quote_requests.create'), ('ceo', 'quote_requests.update'),
  ('ceo', 'quote_requests.delete'), ('ceo', 'quote_requests.assign'),
  ('ceo', 'quotes.read'), ('ceo', 'quotes.create'), ('ceo', 'quotes.update'),
  ('ceo', 'quotes.delete'), ('ceo', 'quotes.approve'), ('ceo', 'quotes.send'),
  ('ceo', 'orders.read'), ('ceo', 'orders.read_own'), ('ceo', 'orders.create'),
  ('ceo', 'orders.update'), ('ceo', 'orders.delete'), ('ceo', 'orders.cancel'),
  ('ceo', 'purchase_orders.read'), ('ceo', 'purchase_orders.create'), ('ceo', 'purchase_orders.update'),
  ('ceo', 'purchase_orders.delete'), ('ceo', 'purchase_orders.approve'), ('ceo', 'purchase_orders.send'),
  ('ceo', 'inventory.read'), ('ceo', 'inventory.create'), ('ceo', 'inventory.update'), ('ceo', 'inventory.delete'),
  ('ceo', 'deliveries.read'), ('ceo', 'deliveries.read_assigned'), ('ceo', 'deliveries.create'),
  ('ceo', 'deliveries.update'), ('ceo', 'deliveries.delete'), ('ceo', 'deliveries.dispatch'),
  ('ceo', 'invoices.read'), ('ceo', 'invoices.create'), ('ceo', 'invoices.update'),
  ('ceo', 'invoices.delete'), ('ceo', 'invoices.approve'), ('ceo', 'invoices.send'),
  ('ceo', 'payments.read'), ('ceo', 'payments.create'), ('ceo', 'payments.update'),
  ('ceo', 'payments.delete'), ('ceo', 'payments.reconcile'),
  ('ceo', 'credit.read'), ('ceo', 'credit.update'), ('ceo', 'credit.approve'),
  ('ceo', 'returns.read'), ('ceo', 'returns.create'), ('ceo', 'returns.update'),
  ('ceo', 'returns.approve'), ('ceo', 'returns.close'),
  ('ceo', 'customers.read'), ('ceo', 'customers.create'), ('ceo', 'customers.update'),
  ('ceo', 'customers.delete'), ('ceo', 'customers.assign'),
  ('ceo', 'suppliers.read'), ('ceo', 'suppliers.create'), ('ceo', 'suppliers.update'), ('ceo', 'suppliers.delete'),
  ('ceo', 'products.read'), ('ceo', 'products.create'), ('ceo', 'products.update'), ('ceo', 'products.delete'),
  ('ceo', 'drivers.read'), ('ceo', 'drivers.create'), ('ceo', 'drivers.update'),
  ('ceo', 'vehicles.read'), ('ceo', 'vehicles.create'), ('ceo', 'vehicles.update'),
  ('ceo', 'tickets.read'), ('ceo', 'tickets.create'), ('ceo', 'tickets.update'),
  ('ceo', 'tickets.assign'), ('ceo', 'tickets.escalate'), ('ceo', 'tickets.close'),
  ('ceo', 'reports.read'), ('ceo', 'reports.create'), ('ceo', 'reports.export'),
  ('ceo', 'users.read'), ('ceo', 'users.manage'), ('ceo', 'users.settings'),
  ('ceo', 'ai.use'), ('ceo', 'ai.admin');

-- ADMIN: Same as CEO (all 76)
-- SALES DIRECTOR: Sales + read adjacent
-- SALES MANAGER: Quotes, orders, customers, reports
-- SALES REP: Own quotes/orders, customer management
-- QUOTING SPECIALIST: Quote creation and pricing
-- BDR: Lead gen, customer creation, quote requests
-- PROCUREMENT MANAGER: POs, suppliers, products, inventory read
-- PROCUREMENT OFFICER: POs (no delete/approve), suppliers
-- WAREHOUSE MANAGER: Full inventory, deliveries read, returns
-- WAREHOUSE WORKER: Inventory read/update, assigned deliveries
-- QUALITY INSPECTOR: Inventory, PO receiving, returns
-- DISPATCHER: Full delivery, driver/vehicle read
-- DRIVER: Assigned deliveries only
-- ACCOUNTANT: Full finance, reports
-- AR CLERK: Invoices read, payment CRUD
-- AP CLERK: Supplier invoices, PO read
-- CREDIT MANAGER: Full credit control
-- CS AGENT: Tickets, read orders/customers/invoices
-- CS MANAGER: Same + assign, escalate, reports
-- CUSTOMER and SUPPLIER: NOT in role_permissions (RLS-only access)
```

**NOTE:** The seed data uses permission strings like `'quote_requests.read'` and `'orders.read_own'` which differ from the `app_permission` enum values (e.g., `'quotes.create'`). During implementation, align the seed data permission strings to match the enum exactly, or update the enum to include all seed values.

### RLS Convention
All policies use `(SELECT auth.uid())` (subquery form) to avoid per-row re-evaluation. Financial tables additionally gate on MFA: `(auth.jwt()->>'aal') = 'aal2'`.

### Known Discrepancies

**1. `credit_status` enum vs `customers` table default:**
The `credit_status` enum defines `'not_evaluated'` as its first value, but the `customers` table uses `DEFAULT 'pending_review'` -- which is NOT a valid enum value. The enum has `'under_review'` but not `'pending_review'`. Resolution: either add `'pending_review'` to the enum, or change the customers table default to `'not_evaluated'`.

**2. `user_profiles` table may need a `pool` column:**
The `custom_access_token_hook` function references `p.pool` from `user_profiles` (`SELECT p.pool ... FROM public.user_profiles p`), but the `user_profiles` CREATE TABLE statement does NOT include a `pool` column. The hook needs this column to inject the pool claim into JWT. Resolution: add `pool TEXT NOT NULL DEFAULT 'external' CHECK (pool IN ('internal', 'external'))` to `user_profiles`.

## Non-Negotiable Rules
1. **Bun, NOT npm/yarn/pnpm.** Use `bun add`, `bun run`, `bun install`.
2. **`(SELECT auth.uid())` in ALL RLS policies.** Never `auth.uid()` directly (99.99% performance improvement).
3. **Currency default is EGP, timezone default is Africa/Cairo.**
4. **customer_tier uses:** tier_1_new, tier_2_verified, tier_3_established, tier_4_preferred, tier_5_suspended.

## Known Risks & Gotchas

### CRITICAL: `app_role` enum vs seed data mismatch
The seed data references roles not in the enum: `ceo`, `sales_director`, `bdr`, `quoting_specialist`, `procurement_officer`, `warehouse_worker`, `quality_inspector`, `dispatcher`, `accountant`, `ar_clerk`, `ap_clerk`, `credit_manager`, `cs_agent`, `cs_manager`. Resolution: expand `app_role` enum to include all referenced roles BEFORE running seed migration.

### CRITICAL: `app_permission` enum naming mismatch
Seed data uses different permission names than the enum (e.g., `'quote_requests.read'` vs enum's `'quotes.read'`, `'payments.create'` vs enum's `'finance.record_payment'`). Resolution: audit ALL seed permission strings against the enum and align — either expand the enum or rewrite the seed. Do this BEFORE the seed migration.

### CRITICAL: RLS Policy Performance Death at 94 Tables
Every query on every RLS-enabled table executes policy checks per row. ALWAYS use `(SELECT auth.uid())` not `auth.uid()` directly. Index every column referenced in RLS policies: `user_id`, `tenant_id`, `created_by`, `assigned_to`. Run `EXPLAIN ANALYZE` on critical queries with RLS enabled.

### WARNING: Vector dimension decision needed before Phase 14
The 3 embedding tables use `vector(1536)` but Workers AI bge-m3 produces 1024-dim vectors. See Phase 30 context for resolution options. This affects tables: document_embeddings, product_embeddings, business_data_embeddings.

### WARNING: Deferred Foreign Keys
`user_profiles` references `customers`, `suppliers`, `drivers`, `employees` -- these tables may not exist yet in Phase 2. Use deferred FK constraints or create the references later in Phases 13-14.

## Tips
- All enums use CREATE TYPE IF NOT EXISTS pattern
- Use `supabase db push` or `supabase migration up` to apply
- Test auth functions by creating a test user and checking JWT claims
- Verify RLS by testing queries as different user types
