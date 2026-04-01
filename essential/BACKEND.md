# HyperQuote — Complete Backend Specification

**Created:** 2026-03-29
**Last updated:** 2026-03-30
**Database:** Supabase (PostgreSQL 15+)
**Edge Runtime:** Cloudflare Workers
**Currency:** EGP (Egyptian Pound)
**Timezone:** Africa/Cairo (EET, UTC+2)
**Source of truth:** `essential/RESEARCH.md` + `essential/FRONTEND.md` (state machines, business logic)

---

## 1. ARCHITECTURE OVERVIEW

### Infrastructure Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Database | Supabase PostgreSQL 15+ | Tables, RLS, triggers, pg_cron, pgvector, supa_audit |
| Auth | Supabase Auth + `@supabase/ssr` 0.9.0 | Dual pool (external/internal), JWT, OTP, MFA |
| Realtime | Supabase Realtime | postgres_changes, broadcast (GPS), presence |
| Edge Functions | Cloudflare Workers | Server functions, API layer, PDF generation |
| Connection Pool | Cloudflare Hyperdrive | Cached (60s) and uncached configs |
| KV Store | Cloudflare KV | JWKS, sessions, config, exchange rates, prayer times |
| Object Storage | Cloudflare R2 | PDFs, photos, catalogs, delivery proofs |
| Job Queue | Cloudflare Queues | Notifications, sync, catalog parsing |
| Cron | pg_cron (DB) + Cloudflare Cron Triggers (Workers) | Scheduled tasks |
| AI Gateway | Cloudflare AI Gateway | Route to Claude/Groq/GLM, caching, logging |
| Offline Sync | PowerSync (Driver app only) | SQLite <-> Supabase bi-directional |

### Dual Hyperdrive Pattern

| Config | Setting | Use Case |
|--------|---------|----------|
| Cached | max_age=60, swr=15 | Product catalog, reference data, supplier profiles |
| Uncached | caching-disabled=true | Orders, payments, financial queries, mutations |

### Dual Auth Pool

| Pool | Users | Creation | Apps | Cookie |
|------|-------|----------|------|--------|
| `external` | Customers, Suppliers, External Drivers | Self-signup + OTP | Website, Portal, Driver App | `hq-external-session` |
| `internal` | Employees, Internal Drivers, CEO | Admin-created only | Internal Platform, CEO App | `hq-internal-session` |

Cross-pool access is **impossible** — enforced at JWT, RLS, and cookie levels.

### JWT Claims (via Custom Access Token Hook)

```json
// External customer
{ "pool": "external", "user_type": "customer", "tenant_id": "...", "customer_id": "..." }
// Internal employee
{ "pool": "internal", "user_type": "employee", "tenant_id": "...", "roles": ["sales_rep"] }
// External driver
{ "pool": "external", "user_type": "driver", "tenant_id": "...", "driver_id": "...", "driver_status": "active" }
```

### File Storage (Cloudflare R2)

| Bucket Path | Contents |
|-------------|----------|
| `/{tenant_id}/invoices/{year}/{month}/` | Invoice PDFs, credit notes |
| `/{tenant_id}/quotes/{year}/{month}/` | Quote PDFs, proforma invoices |
| `/{tenant_id}/delivery-notes/` | Branded delivery notes, BOLs |
| `/{tenant_id}/pod/{delivery_id}/` | Delivery photos, signature PNGs |
| `/{tenant_id}/catalogs/` | Supplier catalog uploads |
| `/{tenant_id}/attachments/` | Customer drawings, specs, cheque photos, LC docs |
| `/{tenant_id}/reports/` | Board reports, recurring reports |
| `/{tenant_id}/hr-documents/` | Employee documents, compliance certs |
| `/{tenant_id}/receipts/` | Payment receipts, withholding certificates |

---

## 2. ENUMS

### Auth & System

```sql
CREATE TYPE app_role AS ENUM (
  'super_admin',
  'admin',
  'operations_manager',
  'sales_manager',
  'sales_rep',
  'procurement_manager',
  'procurement_agent',
  'warehouse_manager',
  'warehouse_staff',
  'logistics_manager',
  'logistics_coordinator',
  'driver',
  'finance_manager',
  'finance_accountant',
  'finance_clerk',
  'hr_manager',
  'hr_staff',
  'support_manager',
  'support_agent',
  'customer_admin',
  'customer_user',
  'supplier_contact'
);

CREATE TYPE app_permission AS ENUM (
  -- quotes (8)
  'quotes.create', 'quotes.read', 'quotes.update', 'quotes.delete',
  'quotes.approve', 'quotes.send', 'quotes.negotiate', 'quotes.override_price',
  -- orders (6)
  'orders.create', 'orders.read', 'orders.update',
  'orders.cancel', 'orders.approve', 'orders.override_status',
  -- customers (5)
  'customers.create', 'customers.read', 'customers.update',
  'customers.delete', 'customers.manage_credit',
  -- suppliers (5)
  'suppliers.create', 'suppliers.read', 'suppliers.update',
  'suppliers.delete', 'suppliers.manage_terms',
  -- products (5)
  'products.create', 'products.read', 'products.update',
  'products.delete', 'products.manage_pricing',
  -- inventory (6)
  'inventory.read', 'inventory.adjust', 'inventory.transfer',
  'inventory.receive', 'inventory.inspect', 'inventory.write_off',
  -- procurement (5)
  'procurement.create_po', 'procurement.read_po', 'procurement.approve_po',
  'procurement.receive_po', 'procurement.cancel_po',
  -- deliveries (5)
  'deliveries.create', 'deliveries.read', 'deliveries.update',
  'deliveries.assign_driver', 'deliveries.confirm',
  -- finance (7)
  'finance.create_invoice', 'finance.read_invoice', 'finance.void_invoice',
  'finance.record_payment', 'finance.manage_credit',
  'finance.approve_credit_note', 'finance.view_reports',
  -- hr (5)
  'hr.read_employees', 'hr.manage_employees', 'hr.manage_payroll',
  'hr.manage_attendance', 'hr.manage_leave',
  -- support (4)
  'support.create_ticket', 'support.read_ticket',
  'support.assign_ticket', 'support.resolve_ticket',
  -- admin (5)
  'admin.manage_users', 'admin.manage_roles', 'admin.manage_settings',
  'admin.view_audit_log', 'admin.manage_integrations',
  -- reports (4)
  'reports.view_sales', 'reports.view_operations',
  'reports.view_finance', 'reports.export',
  -- ai (3)
  'ai.use_assistant', 'ai.manage_models', 'ai.view_analytics',
  -- notifications (2)
  'notifications.manage', 'notifications.broadcast',
  -- approvals (1)
  'approvals.override'
);

CREATE TYPE user_type AS ENUM (
  'internal',
  'customer',
  'supplier',
  'driver'
);

CREATE TYPE audit_action AS ENUM (
  'create', 'read', 'update', 'delete',
  'login', 'logout', 'approve', 'reject',
  'export', 'import', 'escalate'
);

CREATE TYPE approval_status AS ENUM (
  'pending', 'approved', 'rejected', 'escalated', 'expired'
);

CREATE TYPE approval_type AS ENUM (
  'quote_discount', 'quote_override', 'order_cancellation',
  'credit_extension', 'credit_note', 'purchase_order',
  'price_adjustment', 'write_off', 'refund'
);

CREATE TYPE notification_channel AS ENUM (
  'in_app', 'email', 'sms', 'whatsapp', 'push'
);

CREATE TYPE notification_priority AS ENUM (
  'low', 'normal', 'high', 'urgent'
);

CREATE TYPE urgency AS ENUM (
  'standard', 'rush', 'emergency'
);

CREATE TYPE inventory_costing_method AS ENUM (
  'wac', 'fifo'
  -- LIFO intentionally excluded — prohibited under Egyptian Accounting Standards (EAS/IFRS)
);
```

### Customer & Contact

```sql
CREATE TYPE customer_tier AS ENUM (
  'tier_1_new', 'tier_2_verified', 'tier_3_established',
  'tier_4_preferred', 'tier_5_suspended'
);

CREATE TYPE address_type AS ENUM (
  'billing', 'shipping', 'site', 'warehouse', 'office', 'other'
);

CREATE TYPE contact_type AS ENUM (
  'primary', 'billing', 'shipping', 'technical',
  'procurement', 'executive', 'site_engineer'
);

CREATE TYPE credit_status AS ENUM (
  'not_evaluated', 'under_review', 'approved', 'conditional',
  'suspended', 'revoked', 'expired'
);
```

### Product & Inventory

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

CREATE TYPE inventory_status AS ENUM (
  'available', 'reserved', 'quarantine', 'damaged', 'in_transit',
  'pending_inspection', 'returned', 'committed', 'write_off'
);

CREATE TYPE stock_movement_type AS ENUM (
  'receipt', 'issue', 'transfer_in', 'transfer_out',
  'adjustment_up', 'adjustment_down', 'return_in', 'return_out',
  'write_off', 'cycle_count', 'reservation'
);

CREATE TYPE inspection_result AS ENUM (
  'pass', 'fail', 'conditional', 'pending'
);

CREATE TYPE stock_confidence AS ENUM (
  'fresh', 'aging', 'stale'
);

CREATE TYPE reservation_type AS ENUM (
  'soft', 'hard'
);

CREATE TYPE reservation_status AS ENUM (
  'active', 'expired', 'converted'
);
```

### Quote & Order

```sql
CREATE TYPE quote_request_status AS ENUM (
  'draft',            -- customer assembling material list
  'submitted',        -- material list finalized, awaiting review
  'under_review',     -- sales reviewing for completeness
  'sourcing',         -- procurement requesting supplier prices
  'quote_ready',      -- all prices received, quote can be assembled
  'on_hold',          -- paused (awaiting clarification or supplier)
  'rejected',         -- cannot fulfill (outside area, unavailable)
  'withdrawn',        -- customer pulled back before quoting
  'cancelled'         -- system/admin cancelled (timeout, duplicate)
);

CREATE TYPE quote_status AS ENUM (
  'draft', 'internal_review', 'pending_approval', 'approved',
  'sent', 'viewed', 'negotiating', 'revised', 'accepted',
  'declined', 'expired', 'cancelled', 'requires_re_quote'
);

CREATE TYPE order_status AS ENUM (
  'confirmed',              -- created from accepted quote, credit OK
  'processing',             -- supplier POs placed, sourcing
  'partially_fulfilled',    -- some deliveries completed
  'fulfilled',              -- all items delivered
  'completed',              -- all delivered + invoiced + paid
  'on_hold',                -- credit limit, customer request, supplier issue
  'cancellation_requested', -- cancel initiated, review if POs in progress
  'back_ordered',           -- items unavailable, supplier stockout
  'cancelled'               -- fully or partially cancelled
);
```

### Procurement

```sql
CREATE TYPE supplier_po_status AS ENUM (
  'draft', 'sent', 'confirmed', 'in_production', 'shipped',
  'partially_received', 'received', 'inspected', 'closed',
  'rejected', 'cancelled'
);

CREATE TYPE po_type AS ENUM (
  'stock', 'customer_linked'
);

CREATE TYPE fulfillment_source AS ENUM (
  'own_stock', 'supplier_drop', 'supplier_cross', 'inter_transfer'
);
```

### Delivery & Logistics

```sql
CREATE TYPE delivery_status AS ENUM (
  'scheduled',            -- date/time confirmed, driver assigned
  'picking_loading',      -- warehouse picking and loading
  'dispatched',           -- vehicle left warehouse
  'in_transit',           -- en route, GPS tracking active
  'at_site',              -- arrived at construction site
  'delivered',            -- all items unloaded, POD signed
  'partially_delivered',  -- some items delivered, others refused
  'failed',               -- could not complete (site inaccessible, breakdown)
  'rescheduled',          -- failed delivery reassigned to new date
  'returned',             -- customer rejected delivery at site
  'cancelled'             -- cancelled before dispatch
);

CREATE TYPE driver_type AS ENUM (
  'internal', 'contracted', 'on_demand'
);

CREATE TYPE vehicle_type AS ENUM (
  'pickup', 'flatbed', 'box_truck', 'tanker', 'dump_truck',
  'trailer', 'semi_trailer', 'crane_truck', 'concrete_mixer'
);

CREATE TYPE vehicle_status AS ENUM (
  'available', 'in_use', 'maintenance', 'out_of_service', 'reserved'
);

CREATE TYPE egyptian_license_class AS ENUM (
  'third_degree',   -- light vehicles (< 2 tons)
  'second_degree',  -- medium vehicles (2-7 tons)
  'first_degree'    -- heavy vehicles (> 7 tons) + trailers
);

CREATE TYPE delivery_failure_reason AS ENUM (
  'customer_refused', 'site_not_ready', 'access_blocked', 'wrong_address',
  'customer_absent', 'safety_concern', 'vehicle_breakdown', 'weather',
  'documentation_issue', 'damaged_in_transit'
);

CREATE TYPE shipping_method AS ENUM (
  'own_fleet', 'three_pl', 'supplier_direct', 'customer_pickup'
);

CREATE TYPE drop_ship_pod_status AS ENUM (
  'awaiting_supplier_pod',           -- delivery dispatched, waiting for supplier driver photo
  'awaiting_customer_confirmation',  -- supplier photo received, customer prompted to confirm
  'confirmed',                       -- customer confirmed delivery via portal or WhatsApp
  'disputed',                        -- customer disputes delivery (damage, shortage, wrong items)
  'auto_confirmed'                   -- 72h deadline passed with no dispute, system auto-confirmed
);
```

### Finance

```sql
CREATE TYPE invoice_status AS ENUM (
  'draft',            -- generated from delivery, under review
  'sent',             -- transmitted to customer, payment clock starts
  'viewed',           -- customer opened/viewed
  'partially_paid',   -- some payment received, balance remains
  'paid',             -- full payment received and matched
  'overdue',          -- payment not received by due date
  'collections',      -- escalated to formal collection (60+ days)
  'disputed',         -- customer contests the invoice
  'adjusted',         -- amount changed via credit note
  'cancelled',        -- voided (incorrect, duplicate)
  'written_off'       -- deemed uncollectible, bad debt
);

CREATE TYPE invoice_type AS ENUM (
  'standard', 'proforma', 'credit_note', 'debit_note',
  'advance', 'retention', 'final'
);

CREATE TYPE payment_status AS ENUM (
  'expected',          -- anticipated based on invoice terms
  'received',          -- bank confirms funds, not yet matched
  'matched',           -- linked to specific invoice(s)
  'fully_applied',     -- fully consumed against invoices
  'partially_applied', -- applied but doesn't cover full balance
  'overpayment',       -- exceeds invoice total
  'unmatched',         -- received but can't identify payer/reference
  'bounced',           -- cheque bounced or wire reversed
  'refunded'           -- overpayment returned to customer
);

CREATE TYPE payment_method AS ENUM (
  'wire_transfer', 'post_dated_cheque', 'certified_cheque',
  'cash', 'letter_of_credit', 'bank_guarantee'
);

CREATE TYPE payment_terms AS ENUM (
  'cod', 'cia', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90',
  'lc_at_sight', 'lc_30_days', 'lc_60_days', 'custom'
);

CREATE TYPE credit_note_status AS ENUM (
  'draft', 'pending_approval', 'approved',
  'applied', 'partially_applied', 'void'
);

CREATE TYPE cheque_status AS ENUM (
  'received', 'deposited', 'cleared',
  'bounced', 'replaced', 'written_off'
);

CREATE TYPE lc_status AS ENUM (
  'draft', 'issued', 'advised', 'confirmed', 'partially_drawn',
  'fully_drawn', 'expired', 'cancelled', 'amended'
);

CREATE TYPE return_status AS ENUM (
  'requested', 'under_review', 'approved', 'rejected',
  'pickup_scheduled', 'picked_up', 'inspecting',
  'restocked', 'credit_issued', 'closed'
);

CREATE TYPE dispute_reason AS ENUM (
  'incorrect_amount',
  'damaged_goods',
  'wrong_items',
  'missing_items',
  'duplicate_invoice',
  'pricing_disagreement',
  'other'
);

CREATE TYPE dispute_status AS ENUM (
  'open',
  'investigating',
  'awaiting_evidence',
  'resolved',
  'escalated'
);

CREATE TYPE dispute_resolution_type AS ENUM (
  'adjusted',
  'credit_note_issued',
  'invoice_maintained',
  'partially_adjusted'
);
```

### Support

```sql
CREATE TYPE ticket_status AS ENUM (
  'new', 'open', 'in_progress', 'awaiting_customer',
  'awaiting_internal', 'awaiting_supplier', 'escalated',
  'resolved', 'closed', 'reopened'
);

CREATE TYPE ticket_priority AS ENUM (
  'critical', 'high', 'medium', 'low', 'informational'
);

CREATE TYPE ticket_category AS ENUM (
  'order_issue', 'delivery_issue', 'quality_complaint',
  'billing_dispute', 'product_inquiry', 'return_request',
  'account_issue', 'technical_support', 'general'
);
```

### Documents

```sql
CREATE TYPE document_type AS ENUM (
  'commercial_register', 'tax_card', 'vat_certificate',
  'insurance_certificate', 'bank_letter', 'delivery_note',
  'weight_ticket', 'inspection_report', 'material_test_certificate',
  'photo', 'signed_contract', 'purchase_order', 'invoice',
  'packing_list', 'other'
);
```

---

## 3. TABLES

### 3.1 Auth & Tenancy

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

---

### 3.2 Customer

```sql
CREATE TABLE customers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  auth_user_id              UUID REFERENCES auth.users(id),          -- nullable for unclaimed customers
  customer_number           TEXT NOT NULL,
  company_name              TEXT NOT NULL,
  company_name_ar           TEXT,                                    -- Arabic company name
  legal_name                TEXT,
  trade_name                TEXT,
  tier                      customer_tier DEFAULT 'tier_1_new',
  status                    TEXT DEFAULT 'unclaimed',                -- 'unclaimed','claimed','active','suspended'
  phone                     TEXT,                                    -- indexed, primary contact phone
  tax_id                    TEXT,
  tax_registration_number   TEXT,                                    -- Egyptian 9-digit TRN
  commercial_register       TEXT,                                    -- Egyptian commercial register number
  industry                  TEXT,
  company_size              TEXT,
  annual_revenue_range      TEXT,
  credit_status             credit_status DEFAULT 'pending_review',
  credit_limit              DECIMAL(15,2) DEFAULT 0,
  credit_limit_currency     TEXT DEFAULT 'EGP',
  credit_terms              payment_terms DEFAULT 'cod',
  credit_approved_at        TIMESTAMPTZ,
  credit_approved_by        UUID REFERENCES auth.users(id),
  credit_review_date        DATE,
  payment_behavior_score    DECIMAL(5,2),                            -- algorithmic score
  composite_tier_score      DECIMAL(5,2),                            -- composite tier calculation
  assigned_sales_rep        UUID REFERENCES employees(id),
  assigned_account_manager  UUID REFERENCES employees(id),
  website                   TEXT,
  notes                     TEXT,
  tags                      TEXT[],
  is_active                 BOOLEAN DEFAULT TRUE,
  onboarded_at              TIMESTAMPTZ,
  claimed_at                TIMESTAMPTZ,                             -- when customer claimed portal account
  founded_date              DATE,
  employee_count_estimate   INTEGER,
  bounced_cheque_count      INTEGER DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, customer_number)
);

CREATE INDEX idx_customers_phone ON customers (phone);
```

```sql
CREATE TABLE customer_contacts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  customer_id               UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  contact_type              contact_type DEFAULT 'primary',
  first_name                TEXT NOT NULL,
  last_name                 TEXT NOT NULL,
  title                     TEXT,
  email                     TEXT,
  phone                     TEXT,
  mobile                    TEXT,
  is_primary                BOOLEAN DEFAULT FALSE,
  is_portal_user            BOOLEAN DEFAULT FALSE,
  user_id                   UUID REFERENCES auth.users(id),
  notes                     TEXT,
  is_active                 BOOLEAN DEFAULT TRUE,
  communication_preference  TEXT DEFAULT 'whatsapp',
  relationship_strength     TEXT,
  deal_role                 TEXT,
  reports_to                UUID REFERENCES customer_contacts(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE addresses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  addressable_type          TEXT NOT NULL,                           -- 'customer', 'supplier', 'project', 'warehouse'
  addressable_id            UUID NOT NULL,
  address_type              address_type DEFAULT 'shipping',
  label                     TEXT,
  line_1                    TEXT NOT NULL,
  line_2                    TEXT,
  city                      TEXT NOT NULL,
  state_province            TEXT,                                    -- governorate for Egypt
  postal_code               TEXT,
  country                   TEXT DEFAULT 'EG',
  latitude                  DECIMAL(10,7),
  longitude                 DECIMAL(10,7),
  site_access_notes         TEXT,
  unloading_equipment       TEXT,
  delivery_time_restriction TEXT,
  contact_name_on_site      TEXT,
  contact_phone_on_site     TEXT,
  is_default                BOOLEAN DEFAULT FALSE,
  is_active                 BOOLEAN DEFAULT TRUE,
  geofence_radius_m         INTEGER DEFAULT 200,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  customer_id         UUID NOT NULL REFERENCES customers(id),
  project_number      TEXT NOT NULL,
  name                TEXT NOT NULL,
  description         TEXT,
  address_id          UUID REFERENCES addresses(id),
  start_date          DATE,
  estimated_end_date  DATE,
  actual_end_date     DATE,
  project_budget      DECIMAL(15,2),
  total_quoted        DECIMAL(15,2) DEFAULT 0,
  total_ordered       DECIMAL(15,2) DEFAULT 0,
  total_delivered     DECIMAL(15,2) DEFAULT 0,
  total_invoiced      DECIMAL(15,2) DEFAULT 0,
  total_paid          DECIMAL(15,2) DEFAULT 0,
  status              TEXT DEFAULT 'active',
  assigned_sales_rep  UUID REFERENCES employees(id),
  notes               TEXT,
  tags                TEXT[],
  stage               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, project_number)
);
```

```sql
CREATE TABLE credit_applications (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  customer_id              UUID NOT NULL REFERENCES customers(id),
  requested_limit          DECIMAL(15,2) NOT NULL,
  requested_terms          payment_terms,
  years_in_business        INTEGER,
  annual_revenue           DECIMAL(15,2),
  bank_name                TEXT,
  bank_account_number_last4 TEXT,
  bank_contact             TEXT,
  trade_references         JSONB DEFAULT '[]',
  duns_number              TEXT,
  credit_score             INTEGER,
  credit_report_url        TEXT,
  credit_report_date       DATE,
  status                   credit_status DEFAULT 'pending_review',
  approved_limit           DECIMAL(15,2),
  approved_terms           payment_terms,
  decision_notes           TEXT,
  reviewed_by              UUID REFERENCES auth.users(id),
  reviewed_at              TIMESTAMPTZ,
  financial_statements_url TEXT,
  application_form_url     TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE customer_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  customer_id           UUID NOT NULL REFERENCES customers(id),
  delivery_id           UUID REFERENCES deliveries(id),
  order_id              UUID REFERENCES orders(id),
  nps_score             INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),  -- 0-10
  csat_score            INTEGER CHECK (csat_score >= 1 AND csat_score <= 5), -- 1-5
  feedback_text         TEXT,
  survey_sent_at        TIMESTAMPTZ,
  survey_responded_at   TIMESTAMPTZ,
  channel               notification_channel,              -- sms, email, whatsapp, push, in_app
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.3 Supplier

```sql
CREATE TABLE suppliers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  supplier_number          TEXT NOT NULL,
  company_name             TEXT NOT NULL,
  company_name_ar          TEXT,                                    -- Arabic company name
  legal_name               TEXT,
  tax_registration_number  TEXT,                                    -- Egyptian 9-digit TRN
  commercial_register      TEXT,                                    -- Egyptian commercial register number
  primary_contact_name     TEXT,
  primary_contact_email    TEXT,
  primary_contact_phone    TEXT,
  tax_id                   TEXT,
  website                  TEXT,
  product_categories       product_category[],                      -- array of product category enum
  default_payment_terms    payment_terms DEFAULT 'net_30',
  default_lead_time_days   INTEGER DEFAULT 7,
  minimum_order_value      DECIMAL(15,2),
  on_time_delivery_rate    DECIMAL(5,2),
  quality_score            DECIMAL(5,2),
  average_lead_time_days   DECIMAL(5,1),
  total_pos_count          INTEGER DEFAULT 0,
  total_pos_value          DECIMAL(15,2) DEFAULT 0,
  has_portal_access        BOOLEAN DEFAULT FALSE,
  portal_user_id           UUID REFERENCES auth.users(id),
  is_active                BOOLEAN DEFAULT TRUE,
  is_preferred             BOOLEAN DEFAULT FALSE,
  notes                    TEXT,
  tags                     TEXT[],
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_number)
);
```

```sql
CREATE TABLE supplier_contacts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  supplier_id    UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  contact_type   contact_type DEFAULT 'primary',
  first_name     TEXT NOT NULL,
  last_name      TEXT NOT NULL,
  title          TEXT,
  email          TEXT,
  phone          TEXT,
  is_primary     BOOLEAN DEFAULT FALSE,
  is_portal_user BOOLEAN DEFAULT FALSE,
  user_id        UUID REFERENCES auth.users(id),
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE supplier_price_lists (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  supplier_id    UUID NOT NULL REFERENCES suppliers(id),
  name           TEXT NOT NULL,
  effective_date DATE NOT NULL,
  expiry_date    DATE,
  currency       TEXT DEFAULT 'EGP',
  file_url       TEXT,
  status         TEXT DEFAULT 'active',
  notes          TEXT,
  uploaded_by    UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE supplier_agreements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  supplier_id               UUID NOT NULL REFERENCES suppliers(id),
  agreement_type            TEXT NOT NULL CHECK (agreement_type IN ('framework', 'exclusivity', 'volume_commitment')),
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  terms                     JSONB DEFAULT '{}'::jsonb,              -- flexible terms per agreement type
  volume_target             DECIMAL(15,2),                          -- committed volume (units or EGP)
  volume_actual             DECIMAL(15,2) DEFAULT 0,                -- actual volume to date
  price_escalation_clause   TEXT,
  exclusivity_categories    TEXT[],                                  -- product categories under exclusivity
  document_url              TEXT,                                    -- signed agreement PDF in R2
  status                    TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.4 Product

```sql
CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  sku                   TEXT NOT NULL,                              -- Internal SKU
  name                  TEXT NOT NULL,                              -- English product name
  name_ar               TEXT,                                       -- Arabic product name
  description           TEXT,
  category              product_category NOT NULL,
  subcategory           TEXT,
  brand                 TEXT,
  manufacturer          TEXT,
  model_number          TEXT,
  egs_code              TEXT,                                       -- Egyptian General Standard code
  gpc_code              TEXT,                                       -- GS1 Global Product Classification code
  specifications        JSONB DEFAULT '{}',                         -- Freeform specs (key-value pairs)
  unit_of_measure       unit_of_measure NOT NULL,
  secondary_uom         unit_of_measure,                            -- Alternate UOM for dual-unit items
  uom_conversion_factor DECIMAL(12,6),                              -- secondary = primary * factor
  weight_kg             DECIMAL(10,3),
  length_cm             DECIMAL(10,2),
  width_cm              DECIMAL(10,2),
  height_cm             DECIMAL(10,2),
  last_purchase_price   DECIMAL(12,4),                              -- Most recent purchase price (EGP)
  weighted_avg_cost     DECIMAL(12,4),                              -- Weighted average cost (EGP)
  is_stockable          BOOLEAN DEFAULT FALSE,                      -- Can be held in warehouse
  is_active             BOOLEAN DEFAULT TRUE,
  requires_inspection   BOOLEAN DEFAULT FALSE,                      -- Needs QC on receipt
  is_hazmat             BOOLEAN DEFAULT FALSE,                      -- Hazardous materials flag
  shelf_life_days       INTEGER,
  image_urls            TEXT[],
  search_vector         TSVECTOR,                                   -- Full-text search index
  tags                  TEXT[],
  is_non_cancellable    BOOLEAN DEFAULT FALSE,
  is_wind_sensitive     BOOLEAN DEFAULT FALSE,                      -- delivery blocked when wind >30 km/h
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, sku)
);
```

```sql
CREATE TABLE product_suppliers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  product_id            UUID NOT NULL REFERENCES products(id),
  supplier_id           UUID NOT NULL REFERENCES suppliers(id),
  supplier_sku          TEXT,                                        -- Supplier's own SKU
  supplier_product_name TEXT,                                        -- Supplier's product name
  unit_cost             DECIMAL(12,4),                               -- Cost per unit (EGP)
  currency              TEXT DEFAULT 'EGP',
  price_list_id         UUID REFERENCES supplier_price_lists(id),
  minimum_order_qty     DECIMAL(12,3),
  price_breaks          JSONB DEFAULT '[]',                          -- Quantity-based price tiers
  lead_time_days        INTEGER DEFAULT 7,
  is_preferred          BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  last_quoted_at        TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, product_id, supplier_id)
);
```

```sql
CREATE TABLE pricing_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  customer_id      UUID REFERENCES customers(id),
  customer_tier    customer_tier,
  project_id       UUID REFERENCES projects(id),
  product_id       UUID REFERENCES products(id),
  product_category product_category,
  priority         INTEGER NOT NULL DEFAULT 100,                    -- Lower = higher priority
  rule_type        TEXT NOT NULL,                                    -- 'fixed_price', 'margin', 'discount', etc.
  fixed_price      DECIMAL(12,4),                                   -- Fixed unit price (EGP)
  margin_percent   DECIMAL(5,2),
  discount_percent DECIMAL(5,2),
  min_quantity     DECIMAL(12,3),
  max_quantity     DECIMAL(12,3),
  effective_date   DATE,
  expiry_date      DATE,
  is_active        BOOLEAN DEFAULT TRUE,
  approved_by      UUID REFERENCES auth.users(id),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE contract_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  contract_number TEXT,
  unit_price      DECIMAL(12,4) NOT NULL,                           -- Contracted price (EGP)
  currency        TEXT DEFAULT 'EGP',
  effective_date  DATE NOT NULL,
  expiry_date     DATE NOT NULL,
  min_quantity    DECIMAL(12,3),
  max_quantity    DECIMAL(12,3),
  approved_by     UUID REFERENCES auth.users(id),
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.5 Quote

