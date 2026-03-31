# Phase 13: Database -- Order + Delivery + Finance Tables

## Goal
All core business tables exist with RLS policies, state machine enforcement, and indexes — enabling the internal platform to read and write real business data.

## Dependencies
- Phase 2 (Supabase + Initial Migrations) must be complete — extensions, enums, auth tables, RLS helpers, seed data

## Requirements

- **DB-01**: All 94 tables + 2 materialized views created with correct types, constraints, and indexes
- **DB-03**: RLS policies for all tables — internal users by tenant, external customers by customer_id, suppliers by supplier_id, drivers by driver_id
- **DB-05**: State machine transition function + enforcement triggers for all state machines (quote request, quote, order, PO, delivery, invoice, payment)

## Success Criteria
1. All order, procurement, delivery, and finance tables exist with correct types, constraints, and indexes
2. RLS policies block cross-tenant and cross-customer access for every table
3. State machine transition function enforces valid-only transitions for quote_request, quote, order, PO, delivery, invoice, and payment
4. `EXPLAIN ANALYZE` on key queries shows index usage (no sequential scans on RLS-filtered columns)

## What to Build

Migrations for all core business tables across these domains:

### Order Domain
- `orders`
- `order_items`

### Procurement Domain
- `supplier_pos`
- `supplier_po_items`
- `supplier_inquiries`

### Inventory Domain
- `warehouses`
- `warehouse_locations`
- `inventory`
- `stock_movements`
- `inventory_transfers`
- `cycle_counts`
- `source_inventory`
- `inventory_reservations`

### Delivery Domain
- `vehicles`
- `drivers`
- `delivery_routes`
- `deliveries`
- `delivery_items`
- `proof_of_delivery`
- `drop_ship_pod`
- `driver_locations` (partitioned by recorded_at)
- `vehicle_inspections`
- `driver_shifts`
- `load_verifications`

### Finance Domain
- `invoices`
- `invoice_items`
- `invoice_disputes`
- `payments`
- `payment_applications`
- `cheque_tracking`
- `letters_of_credit`
- `credit_notes`
- `credit_note_applications`
- `withholding_tax_certificates`
- `company_bank_accounts`
- `supplier_invoices`
- `supplier_invoice_items`
- `ar_aging_snapshots`
- `revenue_recognition_events`
- `returns`

### Driver Marketplace
- `driver_jobs`
- `driver_earnings`

### Delivery Zones
- `delivery_zones`

### Customer Domain (from Section 3.2, previously unassigned)
- `customer_feedback`

Plus: all RLS policies, state machine transition function, enforcement triggers, all indexes.

## IMPORTANT: Read Full SQL from BACKEND.md at Build Time

**Phase 13 covers approximately 40+ core business tables.** The full CREATE TABLE SQL is too large to embed inline in this context file. At execution time, the executor **MUST read BACKEND.md Sections 3.5-3.10 directly** for complete table definitions.

**Complete table list by domain:**

- **Quote (3.5):** `quote_requests`, `quote_request_items`, `quotes`, `quote_items`
- **Order (3.6):** `orders`, `order_items`
- **Procurement (3.7):** `supplier_pos`, `supplier_po_items`, `supplier_inquiries`
- **Inventory (3.8):** `warehouses`, `warehouse_locations`, `inventory`, `stock_movements`, `inventory_transfers`, `cycle_counts`, `source_inventory`, `inventory_reservations`
- **Delivery (3.9):** `vehicles`, `drivers`, `delivery_routes`, `deliveries`, `delivery_items`, `proof_of_delivery`, `drop_ship_pod`, `driver_locations` (partitioned), `vehicle_inspections`, `driver_shifts`, `load_verifications`
- **Finance (3.10):** `invoices`, `invoice_items`, `invoice_disputes`, `payments`, `payment_applications`, `cheque_tracking`, `letters_of_credit`, `credit_notes`, `credit_note_applications`, `withholding_tax_certificates`, `company_bank_accounts`, `supplier_invoices`, `supplier_invoice_items`, `ar_aging_snapshots`, `revenue_recognition_events`, `returns`
- **Driver Marketplace (3.11):** `driver_jobs`, `driver_earnings`
- **Delivery Zones (3.12):** `delivery_zones`
- **Customer domain (3.2):** `customer_feedback` (see note below)