```sql
CREATE TABLE quote_requests (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  request_number          TEXT NOT NULL,
  customer_id             UUID NOT NULL REFERENCES customers(id),
  project_id              UUID REFERENCES projects(id),
  delivery_address_id     UUID REFERENCES addresses(id),
  requested_delivery_date DATE,
  urgency                 urgency DEFAULT 'standard',
  sla_deadline            TIMESTAMPTZ,                              -- SLA-driven response deadline
  status                  quote_request_status DEFAULT 'draft',
  assigned_to             UUID REFERENCES employees(id),
  hold_reason             TEXT,
  rejection_reason        TEXT,
  source                  TEXT DEFAULT 'portal',                    -- 'portal', 'whatsapp', 'phone', 'email'
  notes                   TEXT,
  submitted_at            TIMESTAMPTZ,
  reviewed_at             TIMESTAMPTZ,
  priority_score          DECIMAL(5,2),
  estimated_value         DECIMAL(15,2),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, request_number)
);
```

```sql
CREATE TABLE quote_request_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id     UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  product_id           UUID REFERENCES products(id),
  customer_description TEXT NOT NULL,                                -- Customer's raw description
  specifications       TEXT,
  quantity             DECIMAL(12,3) NOT NULL,
  unit_of_measure      unit_of_measure,
  matched_product_name TEXT,                                         -- AI-matched product name
  match_confidence     DECIMAL(5,2),                                 -- AI match confidence 0-100
  is_available         BOOLEAN,                                      -- Market availability check
  notes                TEXT,
  sort_order           INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE quotes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  quote_number            TEXT NOT NULL,
  quote_request_id        UUID REFERENCES quote_requests(id),
  customer_id             UUID NOT NULL REFERENCES customers(id),
  project_id              UUID REFERENCES projects(id),
  version_number          INTEGER DEFAULT 1,
  previous_version_id     UUID REFERENCES quotes(id),               -- Self-ref for version chain
  status                  quote_status DEFAULT 'draft',
  subtotal                DECIMAL(15,2) DEFAULT 0,
  tax_amount              DECIMAL(15,2) DEFAULT 0,
  delivery_fee            DECIMAL(15,2) DEFAULT 0,
  discount_amount         DECIMAL(15,2) DEFAULT 0,
  total                   DECIMAL(15,2) DEFAULT 0,
  margin_percent          DECIMAL(5,2),
  margin_amount           DECIMAL(15,2),
  currency                TEXT DEFAULT 'EGP',
  payment_terms           payment_terms,
  delivery_address_id     UUID REFERENCES addresses(id),
  estimated_delivery_date DATE,
  eta_uuid                TEXT,                                      -- Linked ETA tracking reference
  validity_days           INTEGER DEFAULT 30,
  valid_until             DATE,
  requires_approval       BOOLEAN DEFAULT FALSE,
  approval_threshold      DECIMAL(15,2),                             -- Auto-approve below this amount
  approved_by             UUID REFERENCES auth.users(id),
  approved_at             TIMESTAMPTZ,
  customer_po_reference   TEXT,
  company_stamp_url       TEXT,                                      -- Company stamp image
  digital_signature_url   TEXT,                                      -- Digital signature image
  created_by              UUID REFERENCES auth.users(id),
  assigned_to             UUID REFERENCES employees(id),
  internal_notes          TEXT,
  customer_notes          TEXT,
  negotiation_notes       TEXT,
  sent_at                 TIMESTAMPTZ,
  viewed_at               TIMESTAMPTZ,
  accepted_at             TIMESTAMPTZ,
  declined_at             TIMESTAMPTZ,
  expired_at              TIMESTAMPTZ,
  decline_reason          TEXT,
  loss_reason             TEXT,
  competitor_name         TEXT,
  competitor_intelligence TEXT,
  win_probability         DECIMAL(5,2),
  delivery_method         TEXT,
  scheduled_send_at       TIMESTAMPTZ,
  customer_pickup         BOOLEAN DEFAULT FALSE,
  -- Multi-currency rate lock (FIX 4)
  source_currency         TEXT DEFAULT 'EGP',                        -- Currency the supplier quoted in (USD, EUR, SAR, EGP)
  exchange_rate           DECIMAL(18,8),                             -- Locked rate: 1 source_currency = X EGP. NULL when EGP.
  exchange_rate_locked_at TIMESTAMPTZ,                               -- Timestamp when the exchange rate was locked
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, quote_number)
);
```

```sql
CREATE TABLE quote_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id              UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  quote_request_item_id UUID REFERENCES quote_request_items(id),
  product_id            UUID NOT NULL REFERENCES products(id),
  product_name          TEXT NOT NULL,                                -- Snapshot at quote time
  product_sku           TEXT,
  description           TEXT,
  quantity              DECIMAL(12,3) NOT NULL,
  unit_of_measure       unit_of_measure NOT NULL,
  supplier_cost         DECIMAL(15,2),                               -- Supplier cost per unit (EGP)
  unit_price            DECIMAL(12,4) NOT NULL,                      -- Sell price per unit
  discount_percent      DECIMAL(5,2) DEFAULT 0,
  line_total            DECIMAL(15,2) NOT NULL,
  margin_percent        DECIMAL(5,2),                                -- Per-line margin %
  margin_amount         DECIMAL(15,2),                               -- Per-line margin amount
  freshness_indicator   stock_confidence,                            -- Supplier stock freshness: fresh/aging/stale
  pricing_rule_id       UUID REFERENCES pricing_rules(id),
  pricing_source        TEXT,                                        -- 'contract', 'rule', 'manual', 'ai_suggested'
  supplier_id           UUID REFERENCES suppliers(id),
  lead_time_days        INTEGER,
  is_accepted           BOOLEAN,                                     -- Customer accepted this line item
  sort_order            INTEGER DEFAULT 0,
  notes                 TEXT,
  customer_counter_price DECIMAL(15,4),
  line_status           TEXT DEFAULT 'pending',
  rejection_reason      TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.6 Order

```sql
CREATE TABLE orders (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id),
  order_number                TEXT NOT NULL,
  quote_id                    UUID REFERENCES quotes(id),
  customer_id                 UUID NOT NULL REFERENCES customers(id),
  project_id                  UUID REFERENCES projects(id),
  status                      order_status DEFAULT 'confirmed',
  customer_po_number          TEXT,
  subtotal                    DECIMAL(15,2) NOT NULL,
  tax_amount                  DECIMAL(15,2) DEFAULT 0,
  delivery_fee                DECIMAL(15,2) DEFAULT 0,
  discount_amount             DECIMAL(15,2) DEFAULT 0,
  total                       DECIMAL(15,2) NOT NULL,
  currency                    TEXT DEFAULT 'EGP',
  total_cost                  DECIMAL(15,2),                         -- Total supplier cost
  margin_amount               DECIMAL(15,2),
  margin_percent              DECIMAL(5,2),
  payment_terms               payment_terms,
  payment_instrument_type     payment_method,                        -- wire_transfer, check, letter_of_credit
  payment_instrument_reference TEXT,                                  -- Bank ref / LC number / check number
  payment_instrument_verified BOOLEAN DEFAULT FALSE,                 -- Verified by finance team
  delivery_address_id         UUID REFERENCES addresses(id),
  requested_delivery_date     DATE,
  total_items                 INTEGER DEFAULT 0,
  fulfilled_items             INTEGER DEFAULT 0,
  hold_reason                 TEXT,
  cancellation_reason         TEXT,
  cancellation_fee            DECIMAL(15,2),                         -- Fee charged on cancellation
  assigned_sales_rep          UUID REFERENCES employees(id),
  assigned_ops_coordinator    UUID REFERENCES employees(id),
  credit_check_passed         BOOLEAN,
  credit_check_at             TIMESTAMPTZ,
  internal_notes              TEXT,
  customer_notes              TEXT,
  confirmed_at                TIMESTAMPTZ,
  completed_at                TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  created_by                  UUID REFERENCES auth.users(id),
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, order_number)
);
```

```sql
CREATE TABLE order_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  quote_item_id        UUID REFERENCES quote_items(id),
  product_id           UUID NOT NULL REFERENCES products(id),
  product_name         TEXT NOT NULL,                                -- Snapshot at order time
  product_sku          TEXT,
  quantity             DECIMAL(12,3) NOT NULL,
  unit_of_measure      unit_of_measure NOT NULL,
  fulfilled_quantity   DECIMAL(12,3) DEFAULT 0,
  backordered_quantity DECIMAL(12,3) DEFAULT 0,
  cancelled_quantity   DECIMAL(12,3) DEFAULT 0,
  unit_price           DECIMAL(12,4) NOT NULL,
  supplier_cost        DECIMAL(12,4),
  line_total           DECIMAL(15,2) NOT NULL,
  supplier_id          UUID REFERENCES suppliers(id),
  supplier_po_id       UUID,                                         -- FK supplier_pos(id), deferred
  warehouse_id         UUID,                                         -- FK warehouses(id), deferred
  is_fulfilled         BOOLEAN DEFAULT FALSE,
  is_backordered       BOOLEAN DEFAULT FALSE,
  sort_order           INTEGER DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.7 Procurement

```sql
CREATE TABLE supplier_pos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  po_number                 TEXT NOT NULL,
  order_id                  UUID NOT NULL REFERENCES orders(id),
  supplier_id               UUID NOT NULL REFERENCES suppliers(id),
  status                    supplier_po_status DEFAULT 'draft',
  subtotal                  DECIMAL(15,2) NOT NULL,
  tax_amount                DECIMAL(15,2) DEFAULT 0,
  shipping_cost             DECIMAL(15,2) DEFAULT 0,
  total                     DECIMAL(15,2) NOT NULL,
  currency                  TEXT DEFAULT 'EGP',
  payment_terms             payment_terms,
  shipping_method           shipping_method,
  expected_ship_date        DATE,
  expected_delivery_date    DATE,
  actual_ship_date          DATE,
  actual_delivery_date      DATE,
  tracking_numbers          TEXT[],
  supplier_reference_number TEXT,                                     -- Supplier's own PO/ref number
  inspection_result         inspection_result,
  inspection_notes          TEXT,
  inspected_by              UUID REFERENCES auth.users(id),
  inspected_at              TIMESTAMPTZ,
  receiving_warehouse_id    UUID,                                     -- FK warehouses(id), deferred
  approved_by               UUID REFERENCES auth.users(id),
  approved_at               TIMESTAMPTZ,
  created_by                UUID REFERENCES auth.users(id),
  internal_notes            TEXT,
  supplier_notes            TEXT,
  sent_at                   TIMESTAMPTZ,
  confirmed_at              TIMESTAMPTZ,
  received_at               TIMESTAMPTZ,
  closed_at                 TIMESTAMPTZ,
  -- Multi-currency rate lock (FIX 4)
  source_currency           TEXT DEFAULT 'EGP',                      -- Currency of the supplier PO (USD, EUR, SAR, EGP)
  exchange_rate             DECIMAL(18,8),                           -- Locked rate: 1 source_currency = X EGP at PO creation
  exchange_rate_locked_at   TIMESTAMPTZ,                             -- Timestamp when the PO exchange rate was locked
  -- PO anonymization (FIX 5)
  coded_delivery_reference  TEXT,                                    -- Auto-generated coded reference (HQ-{year}-{seq}) shown on PO instead of real address
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, po_number)
);
```

```sql
CREATE TABLE supplier_po_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_po_id    UUID NOT NULL REFERENCES supplier_pos(id) ON DELETE CASCADE,
  order_item_id     UUID REFERENCES order_items(id),
  product_id        UUID NOT NULL REFERENCES products(id),
  product_name      TEXT NOT NULL,                                    -- Snapshot at PO time
  supplier_sku      TEXT,
  quantity          DECIMAL(12,3) NOT NULL,
  received_quantity DECIMAL(12,3) DEFAULT 0,
  rejected_quantity DECIMAL(12,3) DEFAULT 0,
  unit_of_measure   unit_of_measure NOT NULL,
  unit_cost         DECIMAL(12,4) NOT NULL,                          -- Cost per unit (EGP)
  line_total        DECIMAL(15,2) NOT NULL,
  sort_order        INTEGER DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE supplier_inquiries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  inquiry_number   TEXT NOT NULL,
  quote_request_id UUID REFERENCES quote_requests(id),
  supplier_id      UUID NOT NULL REFERENCES suppliers(id),
  status           TEXT DEFAULT 'sent',                              -- 'sent', 'responded', 'expired', 'cancelled'
  response_due_date DATE,
  responded_at     TIMESTAMPTZ,
  response_notes   TEXT,
  items            JSONB NOT NULL DEFAULT '[]',                      -- Items sent to supplier
  response_items   JSONB DEFAULT '[]',                               -- Supplier's response with prices
  sent_by          UUID REFERENCES auth.users(id),
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, inquiry_number)
);
```

---

### 3.8 Inventory

```sql
CREATE TABLE warehouses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  code             TEXT NOT NULL,                                    -- internal warehouse code
  name             TEXT NOT NULL,
  address_id       UUID REFERENCES addresses(id),
  total_area_sqm   DECIMAL(10,2),
  yard_area_sqm    DECIMAL(10,2),
  operating_hours  TEXT,                                             -- e.g. "08:00-17:00 Sat-Thu"
  manager_id       UUID REFERENCES employees(id),
  phone            TEXT,
  email            TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  is_primary       BOOLEAN DEFAULT FALSE,                           -- primary warehouse for tenant
  latitude         DECIMAL(10,7),
  longitude        DECIMAL(10,7),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);
```

```sql
CREATE TABLE warehouse_locations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  code           TEXT NOT NULL,                                      -- bin/rack/zone code
  name           TEXT,
  zone           TEXT,                                               -- logical zone grouping
  location_type  TEXT DEFAULT 'bin',                                  -- bin | rack | floor | yard
  max_weight_kg  DECIMAL(10,2),
  max_volume_cbm DECIMAL(10,3),                                      -- cubic metres
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (warehouse_id, code)
);
```

```sql
CREATE TABLE inventory (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  product_id         UUID NOT NULL REFERENCES products(id),
  warehouse_id       UUID NOT NULL REFERENCES warehouses(id),
  location_id        UUID REFERENCES warehouse_locations(id),
  quantity_on_hand   DECIMAL(12,3) DEFAULT 0,                        -- physical stock
  quantity_reserved  DECIMAL(12,3) DEFAULT 0,                        -- reserved for confirmed orders
  quantity_allocated DECIMAL(12,3) DEFAULT 0,                        -- allocated to deliveries
  quantity_available DECIMAL(12,3) GENERATED ALWAYS AS
                       (quantity_on_hand - quantity_reserved - quantity_allocated) STORED,
  quantity_incoming  DECIMAL(12,3) DEFAULT 0,                        -- expected from supplier POs
  atp                DECIMAL(12,3) GENERATED ALWAYS AS
                       (quantity_on_hand - quantity_reserved - quantity_allocated + quantity_incoming) STORED,
                                                                     -- available-to-promise
  unit_cost          DECIMAL(12,4),                                   -- EGP per unit (weighted avg)
  total_value        DECIMAL(15,2),                                   -- EGP total value on hand
  reorder_point      DECIMAL(12,3),                                   -- trigger replenishment below this
  reorder_quantity   DECIMAL(12,3),
  safety_stock       DECIMAL(12,3),                                   -- minimum buffer stock
  lot_number         TEXT,
  batch_number       TEXT,
  expiry_date        DATE,
  last_received_at   TIMESTAMPTZ,
  last_shipped_at    TIMESTAMPTZ,
  last_counted_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, product_id, warehouse_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'), COALESCE(lot_number, ''))
);
```

```sql
CREATE TABLE stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  inventory_id   UUID NOT NULL REFERENCES inventory(id),
  product_id     UUID NOT NULL REFERENCES products(id),
  warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  movement_type  stock_movement_type NOT NULL,
  quantity       DECIMAL(12,3) NOT NULL,                             -- signed qty (+receive, -ship)
  reference_type TEXT,                                                -- 'order', 'transfer', 'cycle_count', etc.
  reference_id   UUID,                                                -- FK to the source document
  unit_cost      DECIMAL(12,4),                                       -- EGP per unit at time of movement
  total_cost     DECIMAL(15,2),                                       -- EGP total
  reason         TEXT,
  notes          TEXT,
  performed_by   UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_receipt_has_cost CHECK (
    CASE WHEN movement_type IN ('receipt')
      THEN unit_cost IS NOT NULL AND unit_cost > 0
      ELSE TRUE
    END
  )
);
```

```sql
CREATE TABLE inventory_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  transfer_number   TEXT NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  status            TEXT DEFAULT 'draft',                            -- draft | in_transit | received | cancelled
  items             JSONB NOT NULL DEFAULT '[]',                     -- [{product_id, qty, lot_number}]
  shipped_at        TIMESTAMPTZ,
  received_at       TIMESTAMPTZ,
  created_by        UUID REFERENCES auth.users(id),
  received_by       UUID REFERENCES auth.users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, transfer_number)
);
```

```sql
CREATE TABLE cycle_counts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  warehouse_id        UUID NOT NULL REFERENCES warehouses(id),
  count_number        TEXT NOT NULL,
  status              TEXT DEFAULT 'planned',                        -- planned | in_progress | completed | cancelled
  count_date          DATE NOT NULL,
  items               JSONB NOT NULL DEFAULT '[]',                   -- [{product_id, location_id, system_qty, counted_qty, variance}]
  assigned_to         UUID REFERENCES auth.users(id),
  completed_by        UUID REFERENCES auth.users(id),
  completed_at        TIMESTAMPTZ,
  adjustments_applied BOOLEAN DEFAULT FALSE,
  approved_by         UUID REFERENCES auth.users(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, count_number)
);
```

```sql
CREATE TABLE source_inventory (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  supplier_id        UUID NOT NULL REFERENCES suppliers(id),
  product_id         UUID NOT NULL REFERENCES products(id),
  reported_quantity  DECIMAL(15,4) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,               -- reported minus active reservations
  reserved_quantity  DECIMAL(15,4) NOT NULL DEFAULT 0,
  unit_cost          DECIMAL(15,4),
  currency           TEXT DEFAULT 'EGP',
  lead_time_days     INTEGER,
  min_order_quantity DECIMAL(15,4),
  last_updated_at    TIMESTAMPTZ DEFAULT NOW(),
  confidence         stock_confidence,                               -- computed from staleness
  is_suppressed      BOOLEAN DEFAULT FALSE,                          -- true if >7 days stale
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_id, product_id)
);
```