**Note:** `change_orders` table referenced in GSD.md does **NOT exist** in BACKEND.md. Changes are tracked via quote versioning instead (quotes have version numbers, `quote_request_id` links versions).

**Note:** `customer_feedback` table (BACKEND.md Section 3.2 Customer domain) is included in Phase 13 scope — it was not previously assigned to any phase.

## Spec References — Complete CREATE TABLE Statements (Key Tables Embedded)

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
  total_cost                  DECIMAL(15,2),
  margin_amount               DECIMAL(15,2),
  margin_percent              DECIMAL(5,2),
  payment_terms               payment_terms,
  payment_instrument_type     payment_method,
  payment_instrument_reference TEXT,
  payment_instrument_verified BOOLEAN DEFAULT FALSE,
  delivery_address_id         UUID REFERENCES addresses(id),
  requested_delivery_date     DATE,
  total_items                 INTEGER DEFAULT 0,
  fulfilled_items             INTEGER DEFAULT 0,
  hold_reason                 TEXT,
  cancellation_reason         TEXT,
  cancellation_fee            DECIMAL(15,2),
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
  product_name         TEXT NOT NULL,
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
  supplier_po_id       UUID,
  warehouse_id         UUID,
  is_fulfilled         BOOLEAN DEFAULT FALSE,
  is_backordered       BOOLEAN DEFAULT FALSE,
  sort_order           INTEGER DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

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
  supplier_reference_number TEXT,
  inspection_result         inspection_result,
  inspection_notes          TEXT,
  inspected_by              UUID REFERENCES auth.users(id),
  inspected_at              TIMESTAMPTZ,
  receiving_warehouse_id    UUID,
  approved_by               UUID REFERENCES auth.users(id),
  approved_at               TIMESTAMPTZ,
  created_by                UUID REFERENCES auth.users(id),
  internal_notes            TEXT,
  supplier_notes            TEXT,
  sent_at                   TIMESTAMPTZ,
  confirmed_at              TIMESTAMPTZ,
  received_at               TIMESTAMPTZ,
  closed_at                 TIMESTAMPTZ,
  source_currency           TEXT DEFAULT 'EGP',
  exchange_rate             DECIMAL(18,8),
  exchange_rate_locked_at   TIMESTAMPTZ,
  coded_delivery_reference  TEXT,
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
  product_name      TEXT NOT NULL,
  supplier_sku      TEXT,
  quantity          DECIMAL(12,3) NOT NULL,
  received_quantity DECIMAL(12,3) DEFAULT 0,
  rejected_quantity DECIMAL(12,3) DEFAULT 0,
  unit_of_measure   unit_of_measure NOT NULL,
  unit_cost         DECIMAL(12,4) NOT NULL,
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
  status           TEXT DEFAULT 'sent',
  response_due_date DATE,
  responded_at     TIMESTAMPTZ,
  response_notes   TEXT,
  items            JSONB NOT NULL DEFAULT '[]',
  response_items   JSONB DEFAULT '[]',
  sent_by          UUID REFERENCES auth.users(id),
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, inquiry_number)
);
```

### 3.8 Inventory

(All 8 tables: warehouses, warehouse_locations, inventory, stock_movements, inventory_transfers, cycle_counts, source_inventory, inventory_reservations — full CREATE TABLE statements in BACKEND.md Section 3.8. Each table has tenant_id FK, appropriate constraints, and computed columns like `quantity_available` and `atp` on inventory.)

### 3.9 Delivery

(All 11 tables: vehicles, drivers, delivery_routes, deliveries, delivery_items, proof_of_delivery, drop_ship_pod, driver_locations (partitioned), vehicle_inspections, driver_shifts, load_verifications — full CREATE TABLE statements in BACKEND.md Section 3.9.)

### 3.10 Finance

(All 16 tables: invoices, invoice_items, invoice_disputes, payments, payment_applications, cheque_tracking, letters_of_credit, credit_notes, credit_note_applications, withholding_tax_certificates, company_bank_accounts, supplier_invoices, supplier_invoice_items, ar_aging_snapshots, revenue_recognition_events, returns — full CREATE TABLE statements in BACKEND.md Section 3.10.)

### 3.11 Driver Marketplace

(driver_jobs, driver_earnings — full statements in BACKEND.md Section 3.11.)

### 3.12 Delivery Zones

(delivery_zones — full statement in BACKEND.md Section 3.12.)

### State Machine: validate_state_transition()

```sql
CREATE OR REPLACE FUNCTION public.validate_state_transition(
  entity_type TEXT, old_status TEXT, new_status TEXT
)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF old_status = new_status THEN RETURN TRUE; END IF;
  RETURN CASE entity_type
    WHEN 'quote_request' THEN
      CASE old_status
        WHEN 'draft' THEN new_status IN ('submitted', 'withdrawn', 'cancelled')
        WHEN 'submitted' THEN new_status IN ('under_review', 'withdrawn', 'cancelled')
        WHEN 'under_review' THEN new_status IN ('sourcing', 'on_hold', 'rejected', 'cancelled')
        WHEN 'sourcing' THEN new_status IN ('quote_ready', 'on_hold', 'cancelled')
        WHEN 'quote_ready' THEN FALSE
        WHEN 'on_hold' THEN new_status IN ('under_review', 'sourcing', 'cancelled')
        ELSE FALSE
      END
    WHEN 'quote' THEN
      CASE old_status
        WHEN 'draft' THEN new_status IN ('internal_review', 'cancelled')
        WHEN 'internal_review' THEN new_status IN ('pending_approval', 'draft', 'cancelled')
        WHEN 'pending_approval' THEN new_status IN ('approved', 'draft', 'cancelled')
        WHEN 'approved' THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent' THEN new_status IN ('viewed', 'negotiating', 'accepted', 'declined', 'expired')
        WHEN 'viewed' THEN new_status IN ('negotiating', 'accepted', 'declined', 'expired')
        WHEN 'negotiating' THEN new_status IN ('revised', 'accepted', 'declined', 'cancelled')
        WHEN 'revised' THEN new_status IN ('internal_review', 'sent', 'cancelled')
        WHEN 'declined' THEN new_status IN ('requires_re_quote')
        WHEN 'expired' THEN new_status IN ('requires_re_quote')
        WHEN 'requires_re_quote' THEN new_status IN ('draft')
        ELSE FALSE
      END
    WHEN 'order' THEN
      CASE old_status
        WHEN 'confirmed' THEN new_status IN ('processing', 'on_hold', 'cancellation_requested', 'cancelled')
        WHEN 'processing' THEN new_status IN ('partially_fulfilled', 'fulfilled', 'on_hold', 'back_ordered', 'cancellation_requested')
        WHEN 'partially_fulfilled' THEN new_status IN ('fulfilled', 'on_hold', 'back_ordered')
        WHEN 'fulfilled' THEN new_status IN ('completed')
        WHEN 'on_hold' THEN new_status IN ('confirmed', 'processing', 'cancelled')
        WHEN 'cancellation_requested' THEN new_status IN ('cancelled', 'processing')
        WHEN 'back_ordered' THEN new_status IN ('processing', 'on_hold', 'cancelled')
        ELSE FALSE
      END
    WHEN 'supplier_po' THEN
      CASE old_status
        WHEN 'draft' THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent' THEN new_status IN ('confirmed', 'rejected', 'cancelled')
        WHEN 'confirmed' THEN new_status IN ('in_production', 'shipped', 'cancelled')
        WHEN 'in_production' THEN new_status IN ('shipped', 'cancelled')
        WHEN 'shipped' THEN new_status IN ('partially_received', 'received')
        WHEN 'partially_received' THEN new_status IN ('received')
        WHEN 'received' THEN new_status IN ('inspected')
        WHEN 'inspected' THEN new_status IN ('closed', 'received')
        ELSE FALSE
      END
    WHEN 'delivery' THEN
      CASE old_status
        WHEN 'scheduled' THEN new_status IN ('picking_loading', 'cancelled')
        WHEN 'picking_loading' THEN new_status IN ('dispatched', 'cancelled')
        WHEN 'dispatched' THEN new_status IN ('in_transit')
        WHEN 'in_transit' THEN new_status IN ('at_site', 'failed')
        WHEN 'at_site' THEN new_status IN ('delivered', 'partially_delivered', 'returned', 'failed')
        WHEN 'partially_delivered' THEN new_status IN ('rescheduled')
        WHEN 'failed' THEN new_status IN ('rescheduled')
        WHEN 'rescheduled' THEN new_status IN ('scheduled')
        ELSE FALSE
      END
    WHEN 'invoice' THEN
      CASE old_status
        WHEN 'draft' THEN new_status IN ('sent', 'cancelled')
        WHEN 'sent' THEN new_status IN ('viewed', 'partially_paid', 'paid', 'overdue', 'disputed', 'cancelled')
        WHEN 'viewed' THEN new_status IN ('partially_paid', 'paid', 'overdue', 'disputed')
        WHEN 'partially_paid' THEN new_status IN ('paid', 'overdue', 'disputed')
        WHEN 'overdue' THEN new_status IN ('partially_paid', 'paid', 'collections', 'disputed', 'written_off')
        WHEN 'collections' THEN new_status IN ('partially_paid', 'paid', 'disputed', 'written_off')
        WHEN 'disputed' THEN new_status IN ('sent', 'adjusted', 'written_off')
        WHEN 'adjusted' THEN new_status IN ('sent', 'partially_paid', 'paid')
        ELSE FALSE
      END
    WHEN 'payment' THEN
      CASE old_status
        WHEN 'expected' THEN new_status IN ('received')
        WHEN 'received' THEN new_status IN ('matched', 'unmatched')
        WHEN 'matched' THEN new_status IN ('fully_applied', 'partially_applied', 'overpayment')
        WHEN 'unmatched' THEN new_status IN ('matched')
        WHEN 'partially_applied' THEN new_status IN ('fully_applied')
        WHEN 'overpayment' THEN new_status IN ('fully_applied', 'refunded')
        ELSE FALSE
      END
    ELSE RAISE EXCEPTION 'Unknown entity type: %', entity_type;
  END CASE;