```sql
CREATE TABLE inventory_reservations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  source_inventory_id UUID REFERENCES source_inventory(id),          -- for supplier stock
  inventory_id        UUID REFERENCES inventory(id),                 -- for own warehouse stock
  product_id          UUID NOT NULL REFERENCES products(id),
  quote_id            UUID REFERENCES quotes(id),
  order_id            UUID REFERENCES orders(id),
  quantity            DECIMAL(15,4) NOT NULL,
  reservation_type    reservation_type NOT NULL,                     -- soft | hard
  status              reservation_status NOT NULL DEFAULT 'active',  -- active | expired | converted
  expires_at          TIMESTAMPTZ,                                   -- auto-expire for soft holds
  converted_at        TIMESTAMPTZ,                                   -- when soft -> hard on order confirm
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.9 Delivery

```sql
CREATE TABLE vehicles (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  vehicle_number       TEXT NOT NULL,                                -- internal fleet number
  vehicle_type         vehicle_type NOT NULL,
  make                 TEXT,
  model                TEXT,
  year                 INTEGER,
  license_plate        TEXT,                                         -- Egyptian plate number
  vin                  TEXT,                                          -- chassis / VIN number
  max_payload_kg       DECIMAL(10,2),
  capacity_weight_kg   DECIMAL(10,2),                                -- rated capacity
  gvwr_kg              DECIMAL(10,2),                                -- gross vehicle weight rating (kg)
  requires_license     egyptian_license_class,                       -- required Egyptian license class
  has_boom             BOOLEAN DEFAULT FALSE,
  has_moffett          BOOLEAN DEFAULT FALSE,
  has_liftgate         BOOLEAN DEFAULT FALSE,
  has_crane            BOOLEAN DEFAULT FALSE,
  equipment_type       TEXT[],                                       -- additional equipment tags
  status               vehicle_status DEFAULT 'available',
  maintenance_status   vehicle_status,                               -- separate maintenance tracking
  current_warehouse_id UUID REFERENCES warehouses(id),
  odometer_reading     DECIMAL(10,1),                                -- km
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  next_inspection_date  DATE,
  insurance_expiry     DATE,
  registration_expiry  DATE,
  ownership_type       TEXT DEFAULT 'owned',                         -- owned | leased | rented
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, vehicle_number)
);
```

```sql
CREATE TABLE drivers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  driver_number            TEXT NOT NULL,                            -- internal driver code
  user_id                  UUID REFERENCES auth.users(id),           -- linked portal login
  driver_type              driver_type NOT NULL,                     -- internal | contracted | on_demand
  status                   TEXT DEFAULT 'pending',                   -- pending | active | suspended | terminated
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  email                    TEXT,
  phone                    TEXT NOT NULL,
  -- Egyptian driving license
  license_class            egyptian_license_class,                   -- third_degree | second_degree | first_degree
  license_number           TEXT,
  license_governorate      TEXT,                                     -- issuing governorate
  license_expiry           DATE,
  endorsements             TEXT[],                                   -- hazmat, oversized, etc.
  -- Certifications
  moffett_certified        BOOLEAN DEFAULT FALSE,
  crane_certified          BOOLEAN DEFAULT FALSE,
  forklift_certified       BOOLEAN DEFAULT FALSE,
  safety_training_date     DATE,
  -- Employment
  hire_date                DATE,
  company_name             TEXT,                                     -- for contractors / third-party
  insurance_policy_number  TEXT,
  insurance_expiry         DATE,
  -- Assignment
  home_warehouse_id        UUID REFERENCES warehouses(id),
  assigned_vehicle_id      UUID REFERENCES vehicles(id),
  -- Performance
  is_active                BOOLEAN DEFAULT TRUE,
  is_available             BOOLEAN DEFAULT TRUE,
  completed_deliveries     INTEGER DEFAULT 0,
  on_time_rate             DECIMAL(5,2),                             -- percentage 0-100
  average_rating           DECIMAL(3,2),                             -- 1.00 - 5.00
  gps_consent_accepted     BOOLEAN DEFAULT FALSE,
  gps_consent_accepted_at  TIMESTAMPTZ,
  pod_compliance_rate      DECIMAL(5,2),
  damage_rate              DECIMAL(5,2),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, driver_number)
);
```

```sql
CREATE TABLE delivery_routes (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES tenants(id),
  route_number                TEXT NOT NULL,
  route_date                  DATE NOT NULL,
  driver_id                   UUID REFERENCES drivers(id),
  vehicle_id                  UUID REFERENCES vehicles(id),
  start_warehouse_id          UUID REFERENCES warehouses(id),
  estimated_distance_km       DECIMAL(8,2),
  estimated_duration_minutes  INTEGER,
  actual_start_time           TIMESTAMPTZ,
  actual_end_time             TIMESTAMPTZ,
  status                      TEXT DEFAULT 'planned',                -- planned | dispatched | in_progress | completed | cancelled
  stop_sequence               UUID[],                                -- ordered array of delivery_stop IDs
  optimized                   BOOLEAN DEFAULT FALSE,
  optimization_score          DECIMAL(5,2),
  prayer_time_buffer_minutes  INTEGER DEFAULT 15,                    -- buffer around prayer times
  dispatched_by               UUID REFERENCES employees(id),
  dispatched_at               TIMESTAMPTZ,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, route_number)
);
```

```sql
CREATE TABLE deliveries (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  delivery_number           TEXT NOT NULL,
  order_id                  UUID NOT NULL REFERENCES orders(id),
  supplier_po_id            UUID REFERENCES supplier_pos(id),
  status                    delivery_status DEFAULT 'scheduled',
  route_id                  UUID REFERENCES delivery_routes(id),
  stop_sequence_number      INTEGER,
  driver_id                 UUID REFERENCES drivers(id),
  vehicle_id                UUID REFERENCES vehicles(id),
  pickup_warehouse_id       UUID REFERENCES warehouses(id),
  pickup_address_id         UUID REFERENCES addresses(id),
  delivery_address_id       UUID NOT NULL REFERENCES addresses(id),
  -- Scheduling
  scheduled_date            DATE NOT NULL,
  scheduled_time_start      TIME,
  scheduled_time_end        TIME,
  friday_jummah_blocked     BOOLEAN DEFAULT FALSE,                   -- block during Friday prayer window
  -- Actual timestamps
  actual_pickup_time        TIMESTAMPTZ,
  actual_departure_time     TIMESTAMPTZ,
  actual_arrival_time       TIMESTAMPTZ,
  actual_delivery_time      TIMESTAMPTZ,
  -- Carrier
  shipping_method           shipping_method DEFAULT 'own_fleet',
  third_party_carrier       TEXT,
  third_party_tracking      TEXT,
  -- Proof of delivery (legacy fields)
  pod_signature             TEXT,
  pod_signed_by             TEXT,
  pod_photos                TEXT[],                                   -- R2 URLs
  pod_notes                 TEXT,
  delivery_latitude         DECIMAL(10,7),
  delivery_longitude        DECIMAL(10,7),
  -- Failure / return
  failure_reason            delivery_failure_reason,
  failure_notes             TEXT,
  return_reason             TEXT,
  -- Weight & Cairo ban
  total_weight_kg           DECIMAL(10,2),
  cairo_truck_ban_applies   BOOLEAN,                                 -- computed from vehicle weight + delivery address
  -- Rescheduling chain
  rescheduled_from          UUID REFERENCES deliveries(id),
  rescheduled_to            UUID REFERENCES deliveries(id),
  -- Links
  invoice_id                UUID,                                     -- FK invoices(id), deferred
  branded_delivery_note_url TEXT,                                     -- R2 URL for drop-ship branded note
  created_by                UUID REFERENCES auth.users(id),
  placement_instructions    TEXT,
  ppe_required              TEXT[],
  -- Delivery note tracking (FIX 5)
  delivery_note_sent_at     TIMESTAMPTZ,                             -- when delivery note (with real address) was sent to supplier driver
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, delivery_number)
);
```

```sql
CREATE TABLE delivery_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id        UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  order_item_id      UUID REFERENCES order_items(id),
  product_id         UUID NOT NULL REFERENCES products(id),
  expected_quantity  DECIMAL(12,3) NOT NULL,
  delivered_quantity DECIMAL(12,3) DEFAULT 0,
  refused_quantity   DECIMAL(12,3) DEFAULT 0,
  damaged_quantity   DECIMAL(12,3) DEFAULT 0,
  status             TEXT DEFAULT 'pending',                         -- pending | delivered | partial | refused
  refusal_reason     TEXT,
  notes              TEXT,
  sort_order         INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE proof_of_delivery (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id                UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  tenant_id                  UUID NOT NULL REFERENCES tenants(id),
  -- Signer info
  signer_name                TEXT NOT NULL,                          -- who signed
  signer_role                TEXT,                                    -- e.g. "site foreman"
  signature_url              TEXT NOT NULL,                           -- R2 URL to signature image
  -- Photos & GPS
  photos                     TEXT[],                                  -- R2 URLs of delivery photos
  gps_lat                    DECIMAL(10,7) NOT NULL,
  gps_lng                    DECIMAL(10,7) NOT NULL,
  -- Condition
  condition_notes            TEXT,
  captured_at                TIMESTAMPTZ DEFAULT NOW(),
  -- Compliance (E-Signature Law 15/2004)
  signer_national_id         TEXT,                                    -- Egyptian National ID (optional, high-value)
  signer_phone               TEXT,
  signer_company             TEXT,
  signature_hash             TEXT NOT NULL,                           -- SHA-256 of signature image at capture
  document_hash              TEXT NOT NULL,                           -- SHA-256 of delivery note PDF at signing
  device_id                  TEXT,                                    -- Capacitor Device.getId()
  device_model               TEXT,
  ip_address                 INET,
  capture_method             TEXT NOT NULL DEFAULT 'touch_signature', -- 'touch_signature', 'stylus_signature', 'typed_name'
  gps_accuracy_meters        DECIMAL(6,1),
  gps_altitude               DECIMAL(8,2),
  photos_hashes              TEXT[],                                  -- SHA-256 of each photo at capture
  offline_captured           BOOLEAN DEFAULT FALSE,                   -- TRUE if captured during offline mode
  synced_at                  TIMESTAMPTZ,                             -- when offline capture was synced
  legal_disclaimer_accepted  BOOLEAN DEFAULT TRUE,
  delivery_note_pdf_url      TEXT,                                    -- R2 URL to the delivery note PDF signed
  tamper_check_status        TEXT DEFAULT 'valid',                    -- 'valid', 'hash_mismatch', 'under_review'
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE drop_ship_pod (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  delivery_id               UUID NOT NULL REFERENCES deliveries(id),
  supplier_id               UUID NOT NULL REFERENCES suppliers(id),
  order_id                  UUID NOT NULL REFERENCES orders(id),
  customer_id               UUID NOT NULL REFERENCES customers(id),

  -- Supplier submission (via WhatsApp)
  supplier_photo_urls       TEXT[],                                     -- R2 URLs (downloaded from WhatsApp media)
  supplier_submitted_at     TIMESTAMPTZ,
  supplier_phone            TEXT,                                       -- phone number that sent the photo
  supplier_whatsapp_msg_id  TEXT,                                       -- WhatsApp message ID for audit trail
  supplier_notes            TEXT,                                       -- extracted from WhatsApp message text

  -- Customer confirmation
  customer_confirmed        BOOLEAN DEFAULT FALSE,
  customer_confirmed_at     TIMESTAMPTZ,
  customer_confirmed_via    TEXT,                                       -- 'whatsapp' | 'portal'
  customer_confirmed_by     UUID REFERENCES auth.users(id),            -- portal user who confirmed

  -- Customer dispute
  customer_disputed         BOOLEAN DEFAULT FALSE,
  customer_disputed_at      TIMESTAMPTZ,
  customer_dispute_reason   TEXT,
  customer_dispute_photos   TEXT[],                                     -- R2 URLs of dispute evidence

  -- Auto-confirm
  auto_confirmed            BOOLEAN DEFAULT FALSE,
  auto_confirm_deadline     TIMESTAMPTZ,                               -- delivery dispatch time + 72h

  -- Invoice trigger
  invoice_triggered         BOOLEAN DEFAULT FALSE,
  invoice_triggered_at      TIMESTAMPTZ,
  invoice_id                UUID,                                       -- FK invoices(id), set after invoice created

  -- Status
  status                    drop_ship_pod_status DEFAULT 'awaiting_supplier_pod',

  -- Matching metadata
  matched_by                TEXT,                                       -- 'delivery_reference' | 'supplier_phone' | 'manual'
  matched_at                TIMESTAMPTZ,
  manually_matched_by       UUID REFERENCES auth.users(id),            -- if matched_by = 'manual'

  -- Audit
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (delivery_id)                                                  -- one POD record per delivery
);
```

```sql
-- Partitioned by recorded_at for efficient pruning
CREATE TABLE driver_locations (
  id              BIGINT GENERATED ALWAYS AS IDENTITY,
  tenant_id       UUID NOT NULL,
  driver_id       UUID NOT NULL,
  delivery_id     UUID,
  route_id        UUID,
  latitude        DECIMAL(10,7) NOT NULL,
  longitude       DECIMAL(10,7) NOT NULL,
  speed_kmh       DECIMAL(5,1),                                      -- km/h from device GPS
  heading         DECIMAL(5,1),                                      -- compass bearing 0-360
  accuracy_meters DECIMAL(6,1),
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (recorded_at, id)
) PARTITION BY RANGE (recorded_at);
```

```sql
CREATE TABLE vehicle_inspections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  driver_id            UUID NOT NULL REFERENCES drivers(id),
  vehicle_id           UUID NOT NULL REFERENCES vehicles(id),
  inspection_type      TEXT NOT NULL CHECK (inspection_type IN ('pre_trip', 'post_trip')),
  inspection_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  odometer_reading     DECIMAL(10,1),                                -- km at time of inspection
  items                JSONB NOT NULL DEFAULT '[]'::jsonb,           -- [{category, item, status: pass|fail|na, notes, photo_url}]
  overall_result       TEXT NOT NULL CHECK (overall_result IN ('pass', 'fail', 'conditional')),
  defects_found        BOOLEAN NOT NULL DEFAULT FALSE,
  driver_signature_url TEXT,                                          -- R2 URL
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE driver_shifts (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  driver_id                 UUID NOT NULL REFERENCES drivers(id),
  vehicle_id                UUID NOT NULL REFERENCES vehicles(id),
  shift_date                DATE NOT NULL,
  clock_in                  TIMESTAMPTZ,
  clock_out                 TIMESTAMPTZ,
  clock_in_lat              DECIMAL(10,7),
  clock_in_lng              DECIMAL(10,7),
  clock_out_lat             DECIMAL(10,7),
  clock_out_lng             DECIMAL(10,7),
  odometer_start            DECIMAL(10,1),                            -- km at shift start
  odometer_end              DECIMAL(10,1),                            -- km at shift end
  fuel_level_start          DECIMAL(5,2),                             -- percentage 0-100
  fuel_level_end            DECIMAL(5,2),
  status                    TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  pre_trip_inspection_id    UUID REFERENCES vehicle_inspections(id),
  post_trip_inspection_id   UUID REFERENCES vehicle_inspections(id),
  stops_completed           INTEGER DEFAULT 0,
  stops_failed              INTEGER DEFAULT 0,
  total_distance_km         DECIMAL(8,2),
  total_drive_time_minutes  INTEGER,
  on_time_count             INTEGER DEFAULT 0,
  exceptions_count          INTEGER DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE load_verifications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  delivery_route_id       UUID NOT NULL REFERENCES delivery_routes(id),
  vehicle_id              UUID NOT NULL REFERENCES vehicles(id),
  verified_by             UUID NOT NULL REFERENCES auth.users(id),
  scan_results            JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{item_id, scanned: bool, timestamp}]
  total_items_expected    INTEGER NOT NULL,
  total_items_scanned     INTEGER NOT NULL DEFAULT 0,
  weight_expected_kg      DECIMAL(10,2),
  weight_actual_kg        DECIMAL(10,2),
  weight_variance_percent DECIMAL(5,2),
  photos                  JSONB DEFAULT '[]'::jsonb,                 -- [{type: rear|side|seal|cargo, url}]
  driver_signature_url    TEXT,
  loader_signature_url    TEXT,
  gate_clearance          TEXT NOT NULL CHECK (gate_clearance IN ('approved', 'blocked', 'override')),
  override_by             UUID REFERENCES auth.users(id),
  override_reason         TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.10 Finance

```sql
CREATE TABLE invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  invoice_number          TEXT NOT NULL,
  invoice_type            invoice_type DEFAULT 'standard',
  order_id                UUID NOT NULL REFERENCES orders(id),
  delivery_id             UUID REFERENCES deliveries(id),           -- NULL for proforma invoices (FIX 2)
  quote_id                UUID REFERENCES quotes(id),               -- proforma traceability (FIX 2)
  customer_id             UUID NOT NULL REFERENCES customers(id),
  project_id              UUID REFERENCES projects(id),
  status                  invoice_status DEFAULT 'draft',
  subtotal                DECIMAL(15,2) NOT NULL,
  tax_amount              DECIMAL(15,2) DEFAULT 0,
  delivery_charges        DECIMAL(15,2) DEFAULT 0,
  discount_amount         DECIMAL(15,2) DEFAULT 0,
  adjustment_amount       DECIMAL(15,2) DEFAULT 0,
  total                   DECIMAL(15,2) NOT NULL,
  amount_paid             DECIMAL(15,2) DEFAULT 0,
  balance_due             DECIMAL(15,2) GENERATED ALWAYS AS (total - amount_paid - adjustment_amount) STORED,
  currency                TEXT DEFAULT 'EGP',
  payment_terms           payment_terms,
  due_date                DATE NOT NULL,
  tax_rate                DECIMAL(5,4),
  tax_jurisdiction        TEXT,
  tax_exemption_applied   BOOLEAN DEFAULT FALSE,
  -- ETA e-invoicing (Egyptian Tax Authority)
  eta_uuid                TEXT,                                      -- ETA document UUID
  eta_status              TEXT,                                      -- 'pending','submitted','valid','rejected','cancelled'
  eta_submission_date     TIMESTAMPTZ,
  digital_signature_url   TEXT,                                      -- PKI digital signature file
  company_stamp_url       TEXT,                                      -- company stamp image
  buyer_trn               TEXT,                                      -- buyer tax registration number (9 digits)
  seller_trn              TEXT,                                      -- seller tax registration number (9 digits)
  -- Dispute tracking
  dispute_reason          TEXT,
  dispute_resolution      TEXT,
  disputed_at             TIMESTAMPTZ,
  -- Collections
  reminder_count          INTEGER DEFAULT 0,
  last_reminder_date      DATE,
  collections_assigned_to UUID REFERENCES employees(id),
  credit_note_ids         UUID[],
  wire_instructions       JSONB,
  -- Lifecycle
  approved_by             UUID REFERENCES auth.users(id),
  approved_at             TIMESTAMPTZ,
  sent_at                 TIMESTAMPTZ,
  viewed_at               TIMESTAMPTZ,
  paid_at                 TIMESTAMPTZ,
  voided_at               TIMESTAMPTZ,
  written_off_at          TIMESTAMPTZ,
  created_by              UUID REFERENCES auth.users(id),
  -- Revenue recognition
  revenue_recognized      BOOLEAN DEFAULT FALSE,
  revenue_recognized_at   TIMESTAMPTZ,
  cogs_amount             DECIMAL(15,2),                             -- cost of goods sold
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, invoice_number)
);

COMMENT ON COLUMN invoices.delivery_id IS
  'Required for standard/final invoices (set by trg_delivery_confirmed). NULL for proforma invoices.';
```

```sql
CREATE TABLE invoice_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id       UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  order_item_id    UUID REFERENCES order_items(id),
  delivery_item_id UUID REFERENCES delivery_items(id),
  product_id       UUID NOT NULL REFERENCES products(id),
  description      TEXT NOT NULL,
  quantity         DECIMAL(12,3) NOT NULL,
  unit_of_measure  unit_of_measure NOT NULL,
  unit_price       DECIMAL(12,4) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount       DECIMAL(15,2) DEFAULT 0,
  line_total       DECIMAL(15,2) NOT NULL,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE invoice_disputes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  invoice_id        UUID NOT NULL REFERENCES invoices(id),
  raised_by         UUID NOT NULL REFERENCES auth.users(id),
  dispute_reason    dispute_reason NOT NULL,
  description       TEXT NOT NULL,
  evidence_urls     TEXT[] DEFAULT '{}',
  assigned_to       UUID REFERENCES employees(id),
  status            dispute_status DEFAULT 'open',
  resolution_type   dispute_resolution_type,
  resolution_notes  TEXT,
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES auth.users(id),
  sla_deadline      TIMESTAMPTZ NOT NULL,                     -- 48h from creation for investigation
  escalated_at      TIMESTAMPTZ,
  escalated_to      UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  payment_number        TEXT NOT NULL,
  customer_id           UUID NOT NULL REFERENCES customers(id),
  status                payment_status DEFAULT 'received',
  payment_method        payment_method NOT NULL,                     -- wire, cheque, lc, cash
  amount                DECIMAL(15,2) NOT NULL,
  currency              TEXT DEFAULT 'EGP',
  applied_amount        DECIMAL(15,2) DEFAULT 0,
  unapplied_amount      DECIMAL(15,2) GENERATED ALWAYS AS (amount - applied_amount) STORED,
  reference_number      TEXT,
  bank_reference        TEXT,
  bank_name             TEXT,
  received_date         DATE NOT NULL,
  cleared_date          DATE,
  value_date            DATE,
  lc_number             TEXT,
  lc_issuing_bank       TEXT,
  lc_expiry_date        DATE,
  remittance_advice_url TEXT,
  reconciled            BOOLEAN DEFAULT FALSE,
  reconciled_by         UUID REFERENCES auth.users(id),
  reconciled_at         TIMESTAMPTZ,
  bounced_at            TIMESTAMPTZ,
  bounce_reason         TEXT,
  reversed_at           TIMESTAMPTZ,
  reversal_reason       TEXT,
  notes                 TEXT,
  matched_by            UUID REFERENCES auth.users(id),
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, payment_number)
);
```

```sql
CREATE TABLE payment_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id  UUID NOT NULL REFERENCES payments(id),
  invoice_id  UUID NOT NULL REFERENCES invoices(id),
  amount      DECIMAL(15,2) NOT NULL,
  applied_at  TIMESTAMPTZ DEFAULT NOW(),
  applied_by  UUID REFERENCES auth.users(id),
  notes       TEXT,
  reversed    BOOLEAN DEFAULT FALSE,
  reversed_at TIMESTAMPTZ,
  reversed_by UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE cheque_tracking (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  payment_id            UUID NOT NULL REFERENCES payments(id),
  cheque_number         TEXT NOT NULL,
  bank_name             TEXT NOT NULL,
  branch_name           TEXT,
  amount                DECIMAL(15,2) NOT NULL,
  currency              TEXT DEFAULT 'EGP',
  issue_date            DATE NOT NULL,
  due_date              DATE NOT NULL,                               -- post-dated cheque maturity
  status                TEXT DEFAULT 'pending',                      -- pending, deposited, cleared, bounced, replaced
  deposited_at          TIMESTAMPTZ,
  cleared_at            TIMESTAMPTZ,
  bounced_at            TIMESTAMPTZ,
  bounce_count          INTEGER DEFAULT 0,
  bounce_reason         TEXT,
  replacement_cheque_id UUID REFERENCES cheque_tracking(id),         -- self-ref for replacement chain
  notes                 TEXT,
  created_by            UUID REFERENCES auth.users(id),
  payer_name            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, cheque_number, bank_name)
);
```

```sql
CREATE TABLE letters_of_credit (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  lc_number             TEXT NOT NULL UNIQUE,
  lc_type               TEXT NOT NULL,                               -- 'irrevocable','confirmed','transferable','standby'
  applicant_customer_id UUID NOT NULL REFERENCES customers(id),
  issuing_bank          TEXT NOT NULL,
  amount                DECIMAL(15,2) NOT NULL,
  currency              TEXT DEFAULT 'EGP',
  amount_drawn          DECIMAL(15,2) DEFAULT 0,
  amount_available      DECIMAL(15,2) GENERATED ALWAYS AS (amount - amount_drawn) STORED,
  issue_date            DATE NOT NULL,
  expiry_date           DATE NOT NULL,
  status                lc_status NOT NULL DEFAULT 'active',
  documents_required    JSONB DEFAULT '[]',                          -- list of required shipping/customs docs
  amendments            JSONB DEFAULT '[]',                          -- amendment history
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE credit_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  credit_note_number  TEXT NOT NULL,
  customer_id         UUID NOT NULL REFERENCES customers(id),
  return_id           UUID REFERENCES returns(id),                   -- deferred FK
  invoice_id          UUID REFERENCES invoices(id),
  original_invoice_id UUID REFERENCES invoices(id),                  -- required ref; amount <= original
  order_id            UUID REFERENCES orders(id),
  status              credit_note_status DEFAULT 'draft',
  amount              DECIMAL(15,2) NOT NULL,
  applied_amount      DECIMAL(15,2) DEFAULT 0,
  remaining_amount    DECIMAL(15,2) GENERATED ALWAYS AS (amount - applied_amount) STORED,
  currency            TEXT DEFAULT 'EGP',
  reason              TEXT NOT NULL,
  -- ETA e-invoicing
  eta_uuid            TEXT,
  -- Lifecycle
  approved_by         UUID REFERENCES auth.users(id),
  approved_at         TIMESTAMPTZ,
  issued_at           TIMESTAMPTZ,
  items               JSONB DEFAULT '[]',
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, credit_note_number)
);
```

```sql
CREATE TABLE credit_note_applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id),
  invoice_id     UUID NOT NULL REFERENCES invoices(id),
  amount         DECIMAL(15,2) NOT NULL,
  applied_at     TIMESTAMPTZ DEFAULT NOW(),
  applied_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE withholding_tax_certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  supplier_id        UUID NOT NULL REFERENCES suppliers(id),
  payment_id         UUID NOT NULL REFERENCES payments(id),
  gross_amount       DECIMAL(15,2) NOT NULL,
  withholding_rate   DECIMAL(5,2) NOT NULL,                         -- e.g. 1.00 for 1%
  withholding_amount DECIMAL(15,2) NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  quarter            TEXT NOT NULL,                                  -- 'Q1','Q2','Q3','Q4'
  year               INTEGER NOT NULL,
  pdf_url            TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE company_bank_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  bank_name            TEXT NOT NULL,
  bank_name_ar         TEXT,                                         -- Arabic bank name
  account_number_last4 TEXT,                                         -- masked for display
  iban                 TEXT,
  swift_code           TEXT,
  branch               TEXT,
  currency             TEXT DEFAULT 'EGP',
  is_active            BOOLEAN DEFAULT TRUE,
  is_default           BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE supplier_invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  invoice_number          TEXT NOT NULL,
  supplier_id             UUID NOT NULL REFERENCES suppliers(id),
  supplier_po_id          UUID REFERENCES supplier_pos(id),
  subtotal                DECIMAL(15,2) NOT NULL,
  tax_amount              DECIMAL(15,2) DEFAULT 0,
  shipping_amount         DECIMAL(15,2) DEFAULT 0,
  total                   DECIMAL(15,2) NOT NULL,
  currency                TEXT DEFAULT 'EGP',
  po_matched              BOOLEAN DEFAULT FALSE,
  receipt_matched         BOOLEAN DEFAULT FALSE,
  match_discrepancy_notes TEXT,
  status                  TEXT DEFAULT 'received',
  payment_terms           payment_terms,
  due_date                DATE,
  paid_amount             DECIMAL(15,2) DEFAULT 0,
  paid_at                 TIMESTAMPTZ,
  payment_reference       TEXT,
  approved_by             UUID REFERENCES auth.users(id),
  approved_at             TIMESTAMPTZ,
  received_date           DATE NOT NULL,
  notes                   TEXT,
  document_url            TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_id, invoice_number)
);
```

```sql
CREATE TABLE supplier_invoice_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id),
  po_line_item_id     UUID REFERENCES supplier_po_items(id),        -- nullable for non-PO invoices
  product_id          UUID NOT NULL REFERENCES products(id),
  description         TEXT,
  quantity            DECIMAL(15,4) NOT NULL,
  unit_price          DECIMAL(15,4) NOT NULL,
  line_total          DECIMAL(15,2) NOT NULL,
  po_quantity         DECIMAL(15,4),                                 -- from PO line
  po_unit_price       DECIMAL(15,4),                                 -- from PO line
  received_quantity   DECIMAL(15,4),                                 -- from GRN
  match_status        TEXT NOT NULL DEFAULT 'unmatched'
                        CHECK (match_status IN ('matched', 'variance_within_tolerance', 'variance_exceeds', 'unmatched')),
  variance_amount     DECIMAL(15,2),
  variance_percent    DECIMAL(5,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE ar_aging_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  snapshot_date     DATE NOT NULL,
  customer_id       UUID NOT NULL REFERENCES customers(id),
  current_amount    DECIMAL(15,2) DEFAULT 0,
  days_1_30         DECIMAL(15,2) DEFAULT 0,
  days_31_60        DECIMAL(15,2) DEFAULT 0,
  days_61_90        DECIMAL(15,2) DEFAULT 0,
  days_over_90      DECIMAL(15,2) DEFAULT 0,
  total_outstanding DECIMAL(15,2) DEFAULT 0,
  credit_limit      DECIMAL(15,2),
  credit_available  DECIMAL(15,2),
  dso_days          DECIMAL(5,1),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, snapshot_date, customer_id)
);
```

```sql
CREATE TABLE revenue_recognition_events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  invoice_id             UUID NOT NULL REFERENCES invoices(id),
  delivery_id            UUID NOT NULL REFERENCES deliveries(id),
  order_id               UUID NOT NULL REFERENCES orders(id),
  customer_id            UUID NOT NULL REFERENCES customers(id),
  -- EAS 48 five-step model
  recognition_date       DATE NOT NULL,                              -- date control transferred (delivery date)
  recognition_basis      TEXT NOT NULL DEFAULT 'point_in_time',
  performance_obligation TEXT NOT NULL DEFAULT 'goods_delivery',
  -- Revenue amounts
  gross_revenue          DECIMAL(15,2) NOT NULL,                     -- total invoiced (ex-VAT)
  cost_of_goods_sold     DECIMAL(15,2) NOT NULL,                     -- supplier cost (from PO)
  delivery_cost          DECIMAL(15,2) DEFAULT 0,
  gross_margin           DECIMAL(15,2) GENERATED ALWAYS AS (gross_revenue - cost_of_goods_sold - delivery_cost) STORED,
  margin_percent         DECIMAL(5,2) GENERATED ALWAYS AS (
                           CASE WHEN gross_revenue > 0
                             THEN ((gross_revenue - cost_of_goods_sold - delivery_cost) / gross_revenue * 100)
                             ELSE 0
                           END
                         ) STORED,
  vat_amount             DECIMAL(15,2) DEFAULT 0,                    -- 14% VAT (not revenue)
  currency               TEXT DEFAULT 'EGP',
  -- Principal vs Agent (EAS 48 B34-B38)
  is_principal           BOOLEAN NOT NULL DEFAULT TRUE,              -- HyperQuote is always principal
  principal_indicators   JSONB DEFAULT '{"controls_goods_before_transfer": true, "sets_price": true, "bears_credit_risk": true, "bears_inventory_risk": true}'::jsonb,
  -- Accounting period
  fiscal_year            INTEGER NOT NULL,
  fiscal_month           INTEGER NOT NULL,
  fiscal_quarter         INTEGER GENERATED ALWAYS AS (CEIL(fiscal_month / 3.0)::int) STORED,
  -- Reversals
  is_reversed            BOOLEAN DEFAULT FALSE,
  reversal_reason        TEXT,
  reversed_at            TIMESTAMPTZ,
  reversed_by            UUID REFERENCES auth.users(id),
  original_event_id      UUID REFERENCES revenue_recognition_events(id),
  -- QuickBooks sync (Phase 2)
  qb_journal_entry_id    TEXT,
  qb_synced_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, delivery_id)
);
```

```sql
CREATE TABLE returns (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  return_number          TEXT NOT NULL,
  order_id               UUID NOT NULL REFERENCES orders(id),
  delivery_id            UUID REFERENCES deliveries(id),
  customer_id            UUID NOT NULL REFERENCES customers(id),
  status                 return_status DEFAULT 'requested',
  reason_category        TEXT NOT NULL,
  reason_detail          TEXT,
  photo_urls             TEXT[],
  items                  JSONB NOT NULL DEFAULT '[]',
  pickup_delivery_id     UUID REFERENCES deliveries(id),
  pickup_scheduled_date  DATE,
  inspection_notes       TEXT,
  inspection_result      inspection_result,
  inspected_by           UUID REFERENCES auth.users(id),
  inspected_at           TIMESTAMPTZ,
  resolution_type        TEXT,
  credit_note_id         UUID REFERENCES credit_notes(id),
  replacement_order_id   UUID REFERENCES orders(id),
  assigned_to            UUID REFERENCES employees(id),
  approved_by            UUID REFERENCES auth.users(id),
  approved_at            TIMESTAMPTZ,
  denied_reason          TEXT,
  restocking_fee_percent DECIMAL(5,2) DEFAULT 0,
  restocking_fee_amount  DECIMAL(15,2) DEFAULT 0,
  requested_at           TIMESTAMPTZ DEFAULT NOW(),
  closed_at              TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, return_number)
);
```

---

### 3.11 Driver Marketplace

```sql
CREATE TABLE driver_jobs (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID NOT NULL REFERENCES tenants(id),
  delivery_id                UUID NOT NULL REFERENCES deliveries(id),
  status                     TEXT NOT NULL DEFAULT 'available'
                               CHECK (status IN ('available', 'offered', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),
  offered_to_driver_id       UUID REFERENCES drivers(id),            -- nullable until offered
  offered_at                 TIMESTAMPTZ,
  expires_at                 TIMESTAMPTZ,
  accepted_at                TIMESTAMPTZ,
  completed_at               TIMESTAMPTZ,
  payout_amount              DECIMAL(15,2),
  payout_currency            TEXT DEFAULT 'EGP',
  pickup_address             TEXT,
  delivery_address           TEXT,
  estimated_distance_km      DECIMAL(8,2),
  estimated_duration_minutes INTEGER,
  materials_summary          TEXT,                                    -- human-readable cargo description
  total_weight_kg            DECIMAL(10,2),
  requires_moffett           BOOLEAN DEFAULT FALSE,
  requires_boom              BOOLEAN DEFAULT FALSE,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE driver_earnings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  driver_id          UUID NOT NULL REFERENCES drivers(id),
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  total_jobs         INTEGER NOT NULL DEFAULT 0,
  total_earned       DECIMAL(15,2) NOT NULL DEFAULT 0,
  withholding_tax    DECIMAL(15,2) NOT NULL DEFAULT 0,               -- 5% services rate
  net_payable        DECIMAL(15,2) NOT NULL DEFAULT 0,               -- total_earned - withholding_tax
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  paid_at            TIMESTAMPTZ,
  bank_account_last4 TEXT,
  payment_reference  TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.12 Delivery Zones

```sql
CREATE TABLE delivery_zones (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  zone_name               TEXT NOT NULL,
  zone_name_ar            TEXT,
  min_distance_km         DECIMAL(8,2),
  max_distance_km         DECIMAL(8,2),
  base_price              DECIMAL(15,2),
  price_per_km            DECIMAL(8,2),
  free_delivery_threshold DECIMAL(15,2),                             -- order value above which delivery is free
  surcharge_moffett       DECIMAL(15,2),
  surcharge_boom          DECIMAL(15,2),
  surcharge_night         DECIMAL(15,2),
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.13 Support

```sql
CREATE TABLE tickets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  ticket_number          TEXT NOT NULL,
  requester_type         TEXT NOT NULL,                              -- 'customer','supplier','internal'
  requester_user_id      UUID REFERENCES auth.users(id),
  customer_id            UUID REFERENCES customers(id),
  supplier_id            UUID REFERENCES suppliers(id),
  category               ticket_category NOT NULL,
  subcategory            TEXT,
  subject                TEXT NOT NULL,
  description            TEXT,
  priority               ticket_priority DEFAULT 'normal',
  status                 ticket_status DEFAULT 'new',
  order_id               UUID REFERENCES orders(id),
  delivery_id            UUID REFERENCES deliveries(id),
  invoice_id             UUID REFERENCES invoices(id),
  quote_id               UUID REFERENCES quotes(id),
  assigned_to            UUID REFERENCES employees(id),
  assigned_team          TEXT,
  sla_first_response_due TIMESTAMPTZ,
  sla_resolution_due     TIMESTAMPTZ,
  first_response_at      TIMESTAMPTZ,
  resolved_at            TIMESTAMPTZ,
  sla_breached           BOOLEAN DEFAULT FALSE,
  escalated              BOOLEAN DEFAULT FALSE,
  escalated_to           UUID REFERENCES employees(id),
  escalated_at           TIMESTAMPTZ,
  escalation_reason      TEXT,
  resolution_notes       TEXT,
  resolution_type        TEXT,
  source                 TEXT DEFAULT 'portal',                      -- portal, whatsapp, phone, email
  tags                   TEXT[],
  closed_at              TIMESTAMPTZ,
  reopened_at            TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, ticket_number)
);
```

```sql
CREATE TABLE ticket_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES auth.users(id),
  author_type     TEXT NOT NULL,                                     -- 'staff','customer','supplier','system'
  author_name     TEXT,
  message         TEXT NOT NULL,
  attachment_urls TEXT[],
  is_internal     BOOLEAN DEFAULT FALSE,                             -- internal staff notes
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3.14 HR & Onboarding

```sql
CREATE TABLE onboarding_sequences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  name        TEXT NOT NULL,                                         -- 'customer_7day', 'supplier_onboarding'
  description TEXT,
  target_type TEXT NOT NULL,                                         -- 'customer', 'supplier', 'driver'
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);
```

```sql
CREATE TABLE onboarding_steps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id    UUID NOT NULL REFERENCES onboarding_sequences(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  step_number    INTEGER NOT NULL,
  name           TEXT NOT NULL,                                      -- 'welcome_message', 'video_tutorial', etc.
  delay_minutes  INTEGER NOT NULL DEFAULT 0,                         -- minutes after sequence start
  channel        TEXT NOT NULL,                                      -- 'whatsapp', 'email', 'whatsapp+email', 'phone_call', 'in_app'
  action_type    TEXT NOT NULL,                                      -- 'send_template', 'create_task', 'send_link', 'send_products'
  template_key   TEXT,                                               -- WhatsApp/email template identifier
  content_config JSONB,                                              -- channel-specific content
  assigned_role  app_role,                                           -- role responsible
  skip_if        JSONB,                                              -- conditions to skip
  is_active      BOOLEAN DEFAULT TRUE,
  sort_order     INTEGER NOT NULL,
  UNIQUE (sequence_id, step_number)
);
```

```sql
CREATE TABLE customer_onboarding_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  sequence_id     UUID NOT NULL REFERENCES onboarding_sequences(id),
  step_id         UUID NOT NULL REFERENCES onboarding_steps(id),
  status          TEXT NOT NULL DEFAULT 'pending',                   -- 'pending', 'scheduled', 'sent', 'completed', 'skipped', 'failed'
  scheduled_at    TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  skipped_at      TIMESTAMPTZ,
  skip_reason     TEXT,
  failure_reason  TEXT,
  assigned_to     UUID REFERENCES employees(id),
  notification_id UUID REFERENCES notifications(id),
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, customer_id, step_id)
);
```

```sql
CREATE TABLE governorates (
  id        SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code      TEXT UNIQUE NOT NULL,
  name_en   TEXT NOT NULL,
  name_ar   TEXT NOT NULL,
  region    TEXT NOT NULL,                                           -- 'lower_egypt', 'upper_egypt', 'cairo_giza', 'canal', 'frontier'
  is_active BOOLEAN DEFAULT TRUE
);
```

---

### 3.15 AI & Search

```sql
CREATE TABLE ai_conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  conversation_type TEXT NOT NULL,                                   -- 'product_search','order_help','analytics','general'
  title             TEXT,
  context_type      TEXT,                                            -- 'order','quote','invoice', etc.
  context_id        UUID,
  status            TEXT DEFAULT 'active',
  model_used        TEXT,
  total_tokens      INTEGER DEFAULT 0,
  total_messages    INTEGER DEFAULT 0,
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE ai_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL,                                     -- 'user','assistant','system','tool'
  content         TEXT NOT NULL,
  tool_calls      JSONB,
  tool_results    JSONB,
  tokens_used     INTEGER,
  model           TEXT,
  latency_ms      INTEGER,
  user_rating     INTEGER,                                           -- 1-5 thumbs
  user_feedback   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE ai_request_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  use_case        TEXT NOT NULL,                      -- 'portal_chat', 'ceo_analytics', 'intent_classification', 'ocr'
  provider        TEXT NOT NULL,                      -- 'claude-sonnet', 'groq-qwen3-32b', 'glm-4-flash', 'mistral-ocr', 'claude-vision'
  model           TEXT NOT NULL,                      -- exact model version string
  success         BOOLEAN NOT NULL,
  latency_ms      INTEGER NOT NULL,
  fallback_used   BOOLEAN DEFAULT FALSE,
  fallback_depth  INTEGER DEFAULT 0,                  -- 0 = primary, 1 = fallback_1, 2 = fallback_2
  error_message   TEXT,
  error_code      TEXT,                               -- 'timeout', 'rate_limit', '500', 'network'
  token_count     INTEGER,                            -- total tokens (input + output)
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  conversation_id UUID REFERENCES ai_conversations(id),
  user_id         UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE document_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  source_type TEXT NOT NULL,                                         -- 'spec_sheet','manual','policy','faq'
  source_id   TEXT,
  chunk_index INTEGER NOT NULL,
  chunk_text  TEXT NOT NULL,
  title       TEXT,
  category    TEXT,
  metadata    JSONB DEFAULT '{}',
  embedding   vector(1536) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE product_embeddings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  product_id           UUID NOT NULL REFERENCES products(id),
  combined_text        TEXT NOT NULL,
  embedding            vector(1536) NOT NULL,
  product_updated_at   TIMESTAMPTZ,
  embedding_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE business_data_embeddings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  data_type   TEXT NOT NULL,                                         -- 'sales_summary','supplier_perf','customer_analysis'
  data_id     UUID,
  content     TEXT NOT NULL,
  time_period TEXT,                                                  -- '2026-Q1', '2026-03', etc.
  metadata    JSONB DEFAULT '{}',
  embedding   vector(1536) NOT NULL,
  data_as_of  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE search_index (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type        TEXT NOT NULL,                                  -- 'order','product','customer','invoice', etc.
  entity_id          UUID NOT NULL,
  entity_tenant_id   UUID NOT NULL REFERENCES tenants(id),
  entity_customer_id UUID,                                           -- enables customer-portal RLS
  entity_supplier_id UUID,                                           -- enables supplier-portal RLS (FIX 10)
  search_vector      TSVECTOR NOT NULL,
  display_title      TEXT NOT NULL,
  display_subtitle   TEXT,
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX idx_search_index_vector ON search_index USING GIN (search_vector);
CREATE INDEX idx_search_index_tenant ON search_index (entity_tenant_id);
CREATE INDEX idx_search_index_supplier ON search_index (entity_supplier_id) WHERE entity_supplier_id IS NOT NULL;
```

---

### 3.16 System

```sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  channel    notification_channel DEFAULT 'in_app',
  priority   notification_priority DEFAULT 'normal',
  title      TEXT NOT NULL,
  body       TEXT,
  entity_type TEXT,                                                  -- 'order','invoice','quote', etc.
  entity_id  UUID,
  action_url TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  read_at    TIMESTAMPTZ,
  is_sent    BOOLEAN DEFAULT FALSE,
  sent_at    TIMESTAMPTZ,
  sent_via   JSONB,                                                  -- tracks which channels delivered
  metadata   JSONB DEFAULT '{}',
  -- Notification grouping (FIX 7)
  group_key  TEXT,                                                   -- Links notifications from same root cause. Format: {event_type}:{entity_id}
  is_summary BOOLEAN DEFAULT FALSE,                                  -- TRUE for the consolidated summary notification
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE notification_groups (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  group_key         TEXT NOT NULL,                              -- e.g., 'bounce:cheque_uuid', 'dispute:dispute_uuid'
  root_event_type   TEXT NOT NULL,                              -- e.g., 'cheque_bounced', 'delivery_failed', 'credit_limit_exceeded'
  root_entity_id    UUID,                                       -- the entity that caused the cascade
  summary_text      TEXT NOT NULL,                              -- human-readable summary
  summary_text_ar   TEXT,                                       -- Arabic summary
  notification_count INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, group_key)
);
```

```sql
CREATE TABLE documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  entity_type         TEXT NOT NULL,                                 -- 'order','invoice','quote','product', etc.
  entity_id           UUID NOT NULL,
  document_type       document_type NOT NULL,
  name                TEXT NOT NULL,
  file_url            TEXT NOT NULL,
  file_size_bytes     BIGINT,
  mime_type           TEXT,
  is_customer_visible BOOLEAN DEFAULT FALSE,
  is_supplier_visible BOOLEAN DEFAULT FALSE,
  uploaded_by         UUID REFERENCES auth.users(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE system_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  category    TEXT NOT NULL,
  key         TEXT NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, category, key)
);
```

```sql
CREATE TABLE sequence_counters (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  entity_type   TEXT NOT NULL,
  prefix        TEXT NOT NULL,
  current_value BIGINT DEFAULT 0,
  year          INTEGER,
  UNIQUE (tenant_id, entity_type, COALESCE(year, 0))
);
```

```sql
CREATE TABLE state_history (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID NOT NULL,
  from_state  TEXT,
  to_state    TEXT NOT NULL,
  changed_by  UUID REFERENCES auth.users(id),
  reason      TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  source        TEXT NOT NULL,                                       -- 'eta','shipping_provider','whatsapp'
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  status        TEXT DEFAULT 'received',                             -- received, processing, processed, failed
  processed_at  TIMESTAMPTZ,
  error_message TEXT,
  retry_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE weather_alerts (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  governorate            TEXT NOT NULL,                              -- 'cairo', 'giza', 'alexandria', etc.
  alert_date             DATE NOT NULL,
  wind_speed_kmh         DECIMAL(5,1),
  wind_gust_kmh          DECIMAL(5,1),
  visibility_km          DECIMAL(5,1),
  temperature_c          DECIMAL(4,1),
  humidity_percent       DECIMAL(4,1),
  condition              TEXT,                                       -- 'clear', 'dust_storm', 'sandstorm', 'rain', 'fog'
  severity               TEXT DEFAULT 'normal',                      -- 'normal', 'advisory', 'warning', 'severe'
  sheet_delivery_blocked BOOLEAN DEFAULT FALSE,                      -- TRUE when wind >30 km/h
  outdoor_ops_paused     BOOLEAN DEFAULT FALSE,                      -- TRUE when severity = 'severe'
  raw_api_response       JSONB,
  fetched_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, governorate, alert_date)
);
```

```sql
CREATE TABLE carrier_routing_config (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  prefix                 TEXT NOT NULL,                              -- e.g. '+2010', '+2011', '+2012'
  carrier_name           TEXT NOT NULL,                              -- 'vodafone', 'etisalat', 'orange', 'we'
  carrier_name_ar        TEXT,
  whatsapp_priority      INTEGER DEFAULT 1,
  sms_priority           INTEGER DEFAULT 2,
  voice_priority         INTEGER DEFAULT 3,
  whatsapp_timeout_ms    INTEGER DEFAULT 30000,
  sms_timeout_ms         INTEGER DEFAULT 30000,
  sms_provider           TEXT DEFAULT 'twilio',
  sms_delivery_rate      DECIMAL(5,2),
  whatsapp_delivery_rate DECIMAL(5,2),
  notes                  TEXT,
  is_active              BOOLEAN DEFAULT TRUE,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, prefix)
);
```

```sql
CREATE TABLE otp_delivery_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  phone_number        TEXT NOT NULL,                                 -- E.164 format
  detected_carrier    TEXT,
  detected_prefix     TEXT,
  otp_purpose         TEXT NOT NULL,                                 -- 'login', 'signup', 'transaction_verify', 'driver_pod'
  attempt_number      INTEGER NOT NULL DEFAULT 1,
  channel_used        TEXT NOT NULL,                                 -- 'whatsapp', 'sms', 'voice'
  provider_used       TEXT,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at        TIMESTAMPTZ,
  read_at             TIMESTAMPTZ,                                   -- WhatsApp read receipt
  verified_at         TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  failure_reason      TEXT,
  latency_ms          INTEGER,                                       -- sent_at to delivered_at
  provider_message_id TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