END;
$$;
```

### Enforcement Triggers

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

-- Apply to ALL state machine tables (including quote_requests and quotes):
CREATE TRIGGER trg_quote_requests_state BEFORE UPDATE OF status ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_quotes_state BEFORE UPDATE OF status ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_orders_state BEFORE UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_supplier_pos_state BEFORE UPDATE OF status ON public.supplier_pos FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_deliveries_state BEFORE UPDATE OF status ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_invoices_state BEFORE UPDATE OF status ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
CREATE TRIGGER trg_payments_state BEFORE UPDATE OF status ON public.payments FOR EACH ROW EXECUTE FUNCTION public.enforce_state_transition();
```

### RLS Policies (all tables)

See BACKEND.md Section 4.2 for complete policies. Key patterns:
- Internal users: `(SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())`
- Customers: `(SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())`
- Suppliers: `(SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id())`
- Drivers: `(SELECT is_external_user()) AND driver_id = (SELECT current_driver_id())`
- All use `(SELECT auth.uid())` subquery form for performance

**Financial tables MFA gating (key pattern):**
```sql
-- Financial tables (invoices, payments, cheque_tracking, credit_notes, etc.)
-- require AAL2 (MFA) for access:
CREATE POLICY finance_mfa_select ON public.invoices
  FOR SELECT TO authenticated
  USING (
    (auth.jwt()->>'aal') = 'aal2'
    AND tenant_id = (SELECT current_tenant_id())
  );
-- Apply similar pattern to: payments, payment_applications, cheque_tracking,
-- letters_of_credit, credit_notes, credit_note_applications,
-- withholding_tax_certificates, ar_aging_snapshots, revenue_recognition_events
```