```

```sql
CREATE TABLE ceo_digests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  digest_type  TEXT NOT NULL CHECK (digest_type IN ('daily', 'weekly')),
  digest_date  DATE NOT NULL,
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,                   -- structured digest data
  ai_narrative TEXT,                                                  -- AI-generated natural language summary
  generated_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  sent_via     TEXT[],                                                -- e.g. {'email', 'whatsapp', 'push'}
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, digest_type, digest_date)
);
```

---

### 3.17 Materialized Views

```sql
-- CEO ATTENTION ITEMS -- refreshed every 5 min via pg_cron
-- Union of: bounced cheques, overdue invoices (60+ days), credit breaches,
-- delivery failures (today), supplier PO rejections (7 days)
CREATE MATERIALIZED VIEW ceo_attention_items AS
  -- (see Section 7 for full query definition)
  SELECT ... WITH NO DATA;

-- AP AGING SNAPSHOT -- refreshed daily at 2:00 AM via pg_cron
-- Accounts payable aging buckets by supplier (current, 1-30, 31-60, 61-90, 90+)
CREATE MATERIALIZED VIEW ap_aging_snapshot AS
  SELECT ... WITH NO DATA;
```

---

### Summary

| Domain | Tables | Enums |
|--------|--------|-------|
| Auth & Tenancy | 7 (tenants, user_profiles, user_roles, role_permissions, employees, approvals, audit_log) | 9 |
| Customer | 6 (customers, customer_contacts, addresses, projects, credit_applications, customer_feedback) | 4 |
| Supplier | 4 (suppliers, supplier_contacts, supplier_price_lists, supplier_agreements) | 0 |
| Product | 4 (products, product_suppliers, pricing_rules, contract_prices) | 8 |
| Quote | 4 (quote_requests, quote_request_items, quotes, quote_items) | 2 |
| Order | 2 (orders, order_items) | 1 |
| Procurement | 3 (supplier_pos, supplier_po_items, supplier_inquiries) | 3 |
| Inventory | 8 (warehouses, warehouse_locations, inventory, stock_movements, inventory_transfers, cycle_counts, source_inventory, inventory_reservations) | 0 |
| Delivery | 12 (vehicles, drivers, delivery_routes, deliveries, delivery_items, proof_of_delivery, drop_ship_pod, driver_locations, vehicle_inspections, driver_shifts, load_verifications) | 7 |
| Finance | 16 (invoices, invoice_items, invoice_disputes, payments, payment_applications, cheque_tracking, letters_of_credit, credit_notes, credit_note_applications, withholding_tax_certificates, company_bank_accounts, supplier_invoices, supplier_invoice_items, ar_aging_snapshots, revenue_recognition_events, returns) | 11 |
| Driver Marketplace | 2 (driver_jobs, driver_earnings) | 0 |
| Delivery Zones | 1 (delivery_zones) | 0 |
| Support | 2 (tickets, ticket_messages) | 3 |
| HR & Onboarding | 4 (onboarding_sequences, onboarding_steps, customer_onboarding_progress, governorates) | 0 |
| AI & Search | 7 (ai_conversations, ai_messages, ai_request_log, document_embeddings, product_embeddings, business_data_embeddings, search_index) | 0 |
| System | 12 (notifications, notification_groups, documents, system_settings, sequence_counters, state_history, webhook_events, weather_alerts, carrier_routing_config, otp_delivery_log, ceo_digests) | 2 |
| **Total** | **94 tables + 2 materialized views** | **50 enums** |


---

## 4. AUTH + RLS

### 4.1 Auth Helper Functions

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

#### Custom Access Token Hook

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
  WHERE p.id = user_id;

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

---

### 4.2 RLS Policies

> **Convention:** All policies use `(SELECT auth.uid())` (subquery form) to avoid per-row re-evaluation.
> Financial tables additionally gate on MFA: `(auth.jwt()->>'aal') = 'aal2'`.

#### Customer Domain

**`customers`**

```sql
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

CREATE POLICY customers_internal_select ON public.customers
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customers_internal_insert ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customers_internal_update ON public.customers
  FOR UPDATE TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customers_internal_delete ON public.customers
  FOR DELETE TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (SELECT has_role('admin')));

CREATE POLICY customers_external_select ON public.customers
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_customer_id()));
```

**`customer_contacts`**

```sql
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY customer_contacts_internal_all ON public.customer_contacts
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customer_contacts_external_select ON public.customer_contacts
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY customer_contacts_external_update ON public.customer_contacts
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND user_id = (SELECT auth.uid())
  );
```

**`customer_addresses`**

```sql
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses FORCE ROW LEVEL SECURITY;

CREATE POLICY customer_addresses_internal_all ON public.customer_addresses
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY customer_addresses_external_select ON public.customer_addresses
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY customer_addresses_external_insert ON public.customer_addresses
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));
```

#### Order & Quote Domain

**`quote_requests`**

```sql
ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY qr_internal_all ON public.quote_requests
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY qr_customer_select ON public.quote_requests
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY qr_customer_insert ON public.quote_requests
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY qr_customer_update ON public.quote_requests
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status IN ('draft', 'submitted')
  );
```

**`quotes`**

```sql
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes FORCE ROW LEVEL SECURITY;

CREATE POLICY quotes_internal_all ON public.quotes
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY quotes_customer_select ON public.quotes
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status IN ('sent', 'accepted', 'rejected', 'expired')
  );

CREATE POLICY quotes_customer_update ON public.quotes
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status = 'sent'
  )
  WITH CHECK (status IN ('accepted', 'rejected'));
```

**`quote_line_items`**

```sql
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_line_items FORCE ROW LEVEL SECURITY;

CREATE POLICY qli_internal_all ON public.quote_line_items
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY qli_customer_select ON public.quote_line_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_id
        AND q.customer_id = (SELECT current_customer_id())
        AND q.status IN ('sent', 'accepted', 'rejected', 'expired')
    )
  );
```

**`orders`**

```sql
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;

CREATE POLICY orders_internal_all ON public.orders
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY orders_customer_select ON public.orders
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()));

CREATE POLICY orders_supplier_select ON public.orders
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.supplier_pos spo ON spo.order_id = orders.id
      WHERE spo.supplier_id = (SELECT current_supplier_id())
    )
  );
```

**`order_items`**

```sql
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;

CREATE POLICY oi_internal_all ON public.order_items
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY oi_customer_select ON public.order_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.customer_id = (SELECT current_customer_id())
    )
  );
```

#### Supplier & Procurement Domain

**`suppliers`**

```sql
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers FORCE ROW LEVEL SECURITY;

CREATE POLICY suppliers_internal_all ON public.suppliers
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY suppliers_external_select ON public.suppliers
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_supplier_id()));
```

**`supplier_contacts`**

```sql
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts FORCE ROW LEVEL SECURITY;

CREATE POLICY sc_internal_all ON public.supplier_contacts
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY sc_supplier_select ON public.supplier_contacts
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

CREATE POLICY sc_supplier_update ON public.supplier_contacts
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND supplier_id = (SELECT current_supplier_id())
    AND user_id = (SELECT auth.uid())
  );
```

**`supplier_pos`**

```sql
ALTER TABLE public.supplier_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_pos FORCE ROW LEVEL SECURITY;

CREATE POLICY spo_internal_all ON public.supplier_pos
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY spo_supplier_select ON public.supplier_pos
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id()));

CREATE POLICY spo_supplier_update ON public.supplier_pos
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND supplier_id = (SELECT current_supplier_id())
    AND status IN ('sent', 'acknowledged')
  );
```

**`purchase_order_items`**

```sql
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items FORCE ROW LEVEL SECURITY;

CREATE POLICY poi_internal_all ON public.purchase_order_items
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY poi_supplier_select ON public.purchase_order_items
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM public.supplier_pos spo
      WHERE spo.id = supplier_po_id AND spo.supplier_id = (SELECT current_supplier_id())
    )
  );
```

#### Product & Inventory Domain

**`products`**

```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

CREATE POLICY products_internal_all ON public.products
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY products_customer_select ON public.products
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND tenant_id = (SELECT current_tenant_id()) AND is_active = true);

CREATE POLICY products_supplier_select ON public.products
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM public.supplier_products sp
      WHERE sp.product_id = products.id AND sp.supplier_id = (SELECT current_supplier_id())
    )
  );
```

**`inventory`**

```sql
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_internal_all ON public.inventory
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));
```

#### Delivery & Logistics Domain

**`deliveries`**

```sql
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries FORCE ROW LEVEL SECURITY;

CREATE POLICY deliveries_internal_all ON public.deliveries
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY deliveries_customer_select ON public.deliveries
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = (SELECT current_customer_id())
    )
  );

CREATE POLICY deliveries_driver_select ON public.deliveries
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND driver_id = (SELECT current_driver_id()) AND status = 'active');

CREATE POLICY deliveries_driver_update ON public.deliveries
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND driver_id = (SELECT current_driver_id())
    AND status IN ('assigned', 'in_transit')
  );
```

**`delivery_stops`**

```sql
ALTER TABLE public.delivery_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_stops FORCE ROW LEVEL SECURITY;

CREATE POLICY ds_internal_all ON public.delivery_stops
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY ds_driver_select ON public.delivery_stops
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_id AND d.driver_id = (SELECT current_driver_id()) AND d.status IN ('assigned', 'in_transit')
    )
  );

CREATE POLICY ds_driver_update ON public.delivery_stops
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND EXISTS (
      SELECT 1 FROM public.deliveries d
      WHERE d.id = delivery_id AND d.driver_id = (SELECT current_driver_id()) AND d.status = 'in_transit'
    )
  );
```

#### Financial Domain (MFA-Gated)

> All financial tables require AAL2 (MFA) for access: `(auth.jwt()->>'aal') = 'aal2'`

**`invoices`**

```sql
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

CREATE POLICY invoices_internal_all ON public.invoices
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY invoices_customer_select ON public.invoices
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');
```

**`payments`**

```sql
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;

CREATE POLICY payments_internal_all ON public.payments
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY payments_customer_select ON public.payments
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');
```

**`cheque_tracking`**

```sql
ALTER TABLE public.cheque_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheque_tracking FORCE ROW LEVEL SECURITY;

CREATE POLICY cheques_internal_all ON public.cheque_tracking
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY cheques_customer_select ON public.cheque_tracking
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');
```

**`letters_of_credit`**

```sql
ALTER TABLE public.letters_of_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters_of_credit FORCE ROW LEVEL SECURITY;

CREATE POLICY lc_internal_all ON public.letters_of_credit
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2')
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND (auth.jwt()->>'aal') = 'aal2');

CREATE POLICY lc_customer_select ON public.letters_of_credit
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND customer_id = (SELECT current_customer_id()) AND (auth.jwt()->>'aal') = 'aal2');
```

#### HR & Vehicles Domain

**`employees`**

```sql
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;

CREATE POLICY employees_hr_all ON public.employees
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND ((SELECT has_role('hr')) OR (SELECT has_role('admin'))))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()) AND ((SELECT has_role('hr')) OR (SELECT has_role('admin'))));

CREATE POLICY employees_self_select ON public.employees
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND user_id = (SELECT auth.uid()));
```

**`drivers`**

```sql
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers FORCE ROW LEVEL SECURITY;

CREATE POLICY drivers_internal_all ON public.drivers
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY drivers_self_select ON public.drivers
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_driver_id()));

CREATE POLICY drivers_self_update ON public.drivers
  FOR UPDATE TO authenticated
  USING ((SELECT is_external_user()) AND id = (SELECT current_driver_id()) AND status = 'active');
```

**`vehicles`**

```sql
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles FORCE ROW LEVEL SECURITY;

CREATE POLICY vehicles_internal_all ON public.vehicles
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY vehicles_driver_select ON public.vehicles
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND assigned_driver_id = (SELECT current_driver_id()));
```

#### Support, Notifications & Search

**`tickets`**

```sql
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets FORCE ROW LEVEL SECURITY;

CREATE POLICY tickets_internal_all ON public.tickets
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY tickets_external_own ON public.tickets
  FOR SELECT TO authenticated
  USING ((SELECT is_external_user()) AND created_by = (SELECT auth.uid()));

CREATE POLICY tickets_external_insert ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_external_user()) AND created_by = (SELECT auth.uid()));

CREATE POLICY tickets_external_update ON public.tickets
  FOR UPDATE TO authenticated
  USING ((SELECT is_external_user()) AND created_by = (SELECT auth.uid()) AND status NOT IN ('closed', 'resolved'));
```

**`notifications`**

```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY notifications_own_select ON public.notifications
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_own_update ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY notifications_internal_insert ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));
```

**`documents`**

```sql
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

CREATE POLICY documents_internal_all ON public.documents
  FOR ALL TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()))
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY documents_external_select ON public.documents
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (
      (entity_type = 'customer' AND entity_id = (SELECT current_customer_id()))
      OR (entity_type = 'supplier' AND entity_id = (SELECT current_supplier_id()))
      OR (entity_type = 'driver' AND entity_id = (SELECT current_driver_id()))
    )
  );
```

**`search_index`**

```sql
ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_index FORCE ROW LEVEL SECURITY;

CREATE POLICY search_internal_select ON public.search_index
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

-- Customer-scoped: customers see records linked to their customer_id
CREATE POLICY search_customer_select ON public.search_index
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (SELECT current_user_type()) = 'customer'
    AND tenant_id = (SELECT current_tenant_id())
    AND entity_customer_id = (SELECT current_customer_id())
  );

-- Supplier-scoped: suppliers see records linked to their supplier_id
CREATE POLICY search_supplier_select ON public.search_index
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user())
    AND (SELECT current_user_type()) = 'supplier'
    AND tenant_id = (SELECT current_tenant_id())
    AND entity_supplier_id = (SELECT current_supplier_id())
  );

CREATE POLICY search_internal_insert ON public.search_index
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));
```

**`ai_request_log`**

```sql
ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_request_log FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_log_internal_select ON ai_request_log
  FOR SELECT TO authenticated
  USING ((SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id()));

CREATE POLICY ai_log_internal_insert ON ai_request_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT current_tenant_id()));
```

#### Tenant Isolation (Remaining Tables)

```sql
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_ship_pod ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_disputes ENABLE ROW LEVEL SECURITY;

-- Standard tenant isolation applied to each:
CREATE POLICY tenant_isolation ON vehicle_inspections USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON driver_shifts USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON driver_jobs USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON driver_earnings USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON load_verifications USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON company_bank_accounts USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON delivery_zones USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON supplier_invoice_items USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON source_inventory USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON inventory_reservations USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON customer_feedback USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON supplier_agreements USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON ceo_digests USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON drop_ship_pod USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON notification_groups USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
CREATE POLICY tenant_isolation ON invoice_disputes USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
```


---

## 5. TRIGGERS + STATE MACHINE

### 5.1 Universal Triggers (All Business Tables)

| Trigger | Function | Event | Description |
|---|---|---|---|
| `trg_{table}_set_tenant` | `set_tenant_id()` | BEFORE INSERT | Auto-sets tenant_id from JWT on every insert |
| `trg_{table}_updated_at` | `update_updated_at()` | BEFORE UPDATE | Sets `updated_at = NOW()` on every update |
| `trg_{table}_audit` | `audit.insert_audit_log()` | AFTER INSERT OR UPDATE OR DELETE | supa_audit log for compliance (pgAudit extension) |

Applied to all tables: `customers`, `customer_contacts`, `customer_addresses`, `quote_requests`, `quotes`, `quote_line_items`, `orders`, `order_items`, `suppliers`, `supplier_contacts`, `supplier_pos`, `purchase_order_items`, `products`, `inventory`, `deliveries`, `delivery_stops`, `invoices`, `payments`, `cheque_tracking`, `letters_of_credit`, `employees`, `drivers`, `vehicles`, `tickets`, `notifications`, `documents`, `drop_ship_pod`, `invoice_disputes`, `notification_groups`, `ai_request_log`.

```sql
-- Example pattern (repeat for every business table):
CREATE TRIGGER trg_customers_set_tenant
  BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

SELECT audit.enable_tracking('public.customers'::regclass);
```

### 5.2 Business Logic Triggers

| Trigger | Table | Event | Function | Description |
|---|---|---|---|---|
| `trg_quote_accepted` | `quotes` | AFTER UPDATE | `on_quote_accepted()` | When status -> 'accepted', auto-create order + proforma invoice |
| `trg_delivery_confirmed` | `deliveries` | AFTER UPDATE | `on_delivery_confirmed()` | When status -> 'delivered', auto-create invoice + revenue recognition event (EAS 48) |
| `trg_payment_bounced` | `payments` | AFTER UPDATE | `on_payment_bounced()` | When status -> 'bounced', set customer credit_hold = true |
| `trg_cheque_cleared` | `cheque_tracking` | AFTER UPDATE | `on_cheque_cleared()` | When status -> 'cleared', apply payment to invoice |
| `trg_inventory_movement` | `inventory_movements` | AFTER INSERT | `on_inventory_movement()` | Recalculate inventory totals |
| `trg_search_index_sync` | multiple | AFTER INSERT OR UPDATE | `sync_search_index()` | Update search_index with searchable content |
| `trg_new_driver_signup` | `drivers` | BEFORE INSERT | `on_new_driver_signup()` | Create notification for ops, set 'pending_verification' |
| `trg_customer_created_onboarding` | `customers` | AFTER INSERT | `on_customer_created_start_onboarding()` | Initialize 7-day onboarding sequence |
| `trg_product_wind_sensitivity` | `products` | BEFORE INSERT OR UPDATE OF category | `set_wind_sensitivity()` | Auto-set is_wind_sensitive for sheet/panel materials |
| `trg_weather_set_blocking` | `weather_alerts` | BEFORE INSERT OR UPDATE | `set_weather_blocking_flags()` | Auto-set sheet_delivery_blocked and outdoor_ops_paused |
| `trg_prevent_lifo` | `tenants` | BEFORE INSERT OR UPDATE OF inventory_costing_method | `prevent_lifo_costing()` | Block LIFO (prohibited under Egyptian law) |
| `trg_drop_ship_dispatched` | `deliveries` | AFTER UPDATE | `on_drop_ship_dispatched()` | Auto-create drop_ship_pod record for supplier_direct deliveries |
| `trg_order_tier4_bypass` | `orders` | BEFORE INSERT | `auto_bypass_tier4_payment()` | Auto-set payment_instrument_verified for Tier 4 customers |
| `trg_check_exchange_rate_variance` | `supplier_pos` | BEFORE INSERT | `check_exchange_rate_variance()` | Flag POs with >5% rate drift from quote |
| `trg_generate_coded_delivery_reference` | `supplier_pos` | BEFORE INSERT | `generate_coded_delivery_reference()` | Auto-generate HQ-YYYY-NNNN coded delivery references |
| `trg_on_po_confirmed_send_delivery_note` | `supplier_pos` | AFTER UPDATE | `on_po_confirmed_send_delivery_note()` | Queue delivery note generation on PO confirmation |
| `trg_set_dispute_sla_deadline` | `invoice_disputes` | BEFORE INSERT | `set_dispute_sla_deadline()` | Set 48h SLA + sync invoice status to 'disputed' |

#### `on_quote_accepted()` (with proforma invoice generation and Tier 4 bypass)

```sql
CREATE OR REPLACE FUNCTION public.on_quote_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_customer RECORD;
  v_bank_account RECORD;
  v_due_date DATE;
  v_today DATE := (NOW() AT TIME ZONE 'Africa/Cairo')::DATE;
BEGIN
  IF OLD.status != 'accepted' AND NEW.status = 'accepted' THEN

    -- Get customer info for tier-aware logic
    SELECT c.tier, c.credit_terms INTO v_customer
    FROM customers c WHERE c.id = NEW.customer_id;

    -- 1. Create Order
    INSERT INTO public.orders (
      tenant_id, customer_id, quote_id, project_id, status,
      subtotal, tax_amount, delivery_fee, discount_amount, total,
      currency, payment_terms, delivery_address_id,
      requested_delivery_date, assigned_sales_rep,
      customer_po_reference, created_by
    )
    VALUES (
      NEW.tenant_id, NEW.customer_id, NEW.id, NEW.project_id, 'confirmed',
      NEW.subtotal, NEW.tax_amount, NEW.delivery_fee, NEW.discount_amount, NEW.total,
      NEW.currency, NEW.payment_terms, NEW.delivery_address_id,
      NEW.estimated_delivery_date, NEW.assigned_to,
      NEW.customer_po_reference, NEW.accepted_by
    )
    RETURNING id INTO v_order_id;

    -- Copy quote items to order items
    INSERT INTO public.order_items (
      order_id, quote_item_id, product_id, product_name,
      quantity, unit_of_measure, unit_price, line_total, sort_order
    )
    SELECT
      v_order_id, qi.id, qi.product_id, qi.product_name,
      qi.quantity, qi.unit_of_measure, qi.unit_price, qi.line_total, qi.sort_order
    FROM quote_items qi
    WHERE qi.quote_id = NEW.id;

    -- Update order total_items count
    UPDATE orders SET total_items = (
      SELECT COUNT(*) FROM order_items WHERE order_id = v_order_id
    ) WHERE id = v_order_id;

    -- 1b. Tier 4 auto-bypass: set payment_instrument_verified = TRUE
    IF v_customer.tier = 'tier_4_preferred' THEN
      UPDATE orders SET
        payment_instrument_verified = TRUE,
        payment_terms = 'net_30',
        internal_notes = COALESCE(internal_notes, '') ||
          E'\n[AUTO] Tier 4 preferred customer — payment instrument requirement bypassed. Net 30 terms applied.'
      WHERE id = v_order_id;
    END IF;

    -- 2. Generate Proforma Invoice
    SELECT generate_sequence_number(NEW.tenant_id, 'proforma_invoice', 'PI')
    INTO v_invoice_number;

    v_due_date := v_today + INTERVAL '7 days';

    SELECT * INTO v_bank_account
    FROM company_bank_accounts
    WHERE tenant_id = NEW.tenant_id AND is_default = TRUE AND is_active = TRUE
    LIMIT 1;

    INSERT INTO public.invoices (
      tenant_id, invoice_number, invoice_type, order_id, quote_id,
      customer_id, project_id, status,
      subtotal, tax_amount, delivery_charges, discount_amount, total,
      currency, payment_terms, due_date, tax_rate,
      buyer_trn, seller_trn,
      wire_instructions
    )
    VALUES (
      NEW.tenant_id, v_invoice_number, 'proforma', v_order_id, NEW.id,
      NEW.customer_id, NEW.project_id, 'sent',
      NEW.subtotal, NEW.tax_amount, NEW.delivery_fee, NEW.discount_amount, NEW.total,
      NEW.currency, NEW.payment_terms, v_due_date, 0.14,
      (SELECT tax_registration_number FROM customers WHERE id = NEW.customer_id),
      (SELECT value FROM system_settings WHERE tenant_id = NEW.tenant_id AND key = 'company_trn'),
      jsonb_build_object(
        'bank_name', v_bank_account.bank_name,
        'bank_name_ar', v_bank_account.bank_name_ar,
        'iban', v_bank_account.iban,
        'swift_code', v_bank_account.swift_code,
        'branch', v_bank_account.branch,
        'currency', v_bank_account.currency,
        'reference', 'Order ' || (SELECT order_number FROM orders WHERE id = v_order_id)
      )
    )
    RETURNING id INTO v_invoice_id;

    -- Copy line items to invoice_items
    INSERT INTO public.invoice_items (
      invoice_id, order_item_id, product_id, description,
      quantity, unit_of_measure, unit_price, line_total, sort_order
    )
    SELECT
      v_invoice_id, oi.id, oi.product_id, oi.product_name,
      oi.quantity, oi.unit_of_measure, oi.unit_price, oi.line_total, oi.sort_order
    FROM order_items oi
    WHERE oi.order_id = v_order_id;

  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quote_accepted
  AFTER UPDATE OF status ON public.quotes
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status != 'accepted')
  EXECUTE FUNCTION public.on_quote_accepted();