### Indexes (from BACKEND.md Section 8)

All RLS-critical indexes (tenant_id on every table), composite indexes (customer+status, driver+date), partial indexes, full-text search (GIN), and pgvector (HNSW) indexes.

**Key partial and composite indexes (must be created):**
```sql
-- Active quotes (for expiry check cron)
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes (tenant_id, valid_until) WHERE status IN ('sent', 'viewed');

-- Overdue invoices (for AR reminder crons)
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON invoices (tenant_id, due_date) WHERE status IN ('sent', 'viewed', 'partially_paid', 'overdue');

-- Unmatched payments (for reconciliation)
CREATE INDEX IF NOT EXISTS idx_payments_unmatched ON payments (tenant_id, status, received_date) WHERE status IN ('received', 'unmatched');

-- Low stock (for reorder alerts)
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory (tenant_id, warehouse_id) WHERE quantity_available <= reorder_point;

-- Pending approvals
CREATE INDEX IF NOT EXISTS idx_approvals_pending ON approvals (tenant_id, assigned_to, status) WHERE status = 'pending';

-- Unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC) WHERE is_read = FALSE;

-- Drop-ship POD auto-confirm deadline
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_auto_deadline ON drop_ship_pod (auto_confirm_deadline) WHERE status = 'awaiting_customer_confirmation' AND auto_confirmed = FALSE;

-- Customer feedback
CREATE INDEX IF NOT EXISTS idx_customer_feedback_tenant ON customer_feedback (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer ON customer_feedback (customer_id);
```

See BACKEND.md Section 8 for the complete index list (50+ indexes).

## Non-Negotiable Rules

1. **All migrations must be idempotent:** `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DO $$ BEGIN CREATE TYPE ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
2. **RLS on every table.** `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`.
3. **`(SELECT auth.uid())` pattern** in all RLS policies (99.99% performance improvement).
4. **State machine enforcement** via trigger — no jumping from confirmed to delivered.
5. **Partitioned tables:** `driver_locations` partitioned by `recorded_at` for efficient pruning. `audit_log` partitioned by `created_at`.
6. **Financial tables require MFA** (AAL2) in RLS policies.
7. **VAT is 14%.** Default tax_rate in system_settings.
8. **LIFO prohibited** under Egyptian Accounting Standards — `prevent_lifo_costing()` trigger on tenants.

## Known Risks & Gotchas

- **FK order matters:** Tables reference each other — create in dependency order (orders before order_items before deliveries, etc.).
- **Deferred FKs:** Some FKs are deferred (order_items.supplier_po_id, deliveries.invoice_id) because the referenced table may not exist yet at migration time.
- **Partitioned tables** need partition creation (monthly for driver_locations, monthly for audit_log).
- **Generated columns** (inventory.quantity_available, inventory.atp, invoices.balance_due, etc.) use `GENERATED ALWAYS AS ... STORED`.
- **revenue_recognition_events** has generated columns that reference other columns — test carefully.

## Tips

- Run `EXPLAIN ANALYZE` on key queries to verify index usage after migration.
- Create indexes AFTER data load for better performance during initial seed.
- Test RLS with different JWT claims (internal, customer, supplier, driver).
- Use `supabase migration new` for each logical group of tables.