```

#### `on_delivery_confirmed()` (with EAS 48 revenue recognition)

```sql
CREATE OR REPLACE FUNCTION public.on_delivery_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_invoice_id UUID;
  v_cogs DECIMAL(15,2);
  v_delivery_cost DECIMAL(15,2);
  v_now TIMESTAMPTZ := NOW();
  v_today DATE := (v_now AT TIME ZONE 'Africa/Cairo')::date;
BEGIN
  IF OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
    SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;

    -- Calculate COGS from supplier PO items
    SELECT COALESCE(SUM(poi.unit_cost * di.delivered_quantity), 0)
    INTO v_cogs
    FROM public.delivery_items di
    JOIN public.supplier_po_items poi ON poi.order_item_id = di.order_item_id
    WHERE di.delivery_id = NEW.id;

    v_delivery_cost := COALESCE(NEW.actual_delivery_cost, 0);

    -- Create invoice
    INSERT INTO public.invoices (
      tenant_id, customer_id, order_id, delivery_id,
      subtotal, tax_amount, delivery_charges, total,
      cogs_amount, currency, status, due_date,
      revenue_recognized, revenue_recognized_at
    )
    VALUES (
      NEW.tenant_id, v_order.customer_id, NEW.order_id, NEW.id,
      v_order.total, v_order.total * 0.14, v_delivery_cost,
      v_order.total * 1.14 + v_delivery_cost,
      v_cogs, v_order.currency, 'draft',
      v_today + INTERVAL '30 days',
      TRUE, v_now
    )
    RETURNING id INTO v_invoice_id;

    -- Create revenue recognition event (EAS 48)
    INSERT INTO public.revenue_recognition_events (
      tenant_id, invoice_id, delivery_id, order_id, customer_id,
      recognition_date, gross_revenue, cost_of_goods_sold,
      delivery_cost, vat_amount, currency,
      fiscal_year, fiscal_month
    )
    VALUES (
      NEW.tenant_id, v_invoice_id, NEW.id, NEW.order_id, v_order.customer_id,
      v_today, v_order.total, v_cogs,
      v_delivery_cost, v_order.total * 0.14, v_order.currency,
      EXTRACT(YEAR FROM v_today)::int,
      EXTRACT(MONTH FROM v_today)::int
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_delivery_confirmed
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  WHEN (NEW.status = 'delivered' AND OLD.status != 'delivered')
  EXECUTE FUNCTION public.on_delivery_confirmed();
```

#### `on_payment_bounced()`

```sql
CREATE OR REPLACE FUNCTION public.on_payment_bounced()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status != 'bounced' AND NEW.status = 'bounced' THEN
    UPDATE public.customers
    SET credit_hold = true,
        credit_hold_reason = 'Payment bounced: ' || NEW.reference_number
    WHERE id = NEW.customer_id AND tenant_id = NEW.tenant_id;

    INSERT INTO public.notifications (tenant_id, user_id, type, title, body, entity_type, entity_id)
    SELECT NEW.tenant_id, ur.user_id, 'payment_bounced',
      'Payment Bounced',
      'Payment ' || NEW.reference_number || ' has bounced. Customer placed on credit hold.',
      'payment', NEW.id
    FROM public.user_roles ur WHERE ur.role IN ('finance', 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_bounced
  AFTER UPDATE OF status ON public.payments
  FOR EACH ROW
  WHEN (NEW.status = 'bounced' AND OLD.status != 'bounced')
  EXECUTE FUNCTION public.on_payment_bounced();
```

#### `on_cheque_cleared()`

```sql
CREATE OR REPLACE FUNCTION public.on_cheque_cleared()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status != 'cleared' AND NEW.status = 'cleared' THEN
    UPDATE public.payments
    SET status = 'completed', cleared_at = NOW()
    WHERE id = NEW.payment_id AND tenant_id = NEW.tenant_id;

    UPDATE public.invoices
    SET status = 'paid', paid_at = NOW()
    WHERE id = (SELECT invoice_id FROM public.payments WHERE id = NEW.payment_id)
    AND amount <= (
      SELECT COALESCE(SUM(amount), 0) FROM public.payments
      WHERE invoice_id = invoices.id AND status = 'completed'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cheque_cleared
  AFTER UPDATE OF status ON public.cheque_tracking
  FOR EACH ROW
  WHEN (NEW.status = 'cleared' AND OLD.status != 'cleared')
  EXECUTE FUNCTION public.on_cheque_cleared();
```

#### `on_inventory_movement()`

```sql
CREATE OR REPLACE FUNCTION public.on_inventory_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory
  SET quantity = quantity + (
    CASE NEW.movement_type
      WHEN 'in' THEN NEW.quantity
      WHEN 'out' THEN -NEW.quantity
      WHEN 'adjustment' THEN NEW.quantity
      ELSE 0
    END
  ),
  updated_at = NOW()
  WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    INSERT INTO public.inventory (tenant_id, product_id, warehouse_id, quantity)
    VALUES (NEW.tenant_id, NEW.product_id, NEW.warehouse_id, NEW.quantity);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inventory_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.on_inventory_movement();
```

#### `sync_search_index()` (with supplier scoping)

```sql
CREATE OR REPLACE FUNCTION public.sync_search_index()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope_type TEXT;
  v_scope_id UUID;
  v_customer_id UUID;
  v_supplier_id UUID;
  v_title TEXT;
  v_content TEXT;
BEGIN
  v_scope_type := CASE TG_TABLE_NAME
    WHEN 'customers' THEN 'customer'
    WHEN 'suppliers' THEN 'supplier'
    ELSE 'internal'
  END;

  v_scope_id := CASE TG_TABLE_NAME
    WHEN 'customers' THEN NEW.id
    WHEN 'suppliers' THEN NEW.id
    ELSE NULL
  END;

  v_customer_id := CASE TG_TABLE_NAME
    WHEN 'customers' THEN NEW.id
    WHEN 'orders' THEN NEW.customer_id
    WHEN 'quotes' THEN NEW.customer_id
    WHEN 'invoices' THEN NEW.customer_id
    WHEN 'deliveries' THEN (SELECT customer_id FROM orders WHERE id = NEW.order_id)
    ELSE NULL
  END;

  v_supplier_id := CASE TG_TABLE_NAME
    WHEN 'suppliers' THEN NEW.id
    WHEN 'supplier_pos' THEN NEW.supplier_id
    WHEN 'supplier_invoices' THEN NEW.supplier_id
    WHEN 'products' THEN (
      SELECT sp.supplier_id
      FROM supplier_po_items spi
      JOIN supplier_pos sp ON sp.id = spi.supplier_po_id
      WHERE spi.product_id = NEW.id
      ORDER BY sp.created_at DESC
      LIMIT 1
    )
    ELSE NULL
  END;

  v_title := COALESCE(NEW.name, NEW.reference_number, NEW.po_number,
                       NEW.invoice_number, NEW.delivery_number, NEW.id::TEXT);

  v_content := to_json(NEW)::TEXT;

  INSERT INTO public.search_index (
    entity_tenant_id, entity_type, entity_id,
    entity_customer_id, entity_supplier_id,
    display_title, display_subtitle, search_vector
  )
  VALUES (
    NEW.tenant_id, TG_TABLE_NAME, NEW.id,
    v_customer_id, v_supplier_id,
    v_title, v_content,
    to_tsvector('english', COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.reference_number, ''))
  )
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    display_title = EXCLUDED.display_title,
    display_subtitle = EXCLUDED.display_subtitle,
    search_vector = EXCLUDED.search_vector,
    entity_customer_id = EXCLUDED.entity_customer_id,
    entity_supplier_id = EXCLUDED.entity_supplier_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$;
```

#### `on_new_driver_signup()`

```sql
CREATE OR REPLACE FUNCTION public.on_new_driver_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL THEN
    NEW.status := 'pending_verification';
  END IF;

  INSERT INTO public.notifications (tenant_id, user_id, type, title, body, entity_type, entity_id)
  SELECT NEW.tenant_id, ur.user_id, 'new_driver', 'New Driver Signup',
    'Driver ' || COALESCE(NEW.name, 'Unknown') || ' requires verification.',
    'driver', NEW.id
  FROM public.user_roles ur WHERE ur.role IN ('operations', 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_new_driver_signup
  BEFORE INSERT ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.on_new_driver_signup();
```

#### `on_customer_created_start_onboarding()`

```sql
CREATE OR REPLACE FUNCTION public.on_customer_created_start_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq record;
  v_step record;
  v_start TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_seq FROM onboarding_sequences
  WHERE tenant_id = NEW.tenant_id AND target_type = 'customer' AND is_active = TRUE LIMIT 1;

  IF v_seq IS NOT NULL THEN
    FOR v_step IN SELECT * FROM onboarding_steps WHERE sequence_id = v_seq.id AND is_active = TRUE ORDER BY sort_order
    LOOP
      INSERT INTO customer_onboarding_progress (
        tenant_id, customer_id, sequence_id, step_id, status, scheduled_at, assigned_to
      ) VALUES (
        NEW.tenant_id, NEW.id, v_seq.id, v_step.id, 'scheduled',
        v_start + (v_step.delay_minutes || ' minutes')::interval,
        CASE WHEN v_step.assigned_role = 'sales_rep' THEN
          (SELECT id FROM employees WHERE id = NEW.assigned_sales_rep)
        ELSE NULL END
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customer_created_onboarding
  AFTER INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.on_customer_created_start_onboarding();
```

#### `set_wind_sensitivity()` (Khamsin weather)

```sql
CREATE OR REPLACE FUNCTION public.set_wind_sensitivity()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_wind_sensitive := NEW.category IN ('plywood', 'gypsum_board', 'roofing', 'glass', 'insulation');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_product_wind_sensitivity
  BEFORE INSERT OR UPDATE OF category ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_wind_sensitivity();
```

#### `set_weather_blocking_flags()`

```sql
CREATE OR REPLACE FUNCTION public.set_weather_blocking_flags()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.sheet_delivery_blocked := COALESCE(NEW.wind_speed_kmh, 0) > 30 OR COALESCE(NEW.wind_gust_kmh, 0) > 50;
  NEW.outdoor_ops_paused := NEW.severity = 'severe' OR COALESCE(NEW.wind_speed_kmh, 0) > 50 OR COALESCE(NEW.visibility_km, 10) < 1;

  IF COALESCE(NEW.wind_speed_kmh, 0) > 60 OR COALESCE(NEW.visibility_km, 10) < 0.5 THEN
    NEW.severity := 'severe';
  ELSIF COALESCE(NEW.wind_speed_kmh, 0) > 40 THEN
    NEW.severity := 'warning';
  ELSIF COALESCE(NEW.wind_speed_kmh, 0) > 30 THEN
    NEW.severity := 'advisory';
  ELSE
    NEW.severity := 'normal';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_weather_set_blocking
  BEFORE INSERT OR UPDATE ON public.weather_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_weather_blocking_flags();
```

#### `prevent_lifo_costing()`

```sql
CREATE OR REPLACE FUNCTION public.prevent_lifo_costing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.inventory_costing_method::text = 'lifo' THEN
    RAISE EXCEPTION 'LIFO inventory costing is prohibited under Egyptian Accounting Standards (EAS). Use WAC or FIFO.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_lifo
  BEFORE INSERT OR UPDATE OF inventory_costing_method ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.prevent_lifo_costing();
```

#### `on_drop_ship_dispatched()` -- Auto-create drop_ship_pod on supplier_direct dispatch

```sql
CREATE OR REPLACE FUNCTION on_drop_ship_dispatched()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supplier_id UUID;
BEGIN
  IF NEW.shipping_method = 'supplier_direct'
     AND OLD.status != 'dispatched'
     AND NEW.status = 'dispatched' THEN

    SELECT supplier_id INTO v_supplier_id
    FROM supplier_pos
    WHERE id = NEW.supplier_po_id;

    INSERT INTO drop_ship_pod (
      tenant_id, delivery_id, supplier_id, order_id, customer_id,
      status, auto_confirm_deadline
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      COALESCE(v_supplier_id, (SELECT supplier_id FROM supplier_pos WHERE order_id = NEW.order_id LIMIT 1)),
      NEW.order_id,
      (SELECT customer_id FROM orders WHERE id = NEW.order_id),
      'awaiting_supplier_pod',
      NOW() + INTERVAL '72 hours'
    )
    ON CONFLICT (delivery_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_drop_ship_dispatched
  AFTER UPDATE OF status ON deliveries
  FOR EACH ROW
  WHEN (NEW.status = 'dispatched' AND OLD.status != 'dispatched')
  EXECUTE FUNCTION on_drop_ship_dispatched();
```

#### `auto_bypass_tier4_payment()` -- Tier 4 payment instrument bypass

```sql
CREATE OR REPLACE FUNCTION auto_bypass_tier4_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier customer_tier;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT tier INTO v_tier
    FROM customers
    WHERE id = NEW.customer_id;

    IF v_tier = 'tier_4_preferred' THEN
      NEW.payment_instrument_verified := TRUE;
      NEW.payment_terms := 'net_30';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_order_tier4_bypass
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_bypass_tier4_payment();
```

#### `check_exchange_rate_variance()` -- Flag POs with >5% rate drift

```sql
CREATE OR REPLACE FUNCTION check_exchange_rate_variance()
RETURNS TRIGGER AS $$
DECLARE
  v_quote_rate      DECIMAL(18,8);
  v_threshold       DECIMAL(5,2);
  v_variance_pct    DECIMAL(5,2);
BEGIN
  IF NEW.source_currency = 'EGP' OR NEW.exchange_rate IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT q.exchange_rate INTO v_quote_rate
  FROM orders o
  JOIN quotes q ON q.id = o.quote_id
  WHERE o.id = NEW.order_id
    AND q.source_currency = NEW.source_currency
    AND q.exchange_rate IS NOT NULL
  LIMIT 1;

  IF v_quote_rate IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT (value::TEXT)::DECIMAL(5,2) INTO v_threshold
  FROM system_settings
  WHERE tenant_id = NEW.tenant_id
    AND category = 'procurement'
    AND key = 'exchange_rate_variance_threshold';

  IF v_threshold IS NULL THEN
    v_threshold := 5.0;
  END IF;

  v_variance_pct := ABS((NEW.exchange_rate - v_quote_rate) / v_quote_rate * 100);

  IF v_variance_pct > v_threshold THEN
    NEW.status := 'pending_review';
    NEW.internal_notes := COALESCE(NEW.internal_notes, '') ||
      E'\n[AUTO] Exchange rate variance ' || ROUND(v_variance_pct, 2) || '% exceeds threshold ' || v_threshold || '%. '
      || 'Quote rate: ' || v_quote_rate || ', PO rate: ' || NEW.exchange_rate || '. Requires procurement review.';

    INSERT INTO notifications (tenant_id, user_id, channel, priority, title, body, entity_type, entity_id, action_url)
    SELECT NEW.tenant_id, e.user_id, 'in_app', 'high',
           'Exchange Rate Variance Alert',
           'PO ' || NEW.po_number || ' has a ' || ROUND(v_variance_pct, 2) || '% rate variance vs. the original quote. Review required.',
           'supplier_po', NEW.id,
           '/procurement/pos/' || NEW.id
    FROM employees e
    WHERE e.tenant_id = NEW.tenant_id
      AND e.department = 'procurement';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_exchange_rate_variance
  BEFORE INSERT ON supplier_pos
  FOR EACH ROW
  EXECUTE FUNCTION check_exchange_rate_variance();
```

#### `generate_coded_delivery_reference()` -- PO anonymization

```sql
CREATE OR REPLACE FUNCTION generate_coded_delivery_reference()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
  v_year INTEGER := EXTRACT(YEAR FROM NOW());
BEGIN
  IF NEW.coded_delivery_reference IS NOT NULL THEN
    RETURN NEW;
  END IF;

  UPDATE sequence_counters
  SET current_value = current_value + 1
  WHERE tenant_id = NEW.tenant_id
    AND entity_type = 'coded_delivery'
    AND year = v_year
  RETURNING current_value INTO v_seq;

  NEW.coded_delivery_reference := 'HQ-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_coded_delivery_reference
  BEFORE INSERT ON supplier_pos
  FOR EACH ROW
  EXECUTE FUNCTION generate_coded_delivery_reference();
```

#### `on_po_confirmed_send_delivery_note()` -- Queue delivery note on PO confirmation

```sql
CREATE OR REPLACE FUNCTION on_po_confirmed_send_delivery_note()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    INSERT INTO notifications (tenant_id, user_id, channel, priority, title, body, entity_type, entity_id, metadata)
    SELECT NEW.tenant_id, NEW.created_by, 'system', 'high',
           'Delivery Note Ready to Send',
           'PO ' || NEW.po_number || ' confirmed. Delivery note for ' || NEW.coded_delivery_reference || ' ready for dispatch.',
           'supplier_po', NEW.id,
           jsonb_build_object('action', 'generate_delivery_note', 'po_id', NEW.id, 'coded_ref', NEW.coded_delivery_reference);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_po_confirmed_send_delivery_note
  AFTER UPDATE ON supplier_pos
  FOR EACH ROW
  EXECUTE FUNCTION on_po_confirmed_send_delivery_note();
```

#### `set_dispute_sla_deadline()` -- Invoice dispute SLA

```sql
CREATE OR REPLACE FUNCTION set_dispute_sla_deadline()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sla_deadline IS NULL THEN
    NEW.sla_deadline := NOW() + INTERVAL '48 hours';
  END IF;

  UPDATE invoices
  SET status = 'disputed',
      dispute_reason = NEW.dispute_reason::TEXT,
      disputed_at = NOW(),
      updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_dispute_sla_deadline
  BEFORE INSERT ON invoice_disputes
  FOR EACH ROW
  EXECUTE FUNCTION set_dispute_sla_deadline();
```

### 5.3 State Machine: `validate_state_transition()`

```sql
CREATE OR REPLACE FUNCTION public.validate_state_transition(
  entity_type TEXT, old_status TEXT, new_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF old_status = new_status THEN RETURN TRUE; END IF;

  RETURN CASE entity_type

    -- quote_request (matches quote_request_status enum)
    WHEN 'quote_request' THEN
      CASE old_status
        WHEN 'draft'        THEN new_status IN ('submitted', 'withdrawn', 'cancelled')
        WHEN 'submitted'    THEN new_status IN ('under_review', 'withdrawn', 'cancelled')
        WHEN 'under_review' THEN new_status IN ('sourcing', 'on_hold', 'rejected', 'cancelled')
        WHEN 'sourcing'     THEN new_status IN ('quote_ready', 'on_hold', 'cancelled')
        WHEN 'quote_ready'  THEN FALSE
        WHEN 'on_hold'      THEN new_status IN ('under_review', 'sourcing', 'cancelled')
        WHEN 'rejected'     THEN FALSE
        WHEN 'withdrawn'    THEN FALSE
        WHEN 'cancelled'    THEN FALSE
        ELSE FALSE
      END

    -- quote (matches quote_status enum)
    WHEN 'quote' THEN
      CASE old_status
        WHEN 'draft'            THEN new_status IN ('internal_review', 'cancelled')
        WHEN 'internal_review'  THEN new_status IN ('pending_approval', 'draft', 'cancelled')
        WHEN 'pending_approval' THEN new_status IN ('approved', 'draft', 'cancelled')
        WHEN 'approved'         THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent'             THEN new_status IN ('viewed', 'negotiating', 'accepted', 'declined', 'expired')
        WHEN 'viewed'           THEN new_status IN ('negotiating', 'accepted', 'declined', 'expired')
        WHEN 'negotiating'      THEN new_status IN ('revised', 'accepted', 'declined', 'cancelled')
        WHEN 'revised'          THEN new_status IN ('internal_review', 'sent', 'cancelled')
        WHEN 'accepted'         THEN FALSE
        WHEN 'declined'         THEN new_status IN ('requires_re_quote')
        WHEN 'expired'          THEN new_status IN ('requires_re_quote')
        WHEN 'requires_re_quote' THEN new_status IN ('draft')
        WHEN 'cancelled'        THEN FALSE
        ELSE FALSE
      END

    -- order (matches order_status enum)
    WHEN 'order' THEN
      CASE old_status
        WHEN 'confirmed'              THEN new_status IN ('processing', 'on_hold', 'cancellation_requested', 'cancelled')
        WHEN 'processing'             THEN new_status IN ('partially_fulfilled', 'fulfilled', 'on_hold', 'back_ordered', 'cancellation_requested')
        WHEN 'partially_fulfilled'    THEN new_status IN ('fulfilled', 'on_hold', 'back_ordered')
        WHEN 'fulfilled'              THEN new_status IN ('completed')
        WHEN 'completed'              THEN FALSE
        WHEN 'on_hold'                THEN new_status IN ('confirmed', 'processing', 'cancelled')
        WHEN 'cancellation_requested' THEN new_status IN ('cancelled', 'processing')
        WHEN 'back_ordered'           THEN new_status IN ('processing', 'on_hold', 'cancelled')
        WHEN 'cancelled'              THEN FALSE
        ELSE FALSE
      END

    -- supplier_po (matches supplier_po_status enum)
    WHEN 'supplier_po' THEN
      CASE old_status
        WHEN 'draft'              THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent'               THEN new_status IN ('confirmed', 'rejected', 'cancelled')
        WHEN 'confirmed'          THEN new_status IN ('in_production', 'shipped', 'cancelled')
        WHEN 'in_production'      THEN new_status IN ('shipped', 'cancelled')
        WHEN 'shipped'            THEN new_status IN ('partially_received', 'received')
        WHEN 'partially_received' THEN new_status IN ('received')
        WHEN 'received'           THEN new_status IN ('inspected')
        WHEN 'inspected'          THEN new_status IN ('closed', 'received')
        WHEN 'closed'             THEN FALSE
        WHEN 'rejected'           THEN FALSE
        WHEN 'cancelled'          THEN FALSE
        ELSE FALSE
      END

    -- delivery (matches delivery_status enum)
    WHEN 'delivery' THEN
      CASE old_status
        WHEN 'scheduled'           THEN new_status IN ('picking_loading', 'cancelled')
        WHEN 'picking_loading'     THEN new_status IN ('dispatched', 'cancelled')
        WHEN 'dispatched'          THEN new_status IN ('in_transit')
        WHEN 'in_transit'          THEN new_status IN ('at_site', 'failed')
        WHEN 'at_site'             THEN new_status IN ('delivered', 'partially_delivered', 'returned', 'failed')
        WHEN 'delivered'           THEN FALSE
        WHEN 'partially_delivered' THEN new_status IN ('rescheduled')
        WHEN 'failed'              THEN new_status IN ('rescheduled')
        WHEN 'rescheduled'         THEN new_status IN ('scheduled')
        WHEN 'returned'            THEN FALSE
        WHEN 'cancelled'           THEN FALSE
        ELSE FALSE
      END

    -- invoice (matches invoice_status enum)
    WHEN 'invoice' THEN
      CASE old_status
        WHEN 'draft'          THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent'           THEN new_status IN ('viewed', 'partially_paid', 'paid', 'overdue', 'disputed', 'cancelled')
        WHEN 'viewed'         THEN new_status IN ('partially_paid', 'paid', 'overdue', 'disputed')
        WHEN 'partially_paid' THEN new_status IN ('paid', 'overdue', 'disputed')
        WHEN 'overdue'        THEN new_status IN ('partially_paid', 'paid', 'collections', 'disputed', 'written_off')
        WHEN 'collections'    THEN new_status IN ('partially_paid', 'paid', 'disputed', 'written_off')
        WHEN 'disputed'       THEN new_status IN ('sent', 'adjusted', 'written_off')
        WHEN 'adjusted'       THEN new_status IN ('sent', 'partially_paid', 'paid')
        WHEN 'paid'           THEN FALSE
        WHEN 'cancelled'      THEN FALSE
        WHEN 'written_off'    THEN FALSE
        ELSE FALSE
      END

    -- payment (matches payment_status enum)
    WHEN 'payment' THEN
      CASE old_status
        WHEN 'expected'          THEN new_status IN ('received')
        WHEN 'received'          THEN new_status IN ('matched', 'unmatched')
        WHEN 'matched'           THEN new_status IN ('fully_applied', 'partially_applied', 'overpayment')
        WHEN 'unmatched'         THEN new_status IN ('matched')
        WHEN 'partially_applied' THEN new_status IN ('fully_applied')
        WHEN 'overpayment'       THEN new_status IN ('fully_applied', 'refunded')
        WHEN 'fully_applied'     THEN FALSE
        WHEN 'bounced'           THEN FALSE
        WHEN 'refunded'          THEN FALSE
        ELSE FALSE
      END

    ELSE
      RAISE EXCEPTION 'Unknown entity type: %', entity_type;
  END CASE;
END;
$$;
```

#### Enforcement Trigger

```sql
CREATE OR REPLACE FUNCTION public.enforce_state_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_entity_type TEXT;
BEGIN
  v_entity_type := CASE TG_TABLE_NAME
    WHEN 'quote_requests'  THEN 'quote_request'
    WHEN 'quotes'          THEN 'quote'
    WHEN 'orders'          THEN 'order'
    WHEN 'supplier_pos'    THEN 'supplier_po'
    WHEN 'deliveries'      THEN 'delivery'
    WHEN 'invoices'        THEN 'invoice'
    WHEN 'payments'        THEN 'payment'
    ELSE TG_TABLE_NAME
  END;

  IF NOT public.validate_state_transition(v_entity_type, OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid % status transition: % -> %', v_entity_type, OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quote_requests_state BEFORE UPDATE OF status ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_quotes_state BEFORE UPDATE OF status ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_orders_state BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_supplier_pos_state BEFORE UPDATE OF status ON public.supplier_pos FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_deliveries_state BEFORE UPDATE OF status ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_invoices_state BEFORE UPDATE OF status ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_payments_state BEFORE UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
```


---

## 6. SERVER FUNCTIONS (COMPLETE LIST)

All server functions use `createServerFn` from TanStack Start. Input validated with Zod. Auth enforced via `getSession()` + role check. Every mutation logs to `audit_log`.

### Auth (5 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `sendOTP` | POST | `{ phone, method: 'whatsapp'\|'sms' }` | `{ success, expiresIn }` | none | WhatsApp/SMS via carrier-routed provider |
| `verifyOTP` | POST | `{ phone, code }` | `{ session, user }` | none | Creates/returns Supabase session |
| `createAccount` | POST | `{ phone, company, contactName }` | `{ customerId, userId }` | none | Creates `customers` + `auth.users` records |
| `claimAccount` | POST | `{ phone, otp }` | `{ customerId, claimed }` | authenticated | Links `auth.users` to existing customer |
| `signOut` | POST | `{}` | `{ success }` | authenticated | Clears SSO cookie, revokes session |

### Portal Customer (20 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getCustomerDashboard` | GET | `{}` | `{ activeOrders, pendingQuotes, openInvoices, recentActivity }` | customer | none |
| `getCustomerOrders` | GET | `{ status?, page, limit, dateRange? }` | `{ orders[], total }` | customer | none |
| `getCustomerOrderDetail` | GET | `{ orderId }` | `{ order, timeline, documents }` | customer (owner) | none |
| `getCustomerQuotes` | GET | `{ status?, page, limit }` | `{ quotes[], total }` | customer | none |
| `acceptQuote` | POST | `{ quoteId }` | `{ orderId, status }` | customer (owner) | Insert order, update quote, notify sales |
| `rejectQuote` | POST | `{ quoteId, reason? }` | `{ success }` | customer (owner) | Update quote, notify sales |
| `getCustomerInvoices` | GET | `{ status?, page, limit }` | `{ invoices[], totalOutstanding }` | customer | none |
| `downloadInvoicePDF` | GET | `{ invoiceId }` | `{ url }` (signed R2 URL) | customer (owner) | Log download |
| `getCustomerProfile` | GET | `{}` | `{ company, contacts, addresses }` | customer | none |
| `updateCustomerProfile` | POST | `{ companyName?, phone?, addresses? }` | `{ success }` | customer | Update customer, audit log |
| `submitQuoteRequest` | POST | `{ items, deliveryAddressId, deliveryDate, notes?, attachments, projectId? }` | `{ requestId, reference }` | customer | Creates RFQ, notifies sales |
| `submitCounterOffer` | POST | `{ quoteId, counterType, lineItems?, totalDiscount?, notes? }` | `{ quoteVersionId }` | customer | Creates quote version, notifies sales |
| `submitPartialResponse` | POST | `{ quoteId, lineResponses[] }` | `{ success }` | customer | Updates quote line statuses |
| `saveDraft` | POST | `{ items, deliveryAddressId?, notes? }` | `{ draftId }` | customer | Upserts draft |
| `submitReorder` | POST | `{ previousOrderId, adjustments? }` | `{ rfqId }` | customer | Clone from previous order |
| `getCustomerStatements` | GET | `{ period }` | `{ statement, downloadUrl }` | customer | none |
| `submitSupportTicket` | POST | `{ subject, category, message, orderId?, attachments? }` | `{ ticketId }` | customer | Creates ticket, notifies support |
| `replySupportTicket` | POST | `{ ticketId, message, attachments? }` | `{ responseId }` | customer | Adds reply |
| `getNotifications` | GET | `{ page, limit }` | `{ notifications[], unread }` | authenticated | none |
| `markNotificationRead` | PATCH | `{ notificationId }` | `{ success }` | authenticated | Updates read status |
| `markAllNotificationsRead` | PATCH | `{}` | `{ success }` | authenticated | Bulk update |
| `inviteTeamMember` | POST | `{ phone, role }` | `{ inviteId }` | customer (owner) | Sends invite via WhatsApp/SMS |
| `removeTeamMember` | DELETE | `{ memberId }` | `{ success }` | customer (owner) | Removes membership |
| `changeTeamMemberRole` | PATCH | `{ memberId, newRole }` | `{ success }` | customer (owner) | Updates role |
| `parseUploadedFile` | POST | `{ fileUrl, fileType }` | `{ parsedItems[] }` | customer | Reads + parses R2 file |
| `parseWithAI` | POST | `{ text }` | `{ parsedItems[] }` | customer | AI extraction pipeline |
| `addToQuoteDraft` | POST | `{ productId, quantity, unit }` | `{ draftId, itemId }` | customer | Upserts draft line |
| `updateNotificationPreferences` | PATCH | `{ preferences[] }` | `{ success }` | customer | Updates settings |
| `getConversationHistory` | GET | `{ page, limit }` | `{ conversations[] }` | customer | none |
| `exportMyData` | POST | `{}` | `{ jobId }` | customer | Queues async export |
| `requestAccountDeletion` | POST | `{}` | `{ gracePeriodEndsAt }` | customer | Starts 30-day grace |
| `cancelAccountDeletion` | POST | `{}` | `{ success }` | customer | Cancels pending deletion |
| `confirmDropShipDelivery` | POST | `{ deliveryId }` | `{ success, invoiceId? }` | customer (owner) | Update drop_ship_pod, transition delivery to delivered, trigger invoice |
| `disputeDropShipDelivery` | POST | `{ deliveryId, reason, photoUrls? }` | `{ success, ticketId }` | customer (owner) | Update drop_ship_pod, create support ticket, notify ops |

### Portal Supplier (9 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getSupplierDashboard` | GET | `{}` | `{ pendingPOs, activeDeliveries, openPayments, recentActivity }` | supplier | none |
| `getSupplierPOs` | GET | `{ status?, page, limit }` | `{ purchaseOrders[], total }` | supplier | none |
| `confirmPO` | POST | `{ poId, confirmedDate, notes? }` | `{ success }` | supplier (owner) | Update PO status, notify procurement |
| `rejectPO` | POST | `{ poId, reason }` | `{ success }` | supplier | Updates PO, notifies procurement |
| `uploadDeliveryNote` | POST | `{ poId, file, deliveryDate, qty }` | `{ deliveryNoteId }` | supplier (owner) | Upload to R2, notify warehouse |
| `getSupplierPayments` | GET | `{ status?, page, limit }` | `{ payments[], total }` | supplier | none |
| `updateSupplierStock` | PATCH | `{ productId, quantity?, price? }` | `{ success }` | supplier | Updates supplier product record |
| `uploadCatalog` | POST | `{ fileUrl, fileType }` | `{ uploadId, status: 'processing' }` | supplier | Queues async AI parsing |
| `submitSupplierInvoice` | POST | `{ poId, invoiceNumber, amount, taxAmount, fileUrl }` | `{ invoiceId }` | supplier | Creates invoice, notifies finance |
| `bulkUpdatePrices` | POST | `{ fileUrl }` | `{ updatedCount, errors[] }` | supplier | Batch updates product prices |
| `getSupplierProducts` | GET | `{ page, limit, search? }` | `{ products[], total }` | supplier | none |
| `getSupplierAnalytics` | GET | `{ period }` | `{ metrics }` | supplier | none |
| `getSupplierPriceHistory` | GET | `{ productId }` | `{ history[] }` | supplier | none |
| `getSupplierUploadHistory` | GET | `{ page, limit }` | `{ uploads[] }` | supplier | none |

### Internal Sales (14 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getRFQQueue` | GET | `{ status?, assignedTo?, page, limit }` | `{ rfqs[], total, avgResponseTime }` | sales | none |
| `getRFQDetail` | GET | `{ rfqId }` | `{ rfq, customer, history, aiSuggestion? }` | sales | none |
| `createQuote` | POST | `{ rfqId, lines[], validUntil, terms?, notes? }` | `{ quoteId }` | sales | Insert quote, update RFQ, notify customer |
| `getCustomerList` | GET | `{ search?, segment?, page, limit }` | `{ customers[], total }` | sales | none |
| `getCustomerCreditInfo` | GET | `{ customerId }` | `{ creditLimit, currentExposure, paymentHistory, riskScore }` | sales | none |
| `addCustomer` | POST | `{ phone, companyName, contactName, notes? }` | `{ customerId }` | sales | Creates customer record |
| `requestClarification` | POST | `{ rfqId, questions[] }` | `{ success }` | sales | Sends to customer via portal/WhatsApp |
| `declineRFQ` | POST | `{ rfqId, reason }` | `{ success }` | sales | Updates RFQ, notifies customer |
| `addInternalNote` | POST | `{ entityType, entityId, note }` | `{ noteId }` | internal | Creates note record |
| `requestApproval` | POST | `{ quoteId, approverRole }` | `{ approvalId }` | sales | Creates approval, notifies approver |
| `approveQuote` | POST | `{ approvalId, notes? }` | `{ success }` | sales_manager+ | Advances quote to approved |
| `markAsWon` | POST | `{ quoteId, notes? }` | `{ orderId }` | sales | Converts to order |
| `markAsLost` | POST | `{ quoteId, lossReason, competitorName?, intelligence? }` | `{ success }` | sales | Logs competitive intelligence |
| `getSalesPipeline` | GET | `{ filters? }` | `{ stages[] }` | sales | none |
| `getCustomer360` | GET | `{ customerId }` | `{ customer, contacts, quotes, orders, financials, activity }` | sales | none |
| `getQuoteBuilderData` | GET | `{ rfqId }` | `{ rfq, customerCredit, suggestedProducts, recentPrices }` | sales | none |
| `saveQuoteDraft` | PATCH | `{ quoteId, lineItems[], terms }` | `{ success }` | sales | Updates draft in-place |
| `previewQuotePDF` | GET | `{ quoteId }` | `{ pdfUrl }` | sales | Generates temp PDF |
| `getActivityFeed` | GET | `{ filters?, page, limit }` | `{ activities[] }` | internal | none |
| `reassignRFQ` | POST | `{ rfqId, toUserId, reason? }` | `{ success }` | sales_manager | Reassigns, notifies, audit log |
| `convertQuoteToOrder` | POST | `{ quoteId, poNumber? }` | `{ orderId }` | sales | Full downstream creation |
| `getSalesAnalytics` | GET | `{ period, groupBy }` | `{ revenue, orderCount, avgOrderValue, topProducts, topCustomers }` | sales_manager | none |

### Internal Procurement (5 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getProcurementQueue` | GET | `{ status?, page, limit }` | `{ items[], total }` | procurement | none |
| `createPurchaseOrder` | POST | `{ supplierId, lines[], deliveryDate, terms? }` | `{ poId }` | procurement | Creates PO, notifies supplier |
| `getSupplierDirectory` | GET | `{ search?, category?, page, limit }` | `{ suppliers[], total }` | procurement | none |
| `comparePricing` | GET | `{ productId, qty }` | `{ comparisons[] }` | procurement | none |
| `sendSupplierInquiry` | POST | `{ supplierIds[], productIds[], deadline }` | `{ inquiryId }` | procurement | Notifies suppliers via portal/WhatsApp |
| `trackInquiryResponses` | GET | `{ inquiryId }` | `{ responses[] }` | procurement | none |
| `getSupplierScorecard` | GET | `{ supplierId }` | `{ scorecard }` | procurement | none |
| `getPODetail` | GET | `{ poId }` | `{ po, items, timeline }` | procurement | none |
| `getPOList` | GET | `{ filters?, page, limit }` | `{ pos[], total }` | procurement | none |

### Internal Orders (4 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getOrderBoard` | GET | `{ status?[], assignedTo?, page, limit }` | `{ orders[], statusCounts }` | operations | none |
| `getOrderDetail` | GET | `{ orderId }` | `{ order, timeline, linkedPOs, linkedInvoices }` | operations | none |
| `updateOrderStatus` | POST | `{ orderId, status, notes? }` | `{ success }` | operations | Update, timeline, notify, broadcast |
| `splitOrder` | POST | `{ orderId, splits[] }` | `{ newOrderIds[] }` | operations | Create child orders |
| `holdOrder` | POST | `{ orderId, reason }` | `{ success }` | operations | Pauses processing |
| `cancelOrder` | POST | `{ orderId, reason }` | `{ cancellationFee, creditNoteId? }` | operations | May create credit note |
| `scheduleDelivery` | POST | `{ orderId, date, timeWindow, driverId?, vehicleId? }` | `{ deliveryId }` | operations | Creates delivery, assigns resources |
| `getDeliverySchedule` | GET | `{ dateRange, warehouseId? }` | `{ schedule[] }` | operations | none |

### Internal Warehouse (7 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getWarehouseDashboard` | GET | `{ warehouseId? }` | `{ pendingReceiving, pendingPicking, pendingDispatch, capacityUtilization }` | warehouse | none |
| `receiveGoods` | POST | `{ poId, lines[], photos? }` | `{ grnId }` | warehouse | Update inventory, PO status |
| `createPickList` | POST | `{ orderId, lines[] }` | `{ pickListId }` | warehouse | Insert pick list |
| `confirmPick` | POST | `{ pickListId, lines[], notes? }` | `{ success, shortages[] }` | warehouse | Update inventory, notify dispatch |
| `performStockCount` | POST | `{ warehouseId, counts[] }` | `{ adjustments[] }` | warehouse_manager | Insert count + adjustments |
| `getInventoryLevels` | GET | `{ warehouseId?, search?, belowReorder?, page, limit }` | `{ items[], total }` | warehouse | none |
| `putawayConfirm` | POST | `{ locationBarcode, itemBarcode, quantity }` | `{ success }` | warehouse | Updates location records |
| `loadVerification` | POST | `{ routeId, scanResults[], weight, photos[], driverSignature, loaderSignature }` | `{ verificationId, clearance }` | warehouse | Creates load verification |
| `generateBOL` | POST | `{ routeId }` | `{ bolPdfUrl }` | warehouse | Generates BOL PDF |
| `submitCycleCountApproval` | POST | `{ countId, decision, reason? }` | `{ success }` | warehouse_manager | Approves/requests recount |
| `processReturn` | POST | `{ returnId, inspectionResult, notes, photos? }` | `{ success }` | warehouse | Updates return, adjusts inventory |
| `disposeDamagedGoods` | POST | `{ inventoryId, quantity, reason, approvedBy }` | `{ adjustmentId }` | warehouse_manager | Writes off stock |
| `createTransfer` | POST | `{ productId, fromWarehouseId, toWarehouseId, quantity, reason }` | `{ transferId }` | warehouse | Creates inter-warehouse transfer |
| `batchReceiveGoods` | POST | `{ warehouseId, receivals[] }` | `{ batchId, grnIds[], totalItemsReceived }` | warehouse | Batch receive multiple POs in one transaction |

### Internal Finance (10 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getFinanceDashboard` | GET | `{}` | `{ receivables, payables, cashPosition, overdueAR, overdueAP, monthlyRevenue }` | finance | none |
| `createInvoice` | POST | `{ orderId, lines[], dueDate, currency }` | `{ invoiceId, etaInvoiceId? }` | accountant | Generate PDF, submit ETA, notify customer |
| `recordPayment` | POST | `{ invoiceId, amount, method, reference, date, bankAccount? }` | `{ paymentId, remainingBalance }` | accountant | Update invoice, credit exposure |
| `recordCheque` | POST | `{ invoiceId, chequeNumber, bankName, amount, maturityDate, drawerName }` | `{ chequeId }` | accountant | Schedule maturity check |
| `getARAgingReport` | GET | `{ asOfDate? }` | `{ current, days30, days60, days90, days90plus, details[] }` | finance | none |
| `getAPAgingReport` | GET | `{ asOfDate? }` | `{ current, days30, days60, days90, details[] }` | finance | none |
| `createSupplierPayment` | POST | `{ supplierId, poIds[], amount, method, reference }` | `{ paymentId }` | finance_manager | Update PO payment, notify supplier |
| `generateForm41` | POST | `{ quarter, year }` | `{ reportId, downloadUrl }` | finance_manager | Generate PDF to R2 |
| `reconcileBankStatement` | POST | `{ bankAccountId, entries[] }` | `{ matched, unmatched[] }` | accountant | Update reconciliation |
| `getCashFlowForecast` | GET | `{ months }` | `{ forecast[] }` | finance_manager | none |
| `sendInvoice` | POST | `{ invoiceId, channels[] }` | `{ sentVia[] }` | finance | Dispatches via channels |
| `createCreditNote` | POST | `{ invoiceId, reason, lineItems?, amount? }` | `{ creditNoteId }` | finance | Adjusts customer balance |
| `updateChequeStatus` | PATCH | `{ chequeId, status, reason? }` | `{ success }` | finance | Updates cheque tracking |
| `getInvoiceDetail` | GET | `{ invoiceId }` | `{ invoice, items, payments, timeline }` | finance | none |
| `getCreditProfile` | GET | `{ customerId }` | `{ credit, utilization, history, score }` | finance | none |
| `updateCreditLimit` | POST | `{ customerId, newLimit, reason }` | `{ success, approvalRequired? }` | finance_manager | May require approval |
| `importBankStatement` | POST | `{ fileUrl, bankAccountId }` | `{ transactionCount, autoMatchedCount }` | finance | Auto-matches payments |
| `generateProformaInvoice` | POST | `{ quoteId? or orderId? }` | `{ invoiceId, invoiceNumber, pdfUrl }` | sales, finance | Generate/regenerate proforma, create PDF |
| `generateProformaPDF` | GET | `{ invoiceId }` | `{ url }` | customer, sales, finance | On-demand PDF generation |
| `batchGenerateInvoices` | POST | `{ deliveryIds[], invoiceDate?, taxRate? }` | `{ batchId, invoices[], skipped[] }` | finance | Batch create invoices for delivered orders |
| `batchRecordPayments` | POST | `{ payments[], sourceType? }` | `{ batchId, payments[], invoicesFullyPaid[] }` | finance | Batch record multiple payments |
| `batchSendInvoices` | POST | `{ invoiceIds[], channels[] }` | `{ batchId, results[], totalSent }` | finance | Batch send invoices via channels |
| `batchUpdateChequeStatus` | POST | `{ updates[] }` | `{ batchId, updated[], customersOnCreditHold[] }` | finance | Batch update cheque statuses |
| `createDispute` | POST | `{ invoiceId, disputeReason, description, evidenceUrls? }` | `{ disputeId }` | customer, finance | Open dispute, set 48h SLA |
| `assignDispute` | POST | `{ disputeId, assignedTo }` | `{ success }` | finance_manager | Assign dispute to team member |
| `resolveDispute` | POST | `{ disputeId, resolutionType, resolutionNotes }` | `{ success }` | finance | Close dispute with resolution |
| `escalateDispute` | POST | `{ disputeId, escalatedTo, notes }` | `{ success }` | finance | Escalate to finance head |

### Internal Dispatch (5 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getDispatchBoard` | GET | `{ date?, status? }` | `{ shipments[], driverAvailability[] }` | dispatch | none |
| `createShipment` | POST | `{ orderId, driverId, vehicleId, stops[], scheduledDate }` | `{ shipmentId }` | dispatch | Assign driver, notify |
| `optimizeRoute` | POST | `{ shipmentId, stops[] }` | `{ optimizedStops[], estimatedDuration, estimatedDistance }` | dispatch | Call routing API |
| `reassignDriver` | POST | `{ shipmentId, newDriverId, reason }` | `{ success }` | dispatch | Notify old + new driver |
| `getDeliveryAnalytics` | GET | `{ period }` | `{ onTimeRate, avgDeliveryTime, costPerDelivery, driverPerformance[] }` | dispatch | none |
| `getDriverLocations` | GET | `{}` | `{ drivers[] }` | dispatch | Initial load, then Realtime |
| `confirmDeliveryPOD` | POST | `{ deliveryId, decision, reason? }` | `{ success }` | dispatch | Updates POD status |
| `flagDeliveryIssue` | POST | `{ deliveryId, issueType, description, photos? }` | `{ issueId }` | dispatch | Creates issue, notifies ops |
| `getDriverList` | GET | `{ filters? }` | `{ drivers[], total }` | dispatch | none |
| `publishRoutes` | POST | `{ routeIds[] }` | `{ success, notifiedDrivers }` | dispatch | Publishes, notifies drivers |
| `processWhatsAppPOD` | POST | `{ from, mediaUrls[], messageId, messageText? }` | `{ matched, deliveryId?, podId? }` | webhook | Download media to R2, match to delivery, send customer confirmation |
| `manualMatchDropShipPOD` | POST | `{ webhookEventId, deliveryId }` | `{ success, podId }` | logistics | Move photos from unmatched webhook to drop_ship_pod |
| `generateBrandedDeliveryNote` | POST | `{ supplierPoId }` | `{ pdfUrl }` | procurement | Generate anonymized delivery note PDF |

### Internal Support (4 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getTicketQueue` | GET | `{ status?, priority?, page, limit }` | `{ tickets[], total, avgResolutionTime }` | support | none |
| `respondToTicket` | POST | `{ ticketId, message, internal, status? }` | `{ success }` | support | Insert message, notify customer |
| `escalateTicket` | POST | `{ ticketId, toRole, reason }` | `{ success }` | support | Notify target role |
| `getWhatsAppInbox` | GET | `{ page, limit }` | `{ conversations[] }` | support | none |
| `sendWhatsAppReply` | POST | `{ conversationId, message, attachments? }` | `{ messageId }` | support | Sends WhatsApp message |
| `createDamageClaim` | POST | `{ orderId, deliveryId, tier, items[], photos[], description }` | `{ claimId }` | support | Creates claim |
| `createRMA` | POST | `{ orderId, items[], reason, photos? }` | `{ rmaId }` | support | Creates RMA, notifies warehouse |

### Internal HR (6 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getEmployeeDirectory` | GET | `{ department?, search?, page, limit }` | `{ employees[], total }` | hr | none |
| `updateEmployeeRecord` | POST | `{ employeeId, fields }` | `{ success }` | hr_manager | Audit log |
| `getDriverCompliance` | GET | `{ filters? }` | `{ drivers[], expiringCount }` | hr | none |
| `getLeaveRequests` | GET | `{ filters?, page, limit }` | `{ requests[], total }` | hr | none |
| `submitLeaveRequest` | POST | `{ employeeId, leaveType, startDate, endDate, reason? }` | `{ requestId }` | authenticated | Notifies manager |
| `approveLeaveRequest` | POST | `{ requestId, decision, notes? }` | `{ success }` | manager | Notifies employee |
| `getAttendance` | GET | `{ employeeId?, dateRange }` | `{ records[] }` | hr | none |
| `clockInOut` | POST | `{ type, lat, lng }` | `{ attendanceId }` | authenticated | Creates attendance with geolocation |

### Internal Admin (5 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getSystemConfig` | GET | `{}` | `{ config }` | admin | none |
| `updateSystemConfig` | POST | `{ key, value, reason }` | `{ success }` | admin | Audit log, broadcast change |
| `manageUserRoles` | POST | `{ userId, roles[], action }` | `{ success }` | admin | Invalidate session cache |
| `getUserList` | GET | `{ filters?, page, limit }` | `{ users[], total }` | admin | none |
| `getAuditLog` | GET | `{ entityType?, entityId?, userId?, dateRange, page, limit }` | `{ entries[], total }` | admin | none |
| `updateMarginRules` | PATCH | `{ rules[] }` | `{ success }` | admin | Updates margin rules |
| `updateApprovalThresholds` | PATCH | `{ thresholds[] }` | `{ success }` | admin | Updates thresholds |
| `updateHolidayCalendar` | PATCH | `{ year, holidays[] }` | `{ success }` | admin | Updates calendar |

### Internal AI (2 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `askAI` | POST | `{ prompt, context, model? }` | `{ response, confidence, sources[] }` | any internal | Log to ai_interactions, route by complexity |
| `getAISuggestion` | GET | `{ type, entityId }` | `{ suggestion, reasoning, confidence }` | any internal | Cache 15min |

### CEO (10 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getCEODashboard` | GET | `{}` | `{ kpis, alerts, trends }` | ceo | Reads materialized views |
| `getCEOFinancials` | GET | `{ period, comparison? }` | `{ revenue, costs, margin, cashFlow, chartData }` | ceo | Reads materialized views |
| `getCEOOperations` | GET | `{ period }` | `{ orderVolume, fulfillmentRate, avgCycleTime, bottlenecks }` | ceo | Reads materialized views |
| `getCEOPipeline` | GET | `{}` | `{ totalValue, byStage, winRate, avgDealSize, topDeals }` | ceo | Reads materialized views |
| `getCEOTeamPerformance` | GET | `{ period }` | `{ byDepartment, topPerformers, attendance }` | ceo | Reads materialized views |
| `askCEOAI` | POST | `{ question }` | `{ answer, charts?, drillDowns? }` | ceo | Always Claude, full RAG context |
| `searchEntities` | GET | `{ query, entityTypes?, limit }` | `{ results[] }` | ceo | none |
| `getEntityDetail` | GET | `{ entityType, entityId }` | `{ entity }` | ceo | none |
| `getCEOAttentionItems` | GET | `{}` | `{ items[], count }` | ceo | none |
| `getCEODigest` | GET | `{ date }` | `{ digest }` | ceo | none |
| `getCEOWeeklyInsight` | GET | `{ weekOf }` | `{ insight }` | ceo | none |
| `approveAction` | POST | `{ approvalId, decision, notes? }` | `{ success }` | ceo | Resolves approval |
| `rejectAction` | POST | `{ approvalId, reason }` | `{ success }` | ceo | Rejects with reason |
| `routeMessage` | POST | `{ recipientId, message, priority? }` | `{ messageId }` | ceo | Sends internal message |
| `exportBoardReportPDF` | POST | `{ reportType, dateRange }` | `{ pdfUrl }` | ceo | Generates PDF in R2 |
| `requestMoreInfo` | POST | `{ approvalId, questions }` | `{ success }` | ceo | Sends info request |

### Driver (14 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getDriverDashboard` | GET | `{}` | `{ activeShipment?, todayStops, completedToday, nextPrayerTime }` | driver | none |
| `getDriverRoute` | GET | `{ shipmentId }` | `{ stops, optimizedOrder, totalDistance, totalDuration, mapUrl }` | driver (assigned) | none |
| `updateDriverLocation` | POST | `{ lat, lng, heading?, speed? }` | `{ success }` | driver | Upsert + Realtime broadcast |
| `confirmPickup` | POST | `{ shipmentId, stopId, photos[], signature?, notes? }` | `{ success }` | driver (assigned) | Upload to R2, notify dispatch |
| `confirmDelivery` | POST | `{ shipmentId, stopId, photos[], signature, recipientName, notes? }` | `{ success, nextStop? }` | driver (assigned) | Upload POD, notify dispatch + customer |
| `reportIssue` | POST | `{ shipmentId, type, description, photos? }` | `{ issueId }` | driver | Notify dispatch, escalate if critical |
| `getDriverHistory` | GET | `{ page, limit, dateRange? }` | `{ deliveries[], stats }` | driver | none |
| `updateDriverAvailability` | POST | `{ available, reason?, until? }` | `{ success }` | driver | Notify dispatch if going offline during active |
| `submitDVIR` | POST | `{ vehicleId, inspectionType, items[], odometerReading, signature }` | `{ inspectionId }` | driver | Creates inspection record |
| `startShift` | POST | `{ vehicleId, inspectionId }` | `{ shiftId }` | driver | Opens shift record |
| `endShift` | POST | `{ odometerEnd, fuelLevel?, postTripInspectionId? }` | `{ shiftSummary }` | driver | Closes shift |
| `submitLoadVerification` | POST | `{ routeId, scanResults[], truckPhoto?, cargoPhoto? }` | `{ success }` | driver | Records driver-side verification |
| `recordArrival` | POST | `{ stopId, lat, lng }` | `{ success, geofenceValid }` | driver | Geofence check |
| `acknowledgeRouteChange` | POST | `{ routeId, changeId }` | `{ success }` | driver | Marks acknowledged |
| `requestRouteReorder` | POST | `{ routeId, newStopOrder[] }` | `{ success, approved }` | driver | May auto-approve |
| `registerExternalDriver` | POST | `{ phone, name, vehicleType, licenseClass, licenseNumber }` | `{ driverId, status: 'pending' }` | none | Creates pending record |
| `getJobOffers` | GET | `{}` | `{ jobs[] }` | driver (external) | none |
| `acceptJob` | POST | `{ jobId }` | `{ success }` | driver (external) | Assigns job |
| `declineJob` | POST | `{ jobId, reason? }` | `{ success }` | driver (external) | Releases to pool |
| `getDriverEarnings` | GET | `{ period }` | `{ earnings, pending, available }` | driver (external) | none |
| `requestWithdrawal` | POST | `{ amount, bankAccountId }` | `{ withdrawalId }` | driver (external) | Creates withdrawal request |
| `submitEndOfDayReport` | POST | `{ shiftId, returns?, fuelLevel?, notes? }` | `{ success }` | driver | Submits EOD report |

### Website (4 functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getPublicCatalog` | GET | `{ category?, search?, page, limit }` | `{ items[], total, hasMore }` | none | none |
| `submitRFQ` | POST | `{ companyName, contactName, email, phone, items[], notes? }` | `{ rfqId, estimatedResponse }` | none | Insert RFQ, notify sales |
| `submitContactForm` | POST | `{ name, email, phone?, subject, message }` | `{ ticketId }` | none | Insert ticket, notify support |
| `trackOrder` | GET | `{ orderId, email }` | `{ status, timeline, eta? }` | none (email match) | Log tracking lookup |

### Notification Grouping (1 function)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `createNotificationGroup` | POST | `{ tenantId, groupKey, rootEventType, rootEntityId, summaryText, summaryTextAr?, notifications[] }` | `{ groupId, notificationCount }` | internal | Batch-create grouped notifications with summary |

---

## 7. MATERIALIZED VIEWS + COMPUTED FUNCTIONS

### 7.1 `ceo_attention_items` (Refresh Every 5 Min)

Union of critical business events: bounced cheques (7 days), overdue invoices (60+ days), credit limit breaches, delivery failures (today), supplier PO rejections (7 days).

```sql
CREATE MATERIALIZED VIEW ceo_attention_items AS
-- Bounced cheques (last 7 days)
SELECT 'bounced_cheque'::TEXT AS item_type, 'cheque_tracking'::TEXT AS entity_type,
  ct.id AS entity_id, ct.tenant_id, 'critical'::TEXT AS severity,
  'Bounced cheque: ' || ct.cheque_number AS title, c.company_name AS subtitle,
  ct.amount, ct.updated_at AS created_at
FROM cheque_tracking ct JOIN customers c ON c.id = ct.customer_id
WHERE ct.status = 'bounced' AND ct.updated_at >= NOW() - INTERVAL '7 days'

UNION ALL
-- Invoices overdue > 60 days
SELECT 'overdue_invoice'::TEXT, 'invoices'::TEXT, i.id, i.tenant_id,
  CASE WHEN i.due_date < NOW() - INTERVAL '90 days' THEN 'critical' ELSE 'warning' END,
  'Overdue invoice: ' || i.invoice_number, c.company_name,
  i.total - i.paid_amount, i.due_date::TIMESTAMPTZ
FROM invoices i JOIN customers c ON c.id = i.customer_id
WHERE i.status NOT IN ('paid', 'cancelled', 'void') AND i.due_date < NOW() - INTERVAL '60 days'

UNION ALL
-- Credit limit breaches
SELECT 'credit_breach'::TEXT, 'customers'::TEXT, c.id, c.tenant_id, 'critical'::TEXT,
  'Credit limit breach: ' || c.company_name,
  'Limit: ' || c.credit_limit::TEXT || ' / Outstanding: ' || COALESCE(ar.total_outstanding, 0)::TEXT,
  COALESCE(ar.total_outstanding, 0) - c.credit_limit, NOW()
FROM customers c
LEFT JOIN LATERAL (
  SELECT SUM(total - paid_amount) AS total_outstanding FROM invoices
  WHERE customer_id = c.id AND status NOT IN ('paid', 'cancelled', 'void')
) ar ON TRUE
WHERE c.credit_limit > 0 AND COALESCE(ar.total_outstanding, 0) > c.credit_limit

UNION ALL
-- Delivery failures (today)
SELECT 'delivery_failure'::TEXT, 'deliveries'::TEXT, d.id, d.tenant_id, 'warning'::TEXT,
  'Delivery failed: ' || d.delivery_number, d.failure_reason::TEXT, d.total_amount, d.updated_at
FROM deliveries d WHERE d.status = 'failed' AND d.updated_at::DATE = CURRENT_DATE

UNION ALL
-- Supplier PO rejections (last 7 days)
SELECT 'po_rejection'::TEXT, 'supplier_pos'::TEXT, po.id, po.tenant_id, 'warning'::TEXT,
  'PO rejected: ' || po.po_number, s.company_name, po.total, po.updated_at
FROM supplier_pos po JOIN suppliers s ON s.id = po.supplier_id
WHERE po.status = 'rejected' AND po.updated_at >= NOW() - INTERVAL '7 days'

WITH NO DATA;

CREATE INDEX idx_ceo_attention_tenant_severity ON ceo_attention_items (tenant_id, severity);
CREATE INDEX idx_ceo_attention_created ON ceo_attention_items (created_at DESC);
```

### 7.2 `ap_aging_snapshot` (Refresh Daily)

```sql
CREATE MATERIALIZED VIEW ap_aging_snapshot AS
SELECT
  si.supplier_id, s.company_name AS supplier_name, si.tenant_id,
  SUM(CASE WHEN si.due_date >= CURRENT_DATE THEN si.total - si.paid_amount ELSE 0 END) AS current_amount,
  SUM(CASE WHEN si.due_date < CURRENT_DATE AND si.due_date >= CURRENT_DATE - 30 THEN si.total - si.paid_amount ELSE 0 END) AS d1_30,
  SUM(CASE WHEN si.due_date < CURRENT_DATE - 30 AND si.due_date >= CURRENT_DATE - 60 THEN si.total - si.paid_amount ELSE 0 END) AS d31_60,
  SUM(CASE WHEN si.due_date < CURRENT_DATE - 60 AND si.due_date >= CURRENT_DATE - 90 THEN si.total - si.paid_amount ELSE 0 END) AS d61_90,
  SUM(CASE WHEN si.due_date < CURRENT_DATE - 90 THEN si.total - si.paid_amount ELSE 0 END) AS d90_plus,
  SUM(si.total - si.paid_amount) AS total_outstanding,
  CURRENT_DATE AS as_of_date
FROM supplier_invoices si JOIN suppliers s ON s.id = si.supplier_id
WHERE si.status NOT IN ('paid', 'cancelled')
GROUP BY si.supplier_id, s.company_name, si.tenant_id
WITH NO DATA;

CREATE INDEX idx_ap_aging_tenant ON ap_aging_snapshot (tenant_id);
CREATE INDEX idx_ap_aging_supplier ON ap_aging_snapshot (supplier_id);
```

### 7.3 `calculate_payment_behavior_score()`

Invoice-weighted, recency-biased timeliness score (0-100). Per FRONTEND.md BL.6.

```sql
CREATE OR REPLACE FUNCTION calculate_payment_behavior_score(p_customer_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_score DECIMAL(15,6) := 0; v_total_weight DECIMAL(15,6) := 0;
  v_invoice RECORD; v_timeliness_score DECIMAL(5,2);
  v_amount_weight DECIMAL(4,2); v_recency_weight DECIMAL(4,2);
  v_combined_weight DECIMAL(8,4); v_days_diff INTEGER; v_months_ago DECIMAL(5,1);
BEGIN
  FOR v_invoice IN
    SELECT id, total, due_date, paid_at, status, created_at FROM invoices
    WHERE customer_id = p_customer_id AND status NOT IN ('draft', 'cancelled')
      AND created_at >= NOW() - INTERVAL '24 months' ORDER BY created_at DESC
  LOOP
    v_amount_weight := CASE WHEN v_invoice.total >= 500000 THEN 3.0 WHEN v_invoice.total >= 100000 THEN 2.0 ELSE 1.0 END;
    v_months_ago := EXTRACT(EPOCH FROM (NOW() - v_invoice.created_at)) / (30.44 * 86400);
    v_recency_weight := CASE WHEN v_months_ago <= 3 THEN 3.0 WHEN v_months_ago <= 6 THEN 2.0 WHEN v_months_ago <= 12 THEN 1.0 ELSE 0.5 END;
    v_combined_weight := v_amount_weight * v_recency_weight;

    IF v_invoice.status IN ('written_off') THEN v_timeliness_score := 0;
    ELSIF v_invoice.paid_at IS NULL AND v_invoice.status NOT IN ('paid', 'adjusted') THEN
      v_days_diff := (CURRENT_DATE - v_invoice.due_date);
      v_timeliness_score := CASE WHEN v_days_diff <= 0 THEN 90 WHEN v_days_diff <= 7 THEN 85 WHEN v_days_diff <= 15 THEN 70 WHEN v_days_diff <= 30 THEN 50 WHEN v_days_diff <= 60 THEN 30 WHEN v_days_diff <= 90 THEN 15 ELSE 5 END;
    ELSE
      v_days_diff := (v_invoice.paid_at::DATE - v_invoice.due_date);
      v_timeliness_score := CASE WHEN v_days_diff <= -15 THEN 100 WHEN v_days_diff <= -1 THEN 95 WHEN v_days_diff <= 0 THEN 90 WHEN v_days_diff <= 7 THEN 85 WHEN v_days_diff <= 15 THEN 70 WHEN v_days_diff <= 30 THEN 50 WHEN v_days_diff <= 60 THEN 30 WHEN v_days_diff <= 90 THEN 15 ELSE 5 END;
    END IF;

    v_score := v_score + (v_timeliness_score * v_combined_weight);
    v_total_weight := v_total_weight + v_combined_weight;
  END LOOP;

  IF v_total_weight = 0 THEN RETURN 50.00; END IF;
  RETURN ROUND(v_score / v_total_weight, 2);
END;
$$;
```

### 7.4 `calculate_customer_tier_score()`

Composite of 5 dimensions (0-100): Order count (20%) + Spend (20%) + Payment timeliness (30%) + Tenure (15%) + Consistency (15%).

```sql
CREATE OR REPLACE FUNCTION calculate_customer_tier_score(p_customer_id UUID)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_order_count INTEGER; v_cumulative_spend DECIMAL(15,2); v_payment_score DECIMAL(5,2);
  v_months_active DECIMAL(5,1); v_consistency_score DECIMAL(5,2);
  v_order_count_score DECIMAL(5,2); v_spend_score DECIMAL(5,2); v_tenure_score DECIMAL(5,2);
  v_months_with_orders INTEGER; v_total_months INTEGER;
  v_customer_created_at TIMESTAMPTZ; v_composite DECIMAL(5,2);
BEGIN
  SELECT created_at INTO v_customer_created_at FROM customers WHERE id = p_customer_id;
  IF v_customer_created_at IS NULL THEN RETURN 0; END IF;

  SELECT COUNT(*), COALESCE(SUM(total), 0) INTO v_order_count, v_cumulative_spend
  FROM orders WHERE customer_id = p_customer_id AND status NOT IN ('cancelled', 'cancellation_requested');

  v_order_count_score := LEAST(100, (v_order_count::DECIMAL / 5.0) * 100);

  v_spend_score := CASE
    WHEN v_cumulative_spend >= 5000000 THEN 100
    WHEN v_cumulative_spend >= 2000000 THEN 80 + ((v_cumulative_spend - 2000000) / 3000000.0) * 20
    WHEN v_cumulative_spend >= 500000 THEN 50 + ((v_cumulative_spend - 500000) / 1500000.0) * 30
    ELSE (v_cumulative_spend / 500000.0) * 50
  END;

  v_payment_score := calculate_payment_behavior_score(p_customer_id);

  v_months_active := EXTRACT(EPOCH FROM (NOW() - v_customer_created_at)) / (30.44 * 86400);
  v_tenure_score := CASE
    WHEN v_months_active >= 24 THEN 100
    WHEN v_months_active >= 12 THEN 70 + ((v_months_active - 12) / 12.0) * 30
    WHEN v_months_active >= 3 THEN 30 + ((v_months_active - 3) / 9.0) * 40
    ELSE (v_months_active / 3.0) * 30
  END;

  v_total_months := GREATEST(1, CEIL(v_months_active));
  SELECT COUNT(DISTINCT DATE_TRUNC('month', created_at)) INTO v_months_with_orders
  FROM orders WHERE customer_id = p_customer_id AND status NOT IN ('cancelled', 'cancellation_requested')
    AND created_at >= NOW() - INTERVAL '12 months';
  v_consistency_score := LEAST(100, (v_months_with_orders::DECIMAL / LEAST(v_total_months, 12)) * 100);

  v_composite := (v_order_count_score * 0.20) + (v_spend_score * 0.20) + (v_payment_score * 0.30)
               + (v_tenure_score * 0.15) + (v_consistency_score * 0.15);
  RETURN ROUND(v_composite, 2);
END;
$$;
```

### 7.5 `calculate_available_quantity()`

```sql
CREATE OR REPLACE FUNCTION calculate_available_quantity(
  p_product_id UUID, p_warehouse_id UUID DEFAULT NULL
)
RETURNS DECIMAL(12,3)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_on_hand DECIMAL(12,3) := 0; v_reserved DECIMAL(12,3) := 0;
  v_allocated DECIMAL(12,3) := 0; v_on_hold DECIMAL(12,3) := 0;
  v_damaged DECIMAL(12,3) := 0; v_available DECIMAL(12,3);
BEGIN
  IF p_warehouse_id IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity_on_hand), 0), COALESCE(SUM(quantity_reserved), 0), COALESCE(SUM(quantity_allocated), 0)
    INTO v_on_hand, v_reserved, v_allocated
    FROM inventory WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id;

    SELECT COALESCE(SUM(quantity), 0) INTO v_on_hold FROM inventory
    WHERE product_id = p_product_id AND warehouse_id = p_warehouse_id
      AND lot_number IS NOT NULL AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE;
  ELSE
    SELECT COALESCE(SUM(quantity_on_hand), 0), COALESCE(SUM(quantity_reserved), 0), COALESCE(SUM(quantity_allocated), 0)
    INTO v_on_hand, v_reserved, v_allocated FROM inventory WHERE product_id = p_product_id;
  END IF;

  v_available := v_on_hand - v_reserved - v_allocated - v_on_hold - v_damaged;
  RETURN GREATEST(0, v_available);
END;
$$;
```

### 7.6 `calculate_ar_aging()`

```sql
CREATE OR REPLACE FUNCTION calculate_ar_aging(p_customer_id UUID)
RETURNS TABLE (
  current_amount DECIMAL(15,2), d1_30 DECIMAL(15,2), d31_60 DECIMAL(15,2),
  d61_90 DECIMAL(15,2), d90_plus DECIMAL(15,2), total_outstanding DECIMAL(15,2)
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - 30 THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 30 AND i.due_date >= CURRENT_DATE - 60 THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 60 AND i.due_date >= CURRENT_DATE - 90 THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(CASE WHEN i.due_date < CURRENT_DATE - 90 THEN i.balance_due ELSE 0 END), 0)::DECIMAL(15,2),
    COALESCE(SUM(i.balance_due), 0)::DECIMAL(15,2)
  FROM invoices i
  WHERE i.customer_id = p_customer_id AND i.status IN ('sent', 'viewed', 'partially_paid', 'overdue', 'collections', 'disputed');
END;
$$;
```

### 7.7 `recalculate_wac()`

```sql
CREATE OR REPLACE FUNCTION public.recalculate_wac(
  p_tenant_id UUID, p_product_id UUID, p_warehouse_id UUID,
  p_new_quantity DECIMAL(12,3), p_new_unit_cost DECIMAL(12,4)
)
RETURNS DECIMAL(12,4)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current record; v_new_wac DECIMAL(12,4); v_costing_method inventory_costing_method;
BEGIN
  SELECT inventory_costing_method INTO v_costing_method FROM tenants WHERE id = p_tenant_id;
  IF v_costing_method != 'wac' THEN RETURN p_new_unit_cost; END IF;

  SELECT quantity_on_hand, unit_cost INTO v_current FROM inventory
  WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND warehouse_id = p_warehouse_id FOR UPDATE;

  IF v_current IS NULL OR (v_current.quantity_on_hand + p_new_quantity) <= 0 THEN RETURN p_new_unit_cost; END IF;

  v_new_wac := ((v_current.quantity_on_hand * COALESCE(v_current.unit_cost, 0)) + (p_new_quantity * p_new_unit_cost))
    / (v_current.quantity_on_hand + p_new_quantity);

  UPDATE inventory SET unit_cost = v_new_wac, total_value = (quantity_on_hand + p_new_quantity) * v_new_wac, updated_at = NOW()
  WHERE tenant_id = p_tenant_id AND product_id = p_product_id AND warehouse_id = p_warehouse_id;

  RETURN v_new_wac;
END;
$$;
```


---

## 8. INDEXES (Deduplicated)

### 8.1 RLS-Critical Indexes (btree, single-column)

```sql
-- tenant_id on all major transactional tables
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_tenant_id ON customer_contacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_addresses_tenant_id ON addresses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects (tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_tenant_id ON credit_applications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_tenant_id ON supplier_contacts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_lists_tenant_id ON supplier_price_lists (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_tenant_id ON product_suppliers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_id ON pricing_rules (tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_prices_tenant_id ON contract_prices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_tenant_id ON quote_requests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pos_tenant_id ON supplier_pos (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_tenant_id ON supplier_inquiries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant_id ON warehouses (tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_tenant_id ON warehouse_locations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_id ON inventory (tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_id ON stock_movements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_tenant_id ON inventory_transfers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cycle_counts_tenant_id ON cycle_counts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant_id ON vehicles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant_id ON drivers (tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_tenant_id ON delivery_routes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_tenant_id ON deliveries (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_tenant_id ON credit_notes (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ar_aging_snapshots_tenant_id ON ar_aging_snapshots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_tenant_id ON supplier_invoices (tenant_id);
CREATE INDEX IF NOT EXISTS idx_returns_tenant_id ON returns (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant_id ON tickets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_tenant_id ON ai_conversations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON documents (tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvals_tenant_id ON approvals (tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_tenant_id ON system_settings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_state_history_tenant_id ON state_history (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON user_profiles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles (tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees (tenant_id);

-- Entity-specific FK indexes for RLS WHERE clauses
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders (created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes (customer_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_customer_id ON quote_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pos_supplier_id ON supplier_pos (supplier_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_id ON deliveries (driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries (order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_requester_user_id ON tickets (requester_user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_id ON tickets (customer_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_returns_customer_id ON returns (customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_customer_id ON credit_notes (customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_aging_snapshots_customer_id ON ar_aging_snapshots (customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects (customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_customer_id ON credit_applications (customer_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);

-- Audit and operations table indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_tenant ON vehicle_inspections (tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_driver ON vehicle_inspections (driver_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle ON vehicle_inspections (vehicle_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_tenant ON driver_shifts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_driver_date ON driver_shifts (driver_id, shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_status ON driver_shifts (tenant_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_driver_jobs_tenant ON driver_jobs (tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_jobs_status ON driver_jobs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_jobs_driver ON driver_jobs (offered_to_driver_id) WHERE offered_to_driver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_jobs_available ON driver_jobs (tenant_id, expires_at) WHERE status = 'available';
CREATE INDEX IF NOT EXISTS idx_driver_earnings_tenant ON driver_earnings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver ON driver_earnings (driver_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_status ON driver_earnings (tenant_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_load_verifications_tenant ON load_verifications (tenant_id);
CREATE INDEX IF NOT EXISTS idx_load_verifications_route ON load_verifications (delivery_route_id);
CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_tenant ON company_bank_accounts (tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_tenant ON delivery_zones (tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones (tenant_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_tenant ON supplier_invoice_items (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice ON supplier_invoice_items (supplier_invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_match ON supplier_invoice_items (tenant_id, match_status) WHERE match_status IN ('variance_exceeds', 'unmatched');
CREATE INDEX IF NOT EXISTS idx_source_inventory_tenant ON source_inventory (tenant_id);
CREATE INDEX IF NOT EXISTS idx_source_inventory_product ON source_inventory (product_id, is_suppressed) WHERE is_suppressed = FALSE;
CREATE INDEX IF NOT EXISTS idx_source_inventory_supplier ON source_inventory (supplier_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_tenant ON inventory_reservations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_source ON inventory_reservations (source_inventory_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_inventory ON inventory_reservations (inventory_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_quote ON inventory_reservations (quote_id) WHERE quote_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expiry ON inventory_reservations (expires_at) WHERE status = 'active' AND reservation_type = 'soft';
CREATE INDEX IF NOT EXISTS idx_customer_feedback_tenant ON customer_feedback (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer ON customer_feedback (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_delivery ON customer_feedback (delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_supplier_agreements_tenant ON supplier_agreements (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_agreements_supplier ON supplier_agreements (supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_agreements_active ON supplier_agreements (tenant_id, end_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ceo_digests_tenant ON ceo_digests (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ceo_digests_lookup ON ceo_digests (tenant_id, digest_type, digest_date DESC);
```

### 8.2 Composite Indexes (btree, multi-column)

```sql
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders (tenant_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_status ON quotes (tenant_id, customer_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_assigned_status ON quotes (tenant_id, assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_qr_status_urgency ON quote_requests (tenant_id, status, urgency);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_date ON deliveries (tenant_id, driver_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_status_date ON deliveries (tenant_id, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_route ON deliveries (route_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices (tenant_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_inventory_product_warehouse ON inventory (tenant_id, product_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_spo_supplier_status ON supplier_pos (tenant_id, supplier_id, status);
CREATE INDEX IF NOT EXISTS idx_spo_order ON supplier_pos (order_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets (tenant_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets (tenant_id, assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_state_history_entity ON state_history (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_aging_date ON ar_aging_snapshots (tenant_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_addresses_entity ON addresses (addressable_type, addressable_id);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts (customer_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product ON product_suppliers (product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier ON product_suppliers (supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_invoice ON payment_applications (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_apps_payment ON payment_applications (payment_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations (driver_id, recorded_at DESC);
```

### 8.3 Partial Indexes (btree with WHERE clause)

```sql
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes (tenant_id, valid_until) WHERE status IN ('sent', 'viewed');
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices (tenant_id, due_date) WHERE status IN ('sent', 'viewed', 'partially_paid', 'overdue');
CREATE INDEX IF NOT EXISTS idx_payments_unmatched ON payments (tenant_id, status, received_date) WHERE status IN ('received', 'unmatched');
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory (tenant_id, warehouse_id) WHERE quantity_available <= reorder_point;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (tenant_id, category) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_approvals_pending ON approvals (tenant_id, assigned_to, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices (tenant_id, invoice_type) WHERE invoice_type = 'proforma';
CREATE INDEX IF NOT EXISTS idx_invoices_quote ON invoices (quote_id) WHERE quote_id IS NOT NULL;
```

### 8.4 Full-Text Search Indexes (GIN)

```sql
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_tickets_search ON tickets USING GIN (to_tsvector('english', subject || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING GIN (to_tsvector('english', company_name || ' ' || COALESCE(legal_name, '') || ' ' || COALESCE(trade_name, '')));
```

### 8.5 pgvector Indexes (HNSW)

```sql
CREATE INDEX IF NOT EXISTS idx_document_embeddings_hnsw ON document_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_product_embeddings_hnsw ON product_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX IF NOT EXISTS idx_business_embeddings_hnsw ON business_data_embeddings USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Supporting btree indexes for pre-filtering
CREATE INDEX IF NOT EXISTS idx_document_embeddings_tenant_source ON document_embeddings (tenant_id, source_type);
CREATE INDEX IF NOT EXISTS idx_product_embeddings_tenant ON product_embeddings (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_embeddings_product ON product_embeddings (product_id);
CREATE INDEX IF NOT EXISTS idx_business_embeddings_tenant_type ON business_data_embeddings (tenant_id, data_type);

-- Revenue recognition indexes
CREATE INDEX IF NOT EXISTS idx_rre_tenant_fiscal ON revenue_recognition_events (tenant_id, fiscal_year, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_rre_customer ON revenue_recognition_events (tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_rre_recognition_date ON revenue_recognition_events (tenant_id, recognition_date);

-- OTP delivery log indexes
CREATE INDEX IF NOT EXISTS idx_otp_log_phone ON otp_delivery_log (phone_number, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otp_log_carrier ON otp_delivery_log (detected_carrier, created_at DESC);

-- Weather alert indexes
CREATE INDEX IF NOT EXISTS idx_weather_alerts_date ON weather_alerts (tenant_id, alert_date, governorate);

-- Onboarding progress indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_scheduled ON customer_onboarding_progress (status, scheduled_at) WHERE status IN ('pending', 'scheduled');
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_customer ON customer_onboarding_progress (customer_id);

-- Drop-ship POD indexes
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_tenant ON drop_ship_pod (tenant_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_delivery ON drop_ship_pod (delivery_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_supplier ON drop_ship_pod (supplier_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_customer ON drop_ship_pod (customer_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_status ON drop_ship_pod (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_auto_deadline ON drop_ship_pod (auto_confirm_deadline) WHERE status = 'awaiting_customer_confirmation' AND auto_confirmed = FALSE;
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_supplier_phone ON drop_ship_pod (supplier_phone) WHERE supplier_phone IS NOT NULL;

-- Invoice disputes indexes
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_invoice ON invoice_disputes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_status ON invoice_disputes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoice_disputes_sla ON invoice_disputes(sla_deadline) WHERE status NOT IN ('resolved');

-- Notification groups indexes
CREATE INDEX IF NOT EXISTS idx_notification_groups_key ON notification_groups(group_key);
CREATE INDEX IF NOT EXISTS idx_notifications_group_key ON notifications(group_key) WHERE group_key IS NOT NULL;

-- AI request log indexes
CREATE INDEX IF NOT EXISTS idx_ai_request_log_tenant ON ai_request_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_created ON ai_request_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_provider ON ai_request_log (provider, success);
CREATE INDEX IF NOT EXISTS idx_ai_request_log_use_case ON ai_request_log (use_case, created_at DESC);
```

---

## 9. CRON JOBS

| Job | Schedule | Implementation | Description |
|---|---|---|---|
| `quote_expiry_check` | Every 15 min | pg_cron | Expire quotes past `valid_until`, notify sales rep |
| `invoice_overdue_check` | Daily 6:00 AM | pg_cron | Mark invoices past due as `overdue`, trigger notification |
| `ar_reminder_30_day` | Daily 7:00 AM | Cloudflare Cron | Payment reminder for 30-day overdue invoices |
| `ar_reminder_60_day` | Daily 7:00 AM | Cloudflare Cron | Escalated reminder for 60-day overdue, CC finance manager |
| `ar_reminder_90_day` | Daily 7:00 AM | Cloudflare Cron | Final notice for 90+ day overdue, trigger credit hold eval |
| `credit_hold_check` | Daily 8:00 AM | pg_cron | Evaluate credit limit breaches, set `credit_hold` flag |
| `ceo_materialized_view_refresh` | Every 30 min | pg_cron | Refresh all CEO dashboard materialized views |
| `ceo_daily_digest` | Daily 7:00 AM | Cloudflare Cron | AI-summarized daily digest via WhatsApp + email |
| `ceo_weekly_insight` | Sunday 8:00 PM | Cloudflare Cron | AI weekly strategic insight via email with charts |
| `ops_meeting_agenda` | Sunday 7:00 AM | Cloudflare Cron | Auto-generate ops meeting agenda from open issues |
| `cheque_maturity_check` | Daily 6:00 AM | pg_cron | Check cheques reaching maturity, notify finance |
| `form_41_quarterly` | 1st Jan/Apr/Jul/Oct 9 AM | Cloudflare Cron | Generate quarterly Form 41 tax report |
| `account_deletion_purge` | Daily 2:00 AM | pg_cron | Hard-delete after 30-day grace, anonymize records |
| `driver_compliance_check` | Daily 6:00 AM | pg_cron | Check license/registration/insurance expiry |
| `exchange_rate_update` | Daily 8:00 AM | Cloudflare Cron | Fetch USD/EGP, EUR/EGP, SAR/EGP rates |
| `bank_feed_sync` | Every 4 hours | Cloudflare Cron | Sync bank transactions for reconciliation |
| `supplier_auto_remind` | Daily 9:00 AM | Cloudflare Cron | Remind suppliers of unconfirmed POs (48h+) |
| `search_index_sync` | Every 5 min (batch) | pg_cron | Batch-update tsvector search indexes |
| `escalation_check` | Every 30 min | pg_cron | SLA breach check: RFQs >2h, tickets >24h, POs >48h |
| `weather_prefetch` | Daily 5:00 AM | Cloudflare Cron | Fetch 3-day forecast, cache in KV + weather_alerts table |
| `prayer_time_update` | 1st of each month | Cloudflare Cron | Fetch monthly prayer times for all governorates |
| `inventory_reorder_alert` | Daily 7:00 AM | pg_cron | Check below reorder point, auto-create PO drafts |
| `session_cleanup` | Daily 3:00 AM | pg_cron | Purge expired sessions, revoked tokens, stale OTPs |
| `audit_log_archive` | Monthly 1st 1:00 AM | pg_cron | Archive audit entries >90 days to partition |
| `ai_usage_aggregation` | Daily 11:00 PM | pg_cron | Aggregate AI token usage per user/model |
| `revenue_recognition_audit` | Monthly 1st 2:00 AM | pg_cron | Verify delivered invoices have matching revenue events |
| `pod_integrity_check` | Daily 3:00 AM | Cloudflare Cron | Re-hash POD files (7 days), flag mismatches |
| `otp_delivery_rate_update` | Weekly Sunday 11 PM | pg_cron | Calculate delivery rates per carrier, update routing config |
| `onboarding_step_executor` | Every 15 min | Cloudflare Cron | Execute scheduled onboarding steps |
| `onboarding_stale_check` | Daily 9:00 AM | pg_cron | Flag stalled customers, notify sales rep |
| `auto_confirm_drop_ship` | Daily 8:00 AM | pg_cron | Auto-confirm drop-ship deliveries where 72h deadline passed with no dispute |
| `dispute_sla_check` | Daily 9:00 AM | pg_cron | Escalate invoice disputes exceeding 48h SLA |
| `ai_log_cleanup` | Weekly Sunday 3:00 AM | pg_cron | Delete ai_request_log entries older than 90 days |

---

## 10. INTEGRATIONS

| Service | Purpose | Type | Auth | Cloudflare Component |
|---|---|---|---|---|
| **WhatsApp Cloud API** | Customer/supplier notifications, RFQ alerts, delivery updates, CEO digest, drop-ship POD | REST API | Bearer token | Worker + Queue + KV |
| **Twilio** | SMS fallback, OTP delivery, voice call escalation | REST API | SID + Auth Token | Worker + Queue |
| **Resend** | Transactional email: invoices, quotes, reports, digests | REST API | API Key | Worker + Queue + R2 |
| **ETA e-Invoicing** | Egyptian Tax Authority electronic invoicing (mandatory) | REST API (OAuth2) | Client ID + Secret | Worker + KV + Queue |
| **Claude / Anthropic** | Primary AI: CEO insights, complex analysis, strategic recommendations, RAG | REST API | API Key | Worker + KV + D1 |
| **Groq** | Fast AI: real-time chat, quick summarization, driver assistance | REST API | API Key | Worker (latency path) |
| **GLM (Zhipu)** | Budget AI: bulk categorization, data enrichment | REST API | API Key | Worker (cost path) |
| **Mistral OCR** | Document OCR: supplier invoices, cheque scanning, ID verification | REST API | API Key | Worker + R2 + Queue |
| **MapTiler** | Map tiles, address autocomplete, geocoding | REST API + Tiles | API Key | KV + Worker proxy |
| **Sygic / HERE** | Route optimization, ETA, traffic-aware routing | REST API | API Key | Worker + KV (1h TTL) |
| **Prayer Time API** | Prayer times for driver app | REST API (public) | None | KV (monthly cache) |
| **Weather API** | Forecast for delivery planning, Khamsin enforcement | REST API | API Key | KV (daily per governorate) |
| **PowerSync** | Offline-first sync for driver app (SQLite <-> Supabase) | Sync Protocol (WS) | JWT | N/A (client-side) |
| **QuickBooks** (Phase 2) | Accounting sync: journal entries, financial reports | REST API (OAuth2) | OAuth2 | Worker + Queue + KV |
| **D&B / Experian** (Phase 2) | Credit scoring, business verification | REST API | API Key + Secret | Worker + KV (30d TTL) |
| **Plaid** (Phase 2) | Automated bank feed, balance checks | REST API | Client ID + Secret | Worker + Queue |

**AI Provider Fallback Chain:**

| Provider Key | Cloudflare AI Gateway Route | Notes |
|---|---|---|
| `claude-sonnet` | `anthropic/claude-sonnet` | Primary for complex tasks |
| `groq-qwen3-32b` | `groq/qwen-qwen3-32b` | Fast fallback, good Arabic |
| `glm-4-flash` | `zhipu/glm-4-flash` | Budget option, bulk tasks |
| `mistral-ocr` | `mistral/mistral-ocr-latest` | Document OCR specialist |
| `claude-vision` | `anthropic/claude-sonnet` (vision) | OCR fallback |

**Routing per use case (configurable per tenant via `system_settings`):**

| Use Case | Primary | Fallback 1 | Fallback 2 | Timeout |
|---|---|---|---|---|
| `portal_chat` | claude-sonnet | groq-qwen3-32b | glm-4-flash | 5000ms |
| `ceo_analytics` | claude-sonnet | groq-qwen3-32b | -- | 8000ms |
| `intent_classification` | glm-4-flash | groq-qwen3-32b | -- | 2000ms |
| `ocr` | mistral-ocr | claude-vision | -- | 15000ms |

---

## 11. CACHING + REALTIME + STORAGE

### 11.1 7-Layer Cache Architecture

| Layer | Technology | TTL | Use Case |
|---|---|---|---|
| **L1** | TanStack Query `queryCache` (in-memory) | Per `staleTime` | Active queries, navigation cache |
| **L2** | TanStack Query `persistQueryClient` + IndexedDB | 24h max | Offline support, app restart hydration |
| **L3** | Workbox (Capacitor/PWA) | Strategy-dependent | Static assets, API responses, fonts |
| **L4** | Cloudflare CDN / Cache API | 5min - 24h | Catalog, product images, PDFs |
| **L5** | Cloudflare KV | 15min - 30d | Exchange rates, prayer times, weather, config |
| **L6** | PostgreSQL materialized views | pg_cron schedule | CEO dashboards, aging reports |
| **L7** | PostgreSQL query plan cache (Supavisor) | Auto | Repeated complex queries |

### 11.2 TanStack Query staleTime

| Data Type | staleTime | gcTime | Rationale |
|---|---|---|---|
| Public catalog | 5 min | 30 min | Products change infrequently |
| RFQ list | 30 sec | 5 min | Sales need near-real-time |
| Quote list | 1 min | 5 min | Expiry timers need freshness |
| Order list | 30 sec | 5 min | Frequent status changes |
| Order detail | 30 sec | 10 min | Real-time critical for ops |
| Invoice list/detail | 2 min | 10 min | Financial, less volatile |
| Customer list | 5 min | 30 min | Infrequent changes |
| Customer profile | 2 min | 15 min | Credit may update |
| Supplier list | 5 min | 30 min | Relatively static |
| Inventory levels | 1 min | 5 min | Current stock view needed |
| Driver location | 5 sec | 30 sec | Near-real-time (+ Realtime) |
| Shipment list | 30 sec | 5 min | Active dispatch freshness |
| CEO dashboard/financials | 5 min | 30 min | Backed by materialized views |
| Exchange rates | 1 hour | 4 hours | Updated daily |
| Prayer times | 24 hours | 7 days | Updated monthly |
| Weather forecast | 1 hour | 4 hours | Updated daily |
| System config | 10 min | 1 hour | Rarely changes |
| Employee directory | 10 min | 30 min | Low-change frequency |

### 11.3 NEVER-CACHE List

- **Authentication state** -- session validity, token refresh, role changes
- **Payment recording** -- financial mutations
- **Credit hold status** -- must always be checked live
- **OTP / verification codes** -- security-critical, single-use
- **File upload presigned URLs** -- expire quickly
- **ETA e-Invoice submission status** -- tax authority responses
- **Bank reconciliation data** -- financial integrity
- **Audit log writes** -- write-path
- **AI chat responses** -- streaming, unique per request

### 11.4 Realtime Channels

#### Postgres Changes (8)

| Channel | Table | Event | Subscribers |
|---|---|---|---|
| `order-status` | `orders` | UPDATE (status) | Customer portal, Internal ops, Dispatch |
| `rfq-incoming` | `rfqs` | INSERT | Sales team |
| `quote-response` | `quotes` | UPDATE (accepted/rejected) | Assigned sales rep |
| `invoice-payment` | `payments` | INSERT | Finance, Customer portal |
| `shipment-update` | `shipments` | UPDATE (status) | Dispatch, Driver, Customer portal |
| `inventory-change` | `inventory` | UPDATE (quantity) | Warehouse, Procurement |
| `ticket-update` | `support_tickets` | UPDATE (status/assigned) | Support, Customer portal |
| `system-alert` | `system_alerts` | INSERT | Admin, relevant department |

#### Broadcast (2)

| Channel | Purpose | Publishers | Subscribers |
|---|---|---|---|
| `notifications` | Push in-app notifications | Server functions | All authenticated users |
| `config-change` | Cache invalidation | Admin functions | All internal users |

#### Presence (1)

| Channel | Purpose | Tracked State |
|---|---|---|
| `driver-presence` | Real-time driver location | `{ driverId, lat, lng, heading, speed, lastUpdate, status }` |

### 11.5 R2 Storage Paths

| Bucket Path | Contents | Access |
|---|---|---|
| `/{tenant_id}/invoices/{year}/{month}/` | Invoice PDFs, credit notes | Presigned URL |
| `/{tenant_id}/quotes/{year}/{month}/` | Quote PDFs, proforma invoices | Presigned URL |
| `/{tenant_id}/delivery-notes/` | Branded delivery notes, BOLs | Presigned URL |
| `/{tenant_id}/pod/{delivery_id}/` | Delivery photos, signature PNGs | Upload from driver app |
| `/{tenant_id}/catalogs/` | Supplier catalog uploads | Upload + AI processing |
| `/{tenant_id}/attachments/` | Customer drawings, specs, cheque photos, LC docs | Upload from portal |
| `/{tenant_id}/reports/` | Board reports, recurring reports | Generated by Workers |
| `/{tenant_id}/hr-documents/` | Employee documents, compliance certs | Internal only |
| `/{tenant_id}/receipts/` | Payment receipts, withholding certificates | Presigned URL |

---

## 12. SEED DATA

### 12.1 Role-Permission Mappings

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

### 12.2 System Configuration Defaults

```sql
INSERT INTO system_settings (tenant_id, category, key, value, description) VALUES
  -- Quoting
  ('__TENANT_ID__', 'quoting', 'quote_expiry_minutes', '15', 'Live quote validity window'),
  ('__TENANT_ID__', 'quoting', 'quote_default_validity_days', '30', 'Formal quote validity'),
  ('__TENANT_ID__', 'quoting', 'sla_quote_response_hours', '4', 'SLA: max hours to respond to RFQ'),
  ('__TENANT_ID__', 'quoting', 'require_approval_above', '500000', 'EGP threshold for manager approval'),
  ('__TENANT_ID__', 'quoting', 'max_discount_percent_sales_rep', '5', 'Max rep discount without approval'),
  ('__TENANT_ID__', 'quoting', 'max_discount_percent_manager', '15', 'Max manager discount without director'),
  -- Credit
  ('__TENANT_ID__', 'credit', 'credit_hold_threshold', '0.5', 'Overdue/limit ratio for credit hold'),
  ('__TENANT_ID__', 'credit', 'auto_hold_days_overdue', '46', 'Days overdue before auto hold'),
  ('__TENANT_ID__', 'credit', 'auto_suspend_days_overdue', '61', 'Days overdue before Tier 5 suspension'),
  ('__TENANT_ID__', 'credit', 'collections_escalation_days', '90', 'Days before collections escalation'),
  -- Finance
  ('__TENANT_ID__', 'finance', 'default_tax_rate', '0.14', 'Egyptian VAT rate (14%)'),
  ('__TENANT_ID__', 'finance', 'withholding_tax_goods_rate', '0.01', 'Withholding on goods (1%)'),
  ('__TENANT_ID__', 'finance', 'withholding_tax_services_rate', '0.05', 'Withholding on services (5%)'),
  ('__TENANT_ID__', 'finance', 'bounced_check_penalty_egp', '5000', 'Fee for bounced cheques'),
  -- Delivery
  ('__TENANT_ID__', 'delivery', 'ramadan_mode', 'false', 'Enable Ramadan working hours'),
  ('__TENANT_ID__', 'delivery', 'cairo_truck_ban_enabled', 'true', '>5-ton truck ban (12AM-6AM only)'),
  ('__TENANT_ID__', 'delivery', 'friday_jumah_blackout_start', '"11:30"', 'Friday prayer blackout start'),
  ('__TENANT_ID__', 'delivery', 'friday_jumah_blackout_end', '"13:30"', 'Friday prayer blackout end'),
  ('__TENANT_ID__', 'delivery', 'gps_tracking_interval_seconds', '30', 'GPS ping interval'),
  -- SLA
  ('__TENANT_ID__', 'sla', 'first_response_hours_critical', '1', 'Critical ticket response SLA'),
  ('__TENANT_ID__', 'sla', 'resolution_hours_critical', '4', 'Critical ticket resolution SLA'),
  -- Procurement
  ('__TENANT_ID__', 'procurement', 'exchange_rate_variance_threshold', '5', 'Percentage threshold for exchange rate variance between quote and PO'),
  -- AI
  ('__TENANT_ID__', 'ai', 'routing_config', '{"portal_chat":{"primary":"claude-sonnet","fallback_1":"groq-qwen3-32b","fallback_2":"glm-4-flash","timeout_ms":5000},"ceo_analytics":{"primary":"claude-sonnet","fallback_1":"groq-qwen3-32b","timeout_ms":8000},"intent_classification":{"primary":"glm-4-flash","fallback_1":"groq-qwen3-32b","timeout_ms":2000},"ocr":{"primary":"mistral-ocr","fallback_1":"claude-vision","timeout_ms":15000}}', 'AI provider routing with fallback chain per use case'),
  -- General
  ('__TENANT_ID__', 'general', 'timezone', '"Africa/Cairo"', 'Tenant timezone'),
  ('__TENANT_ID__', 'general', 'locale', '"ar-EG"', 'Default locale'),
  ('__TENANT_ID__', 'general', 'weekend_days', '["friday","saturday"]', 'Egyptian weekend');
```

### 12.3 Egyptian Governorates (27)

```sql
INSERT INTO governorates (code, name_en, name_ar, region) VALUES
  ('CAI', 'Cairo',           'القاهرة',        'cairo_giza'),
  ('GIZ', 'Giza',            'الجيزة',         'cairo_giza'),
  ('ALX', 'Alexandria',      'الإسكندرية',     'lower_egypt'),
  ('QAL', 'Qalyubia',        'القليوبية',       'lower_egypt'),
  ('SHR', 'Sharqia',         'الشرقية',         'lower_egypt'),
  ('DAK', 'Dakahlia',        'الدقهلية',        'lower_egypt'),
  ('GHR', 'Gharbia',         'الغربية',         'lower_egypt'),
  ('MNF', 'Monufia',         'المنوفية',        'lower_egypt'),
  ('BHR', 'Beheira',         'البحيرة',         'lower_egypt'),
  ('KFS', 'Kafr El Sheikh',  'كفر الشيخ',       'lower_egypt'),
  ('DMT', 'Damietta',        'دمياط',           'lower_egypt'),
  ('ISM', 'Ismailia',        'الإسماعيلية',     'canal'),
  ('PTS', 'Port Said',       'بورسعيد',         'canal'),
  ('SUZ', 'Suez',            'السويس',          'canal'),
  ('FYM', 'Faiyum',          'الفيوم',          'upper_egypt'),
  ('BNS', 'Beni Suef',       'بني سويف',        'upper_egypt'),
  ('MNA', 'Minya',           'المنيا',          'upper_egypt'),
  ('AST', 'Asyut',           'أسيوط',           'upper_egypt'),
  ('SHG', 'Sohag',           'سوهاج',           'upper_egypt'),
  ('QNA', 'Qena',            'قنا',             'upper_egypt'),
  ('LXR', 'Luxor',           'الأقصر',          'upper_egypt'),
  ('ASW', 'Aswan',           'أسوان',           'upper_egypt'),
  ('RDS', 'Red Sea',         'البحر الأحمر',     'frontier'),
  ('NVL', 'New Valley',      'الوادي الجديد',   'frontier'),
  ('MTR', 'Matrouh',         'مطروح',           'frontier'),
  ('NSN', 'North Sinai',     'شمال سيناء',      'frontier'),
  ('SSN', 'South Sinai',     'جنوب سيناء',      'frontier');
```

### 12.4 Sequence Counters

```sql
-- Initialize sequence counters for all document types per tenant
INSERT INTO sequence_counters (tenant_id, entity_type, prefix, current_value, year)
SELECT id, unnest(ARRAY['order', 'quote', 'quote_request', 'invoice', 'proforma_invoice', 'payment', 'delivery', 'supplier_po', 'supplier_inquiry', 'credit_note', 'return', 'ticket', 'coded_delivery']),
       unnest(ARRAY['SO', 'QT', 'RFQ', 'INV', 'PI', 'PMT', 'DEL', 'PO', 'INQ', 'CN', 'RET', 'TKT', 'HQ']),
       0, EXTRACT(YEAR FROM NOW())::INTEGER
FROM tenants;
```

### 12.5 Unit of Measure Translations (i18n)

```sql
-- Unit display names for Arabic and English locales
-- Used by @hyperquote/i18n namespace 'units'
-- Frontend renders via <UnitDisplay value={qty} unit={enum} />
CREATE TABLE IF NOT EXISTS unit_translations (
  unit        unit_of_measure PRIMARY KEY,
  en_name     TEXT NOT NULL,      -- Full English name
  en_abbr     TEXT NOT NULL,      -- English abbreviation
  ar_name     TEXT NOT NULL,      -- Full Arabic name
  ar_abbr     TEXT NOT NULL       -- Arabic abbreviation
);

INSERT INTO unit_translations (unit, en_name, en_abbr, ar_name, ar_abbr) VALUES
  ('kg',          'kilogram',      'kg',   'كيلو جرام',    'كجم'),
  ('g',           'gram',          'g',    'جرام',         'جم'),
  ('ton',         'ton',           'ton',  'طن',           'طن'),
  ('meter',       'meter',         'm',    'متر',          'م'),
  ('centimeter',  'centimeter',    'cm',   'سنتيمتر',      'سم'),
  ('millimeter',  'millimeter',    'mm',   'ميليمتر',       'مم'),
  ('square_meter','square meter',  'm²',   'متر مربع',     'م²'),
  ('cubic_meter', 'cubic meter',   'm³',   'متر مكعب',     'م³'),
  ('liter',       'liter',         'L',    'لتر',          'ل'),
  ('piece',       'piece',         'pc',   'قطعة',         'قطعة'),
  ('unit',        'unit',          'unit', 'وحدة',         'وحدة'),
  ('bag',         'bag',           'bag',  'كيس',          'كيس'),
  ('bag_50kg',    '50kg bag',      'bag',  'كيس ٥٠ كجم',   'كيس'),
  ('bag_25kg',    '25kg bag',      'bag',  'كيس ٢٥ كجم',   'كيس'),
  ('pallet',      'pallet',        'plt',  'لوح تحميل',    'لوح'),
  ('bundle',      'bundle',        'bdl',  'حزمة',         'حزمة'),
  ('roll',        'roll',          'roll', 'لفة',          'لفة'),
  ('sheet',       'sheet',         'sht',  'لوح',          'لوح'),
  ('panel',       'panel',         'pnl',  'لوحة',         'لوحة'),
  ('box',         'box',           'box',  'صندوق',        'صندوق'),
  ('carton',      'carton',        'ctn',  'كرتونة',       'كرتونة'),
  ('drum',        'drum',          'drm',  'برميل',        'برميل'),
  ('coil',        'coil',          'coil', 'لفة سلك',      'لفة'),
  ('bar',         'bar',           'bar',  'قضيب',         'قضيب'),
  ('length',      'length',        'len',  'طول',          'طول'),
  ('trip',        'trip',          'trip', 'رحلة',         'رحلة'),
  ('load',        'load',          'load', 'حمولة',        'حمولة'),
  ('set',         'set',           'set',  'طقم',          'طقم'),
  ('pair',        'pair',          'pair', 'زوج',          'زوج');
```

---

## 13. TYPESCRIPT TYPES

Package: `@hyperquote/types` -- shared across all 5 apps + API layer.

### 13.1 Enum Types

```typescript
// @hyperquote/types/src/enums.ts

// Auth & Users
export type AppRole =
  | 'ceo' | 'admin' | 'sales_director' | 'sales_manager' | 'sales_rep'
  | 'quoting_specialist' | 'bdr' | 'procurement_manager' | 'procurement_officer'
  | 'warehouse_manager' | 'warehouse_worker' | 'quality_inspector'
  | 'dispatcher' | 'driver' | 'accountant' | 'ar_clerk' | 'ap_clerk'
  | 'credit_manager' | 'cs_agent' | 'cs_manager' | 'customer' | 'supplier';

export type UserType = 'employee' | 'customer' | 'supplier' | 'driver';

// Quote & Order Lifecycle
export type QuoteRequestStatus =
  | 'draft' | 'submitted' | 'under_review' | 'sourcing'
  | 'quote_ready' | 'on_hold' | 'rejected' | 'withdrawn' | 'cancelled';

export type QuoteStatus =
  | 'draft' | 'internal_review' | 'pending_approval' | 'approved'
  | 'sent' | 'viewed' | 'negotiating' | 'revised' | 'accepted'
  | 'declined' | 'expired' | 'cancelled' | 'requires_re_quote';

export type OrderStatus =
  | 'confirmed' | 'processing' | 'partially_fulfilled' | 'fulfilled'
  | 'completed' | 'on_hold' | 'cancellation_requested' | 'cancelled' | 'back_ordered';

export type SupplierPoStatus =
  | 'draft' | 'sent' | 'confirmed' | 'in_production' | 'shipped'
  | 'partially_received' | 'received' | 'inspected' | 'closed'
  | 'rejected' | 'cancelled';

// Delivery & Logistics
export type DeliveryStatus =
  | 'scheduled' | 'picking_loading' | 'dispatched' | 'in_transit'
  | 'at_site' | 'delivered' | 'partially_delivered' | 'failed'
  | 'rescheduled' | 'returned' | 'cancelled';

export type DriverType = 'internal' | 'contracted' | 'on_demand';
export type VehicleType = 'pickup' | 'flatbed' | 'box_truck' | 'tanker' | 'dump_truck' | 'trailer' | 'semi_trailer' | 'crane_truck' | 'concrete_mixer';
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service' | 'reserved';
export type EgyptianLicenseClass = 'third_degree' | 'second_degree' | 'first_degree';

export type DeliveryFailureReason =
  | 'customer_refused' | 'site_not_ready' | 'access_blocked'
  | 'wrong_address' | 'customer_absent' | 'safety_concern'
  | 'vehicle_breakdown' | 'weather' | 'documentation_issue' | 'damaged_in_transit';

export type ShippingMethod = 'own_fleet' | 'three_pl' | 'supplier_direct' | 'customer_pickup';

export type DropShipPodStatus =
  | 'awaiting_supplier_pod' | 'awaiting_customer_confirmation'
  | 'confirmed' | 'disputed' | 'auto_confirmed';

// Finance
export type InvoiceStatus =
  | 'draft' | 'sent' | 'viewed' | 'partially_paid' | 'paid'
  | 'overdue' | 'collections' | 'disputed' | 'adjusted' | 'cancelled' | 'written_off';

export type InvoiceType = 'standard' | 'proforma' | 'credit_note' | 'debit_note' | 'advance' | 'retention' | 'final';

export type PaymentStatus =
  | 'expected' | 'received' | 'matched' | 'fully_applied'
  | 'partially_applied' | 'overpayment' | 'unmatched' | 'bounced' | 'refunded';

export type PaymentMethod = 'wire_transfer' | 'post_dated_cheque' | 'certified_cheque' | 'cash' | 'letter_of_credit' | 'bank_guarantee';

export type PaymentTerms =
  | 'cod' | 'cia' | 'net_15' | 'net_30' | 'net_45' | 'net_60' | 'net_90'
  | 'lc_at_sight' | 'lc_30_days' | 'lc_60_days' | 'custom';

export type CreditStatus = 'not_evaluated' | 'under_review' | 'approved' | 'conditional' | 'suspended' | 'revoked' | 'expired';
export type CreditNoteStatus = 'draft' | 'pending_approval' | 'approved' | 'applied' | 'partially_applied' | 'void';
export type ChequeStatus = 'received' | 'deposited' | 'cleared' | 'bounced' | 'replaced' | 'written_off';
export type LcStatus = 'draft' | 'issued' | 'advised' | 'confirmed' | 'partially_drawn' | 'fully_drawn' | 'expired' | 'cancelled' | 'amended';

export type ReturnStatus =
  | 'requested' | 'under_review' | 'approved' | 'rejected' | 'pickup_scheduled'
  | 'picked_up' | 'inspecting' | 'restocked' | 'credit_issued' | 'closed';

export type DisputeReason =
  | 'incorrect_amount' | 'damaged_goods' | 'wrong_items'
  | 'missing_items' | 'duplicate_invoice' | 'pricing_disagreement' | 'other';

export type DisputeStatus =
  | 'open' | 'investigating' | 'awaiting_evidence' | 'resolved' | 'escalated';

export type DisputeResolutionType =
  | 'adjusted' | 'credit_note_issued' | 'invoice_maintained' | 'partially_adjusted';

// Products & Inventory
export type ProductCategory =
  | 'cement' | 'reinforcing_steel' | 'structural_steel' | 'aggregates' | 'sand'
  | 'ready_mix_concrete' | 'bricks' | 'blocks' | 'tiles_ceramic' | 'tiles_porcelain'
  | 'marble' | 'granite' | 'lumber' | 'plywood' | 'insulation' | 'waterproofing'
  | 'pipes_pvc' | 'pipes_metal' | 'electrical_cable' | 'electrical_conduit'
  | 'paint' | 'adhesives' | 'glass' | 'aluminum_profiles' | 'gypsum_board'
  | 'roofing' | 'hardware_fasteners';

export type UnitOfMeasure =
  | 'ton' | 'kg' | 'g' | 'cubic_meter' | 'liter' | 'meter' | 'centimeter' | 'millimeter'
  | 'square_meter' | 'piece' | 'unit' | 'bag' | 'bag_50kg' | 'bag_25kg' | 'pallet'
  | 'bundle' | 'roll' | 'sheet' | 'panel' | 'box' | 'carton' | 'drum' | 'coil'
  | 'bar' | 'length' | 'trip' | 'load' | 'set' | 'pair';

export type InventoryStatus = 'available' | 'reserved' | 'quarantine' | 'damaged' | 'in_transit' | 'pending_inspection' | 'returned' | 'committed' | 'write_off';
export type StockMovementType = 'receipt' | 'issue' | 'transfer_in' | 'transfer_out' | 'adjustment_up' | 'adjustment_down' | 'return_in' | 'return_out' | 'write_off' | 'cycle_count' | 'reservation';
export type InspectionResult = 'pass' | 'fail' | 'conditional' | 'pending';
export type StockConfidence = 'fresh' | 'aging' | 'stale';
export type ReservationType = 'soft' | 'hard';
export type ReservationStatus = 'active' | 'expired' | 'converted';

// Support
export type TicketStatus = 'new' | 'open' | 'in_progress' | 'awaiting_customer' | 'awaiting_internal' | 'awaiting_supplier' | 'escalated' | 'resolved' | 'closed' | 'reopened';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type TicketCategory = 'order_issue' | 'delivery_issue' | 'quality_complaint' | 'billing_dispute' | 'product_inquiry' | 'return_request' | 'account_issue' | 'technical_support' | 'general';

// System
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired';
export type ApprovalType = 'quote_discount' | 'quote_override' | 'order_cancellation' | 'credit_extension' | 'credit_note' | 'purchase_order' | 'price_adjustment' | 'write_off' | 'refund';
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject' | 'export' | 'import' | 'escalate';

export type Urgency = 'standard' | 'rush' | 'emergency';
export type CustomerTier = 'tier_1_new' | 'tier_2_verified' | 'tier_3_established' | 'tier_4_preferred' | 'tier_5_suspended';
export type AddressType = 'billing' | 'shipping' | 'site' | 'warehouse' | 'office' | 'other';
export type ContactType = 'primary' | 'billing' | 'shipping' | 'technical' | 'procurement' | 'executive' | 'site_engineer';
export type DocumentType = 'commercial_register' | 'tax_card' | 'vat_certificate' | 'insurance_certificate' | 'bank_letter' | 'delivery_note' | 'weight_ticket' | 'inspection_report' | 'material_test_certificate' | 'photo' | 'signed_contract' | 'purchase_order' | 'invoice' | 'packing_list' | 'other';
```

### 13.2 Entity Interfaces

```typescript
// @hyperquote/types/src/entities.ts

type ISODate = string;
type ISODateTime = string;

interface BaseEntity { id: string; createdAt: ISODateTime; updatedAt: ISODateTime; }
interface TenantEntity extends BaseEntity { tenantId: string; }

export interface Tenant extends BaseEntity {
  name: string; slug: string; domain: string | null; logoUrl: string | null;
  settings: Record<string, unknown>; timezone: string; currency: string;
  taxId: string | null; isActive: boolean;
}

export interface UserProfile extends TenantEntity {
  userId: string; userType: UserType; customerId: string | null;
  supplierId: string | null; driverId: string | null; employeeId: string | null;
  firstName: string; lastName: string; displayName: string; email: string;
  phone: string | null; avatarUrl: string | null; locale: string;
  isActive: boolean; lastLoginAt: ISODateTime | null; mfaEnabled: boolean;
}

export interface Customer extends TenantEntity {
  customerNumber: string; companyName: string; companyNameAr: string | null;
  legalName: string | null; tradeName: string | null; tier: CustomerTier;
  status: string; phone: string | null; taxRegistrationNumber: string | null;
  commercialRegister: string | null; industry: string | null;
  creditStatus: CreditStatus; creditLimit: number; creditTerms: PaymentTerms;
  paymentBehaviorScore: number | null; compositeTierScore: number | null;
  assignedSalesRep: string | null; assignedAccountManager: string | null;
  isActive: boolean; onboardedAt: ISODateTime | null; claimedAt: ISODateTime | null;
}

export interface Supplier extends TenantEntity {
  supplierNumber: string; companyName: string; companyNameAr: string | null;
  primaryContactName: string | null; primaryContactEmail: string | null;
  primaryContactPhone: string | null; productCategories: ProductCategory[];
  defaultPaymentTerms: PaymentTerms; defaultLeadTimeDays: number;
  onTimeDeliveryRate: number | null; qualityScore: number | null;
  hasPortalAccess: boolean; isActive: boolean; isPreferred: boolean;
}

export interface Product extends TenantEntity {
  sku: string; name: string; nameAr: string | null; description: string | null;
  category: ProductCategory; brand: string | null; manufacturer: string | null;
  specifications: Record<string, unknown>; unitOfMeasure: UnitOfMeasure;
  weightKg: number | null; lastPurchasePrice: number | null;
  weightedAvgCost: number | null; isStockable: boolean; isActive: boolean;
  requiresInspection: boolean; isWindSensitive: boolean; imageUrls: string[];
}

export interface Quote extends TenantEntity {
  quoteNumber: string; quoteRequestId: string | null; customerId: string;
  versionNumber: number; status: QuoteStatus; subtotal: number;
  taxAmount: number; deliveryFee: number; discountAmount: number; total: number;
  marginPercent: number | null; currency: string; paymentTerms: PaymentTerms | null;
  validUntil: ISODate | null; createdBy: string | null; assignedTo: string | null;
  sourceCurrency: 'EGP' | 'USD' | 'EUR' | 'SAR';
  exchangeRate: number | null;
  exchangeRateLockedAt: ISODateTime | null;
}

export interface Order extends TenantEntity {
  orderNumber: string; quoteId: string | null; customerId: string;
  status: OrderStatus; subtotal: number; taxAmount: number; total: number;
  currency: string; paymentTerms: PaymentTerms | null;
  requestedDeliveryDate: ISODate | null; totalItems: number; fulfilledItems: number;
  creditCheckPassed: boolean | null; createdBy: string | null;
}

export interface SupplierPo extends TenantEntity {
  poNumber: string; orderId: string; supplierId: string; status: SupplierPoStatus;
  total: number; currency: string; paymentTerms: PaymentTerms | null;
  expectedDeliveryDate: ISODate | null; inspectionResult: InspectionResult | null;
  sourceCurrency: 'EGP' | 'USD' | 'EUR' | 'SAR';
  exchangeRate: number | null;
  exchangeRateLockedAt: ISODateTime | null;
  codedDeliveryReference: string;
}

export interface Delivery extends TenantEntity {
  deliveryNumber: string; orderId: string; status: DeliveryStatus;
  driverId: string | null; vehicleId: string | null;
  deliveryAddressId: string; scheduledDate: ISODate;
  shippingMethod: ShippingMethod; failureReason: DeliveryFailureReason | null;
  totalWeightKg: number | null;
  deliveryNoteSentAt: ISODateTime | null;
}

export interface Invoice extends TenantEntity {
  invoiceNumber: string; invoiceType: InvoiceType; orderId: string;
  customerId: string; status: InvoiceStatus; subtotal: number;
  taxAmount: number; total: number; amountPaid: number; balanceDue: number;
  currency: string; paymentTerms: PaymentTerms | null; dueDate: ISODate;
  quoteId: string | null;
}

export interface Payment extends TenantEntity {
  paymentNumber: string; customerId: string; status: PaymentStatus;
  paymentMethod: PaymentMethod; amount: number; currency: string;
  appliedAmount: number; unappliedAmount: number;
  referenceNumber: string | null; receivedDate: ISODate;
}

export interface InvoiceDispute {
  id: string; tenantId: string; invoiceId: string; raisedBy: string;
  disputeReason: DisputeReason; description: string; evidenceUrls: string[];
  assignedTo: string | null; status: DisputeStatus;
  resolutionType: DisputeResolutionType | null;
  resolutionNotes: string | null; resolvedAt: ISODateTime | null;
  resolvedBy: string | null; slaDeadline: ISODateTime;
  escalatedAt: ISODateTime | null; escalatedTo: string | null;
  createdAt: ISODateTime; updatedAt: ISODateTime;
}

export interface NotificationGroup {
  id: string; tenantId: string; groupKey: string;
  rootEventType: string; rootEntityId: string;
  summaryText: string; summaryTextAr: string | null;
  notificationCount: number; createdAt: ISODateTime;
}

export interface Ticket extends TenantEntity {
  ticketNumber: string; customerId: string | null; category: TicketCategory;
  subject: string; priority: TicketPriority; status: TicketStatus;
  assignedTo: string | null; slaBreached: boolean;
}

export interface InventoryRecord extends TenantEntity {
  productId: string; warehouseId: string; quantityOnHand: number;
  quantityReserved: number; quantityAllocated: number; quantityAvailable: number;
  unitCost: number | null; totalValue: number | null;
  reorderPoint: number | null; lotNumber: string | null; expiryDate: ISODate | null;
}

export interface ArAgingSnapshot {
  id: string; tenantId: string; snapshotDate: ISODate; customerId: string;
  currentAmount: number; days1_30: number; days31_60: number;
  days61_90: number; daysOver90: number; totalOutstanding: number;
}

export type StatusColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';
export type ArAgingColor = 'green' | 'yellow' | 'orange' | 'red' | 'darkRed';
```

---

## 14. MIGRATION STRATEGY

### Tooling

All migrations managed via **Supabase CLI**: `supabase migration new <descriptive_name>`

### Naming Convention

`YYYYMMDDHHMMSS_descriptive_name.sql`

### Migration Order

1. **Extensions** -- `uuid-ossp`, `pgcrypto`, `pg_trgm`, `pg_cron`, `postgis`
2. **Enums** -- All custom enum types (50 enums)
3. **Tables (auth first)** -- `profiles`, `user_roles`, `role_permissions`, `sessions`
4. **Tables (by FK dependency)** -- customers -> contacts -> rfqs -> quotes -> orders -> invoices -> payments; suppliers -> POs -> GRNs -> inventory
5. **Functions** -- Stored procedures, helper functions, RPC functions
6. **Triggers** -- `updated_at`, audit, inventory adjustment, state machine, business logic
7. **RLS Policies** -- Per table per role
8. **Seeds** -- Reference data (governorates, role-permissions, system settings, sequence counters)
9. **Materialized Views** -- CEO dashboards, analytics, aging reports
10. **Indexes** -- B-tree, GIN, HNSW, partial

### Estimated Total

~150-200 migrations across all phases.

### Idempotency

All migrations must be idempotent:

```sql
CREATE TABLE IF NOT EXISTS ...
CREATE OR REPLACE FUNCTION ...
CREATE INDEX IF NOT EXISTS ...
CREATE EXTENSION IF NOT EXISTS ...

-- Enums (use DO block):
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (...);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
```

---

*This document is the complete backend specification for the HyperQuote platform. All database tables (94 + 2 materialized views), enums (50), RLS policies, triggers, functions, server functions, cron jobs (33), integrations, caching strategy, realtime channels, file storage, TypeScript types, and migration strategy are documented. Cross-reference with `FRONTEND.md` for state machines (SM.1-SM.8), business logic enforcement (BL.1-BL.16), and route map.*

*Created: 2026-03-29. Last updated: 2026-03-30.*
