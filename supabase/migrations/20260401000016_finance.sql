-- Migration 016: Finance Domain Tables
-- 16 tables: invoices, invoice_items, invoice_disputes, payments, payment_applications,
-- cheque_tracking, letters_of_credit, returns, credit_notes, credit_note_applications,
-- withholding_tax_certificates, company_bank_accounts, supplier_invoices,
-- supplier_invoice_items, ar_aging_snapshots, revenue_recognition_events
-- Plus circular FK resolution (returns <-> credit_notes) and deferred FKs from Plan 03

-- ============================================================
-- 1. invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  invoice_number          TEXT NOT NULL,
  invoice_type            invoice_type DEFAULT 'standard',
  order_id                UUID NOT NULL REFERENCES orders(id),
  delivery_id             UUID REFERENCES deliveries(id),
  quote_id                UUID REFERENCES quotes(id),
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
  eta_uuid                TEXT,
  eta_status              TEXT,
  eta_submission_date     TIMESTAMPTZ,
  digital_signature_url   TEXT,
  company_stamp_url       TEXT,
  buyer_trn               TEXT,
  seller_trn              TEXT,
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
  cogs_amount             DECIMAL(15,2),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, invoice_number)
);

COMMENT ON COLUMN invoices.delivery_id IS
  'Required for standard/final invoices (set by trg_delivery_confirmed). NULL for proforma invoices.';

CREATE TRIGGER set_tenant_id_invoices
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. invoice_items
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_items (
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

-- ============================================================
-- 3. invoice_disputes
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice_disputes (
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
  sla_deadline      TIMESTAMPTZ NOT NULL,
  escalated_at      TIMESTAMPTZ,
  escalated_to      UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tenant_id_invoice_disputes
  BEFORE INSERT ON invoice_disputes
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_invoice_disputes
  BEFORE UPDATE ON invoice_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. payments
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  payment_number        TEXT NOT NULL,
  customer_id           UUID NOT NULL REFERENCES customers(id),
  status                payment_status DEFAULT 'received',
  payment_method        payment_method NOT NULL,
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

CREATE TRIGGER set_tenant_id_payments
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_payments
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. payment_applications
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_applications (
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

-- ============================================================
-- 6. cheque_tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS cheque_tracking (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  payment_id            UUID NOT NULL REFERENCES payments(id),
  cheque_number         TEXT NOT NULL,
  bank_name             TEXT NOT NULL,
  branch_name           TEXT,
  amount                DECIMAL(15,2) NOT NULL,
  currency              TEXT DEFAULT 'EGP',
  issue_date            DATE NOT NULL,
  due_date              DATE NOT NULL,
  status                TEXT DEFAULT 'pending',
  deposited_at          TIMESTAMPTZ,
  cleared_at            TIMESTAMPTZ,
  bounced_at            TIMESTAMPTZ,
  bounce_count          INTEGER DEFAULT 0,
  bounce_reason         TEXT,
  replacement_cheque_id UUID REFERENCES cheque_tracking(id),
  notes                 TEXT,
  created_by            UUID REFERENCES auth.users(id),
  payer_name            TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, cheque_number, bank_name)
);

CREATE TRIGGER set_tenant_id_cheque_tracking
  BEFORE INSERT ON cheque_tracking
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_cheque_tracking
  BEFORE UPDATE ON cheque_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. letters_of_credit
-- ============================================================
CREATE TABLE IF NOT EXISTS letters_of_credit (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  lc_number             TEXT NOT NULL UNIQUE,
  lc_type               TEXT NOT NULL,
  applicant_customer_id UUID NOT NULL REFERENCES customers(id),
  issuing_bank          TEXT NOT NULL,
  amount                DECIMAL(15,2) NOT NULL,
  currency              TEXT DEFAULT 'EGP',
  amount_drawn          DECIMAL(15,2) DEFAULT 0,
  amount_available      DECIMAL(15,2) GENERATED ALWAYS AS (amount - amount_drawn) STORED,
  issue_date            DATE NOT NULL,
  expiry_date           DATE NOT NULL,
  status                lc_status NOT NULL DEFAULT 'draft',
  documents_required    JSONB DEFAULT '[]',
  amendments            JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tenant_id_letters_of_credit
  BEFORE INSERT ON letters_of_credit
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_letters_of_credit
  BEFORE UPDATE ON letters_of_credit
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 8. returns (credit_note_id column WITHOUT FK — added after credit_notes exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS returns (
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
  credit_note_id         UUID,  -- FK added after credit_notes table created (circular dependency)
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

CREATE TRIGGER set_tenant_id_returns
  BEFORE INSERT ON returns
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_returns
  BEFORE UPDATE ON returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 9. credit_notes (return_id FK to returns — safe, returns already exists)
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_notes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  credit_note_number  TEXT NOT NULL,
  customer_id         UUID NOT NULL REFERENCES customers(id),
  return_id           UUID REFERENCES returns(id),
  invoice_id          UUID REFERENCES invoices(id),
  original_invoice_id UUID REFERENCES invoices(id),
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

CREATE TRIGGER set_tenant_id_credit_notes
  BEFORE INSERT ON credit_notes
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_credit_notes
  BEFORE UPDATE ON credit_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 10. credit_note_applications
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_note_applications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES credit_notes(id),
  invoice_id     UUID NOT NULL REFERENCES invoices(id),
  amount         DECIMAL(15,2) NOT NULL,
  applied_at     TIMESTAMPTZ DEFAULT NOW(),
  applied_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. withholding_tax_certificates
-- ============================================================
CREATE TABLE IF NOT EXISTS withholding_tax_certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  supplier_id        UUID NOT NULL REFERENCES suppliers(id),
  payment_id         UUID NOT NULL REFERENCES payments(id),
  gross_amount       DECIMAL(15,2) NOT NULL,
  withholding_rate   DECIMAL(5,2) NOT NULL,
  withholding_amount DECIMAL(15,2) NOT NULL,
  certificate_number TEXT NOT NULL UNIQUE,
  quarter            TEXT NOT NULL,
  year               INTEGER NOT NULL,
  pdf_url            TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tenant_id_withholding_tax_certificates
  BEFORE INSERT ON withholding_tax_certificates
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================
-- 12. company_bank_accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS company_bank_accounts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  bank_name            TEXT NOT NULL,
  bank_name_ar         TEXT,
  account_number_last4 TEXT,
  iban                 TEXT,
  swift_code           TEXT,
  branch               TEXT,
  currency             TEXT DEFAULT 'EGP',
  is_active            BOOLEAN DEFAULT TRUE,
  is_default           BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tenant_id_company_bank_accounts
  BEFORE INSERT ON company_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_company_bank_accounts
  BEFORE UPDATE ON company_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 13. supplier_invoices
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_invoices (
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

CREATE TRIGGER set_tenant_id_supplier_invoices
  BEFORE INSERT ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_supplier_invoices
  BEFORE UPDATE ON supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 14. supplier_invoice_items
-- ============================================================
CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id),
  po_line_item_id     UUID REFERENCES supplier_po_items(id),
  product_id          UUID NOT NULL REFERENCES products(id),
  description         TEXT,
  quantity            DECIMAL(15,4) NOT NULL,
  unit_price          DECIMAL(15,4) NOT NULL,
  line_total          DECIMAL(15,2) NOT NULL,
  po_quantity         DECIMAL(15,4),
  po_unit_price       DECIMAL(15,4),
  received_quantity   DECIMAL(15,4),
  match_status        TEXT NOT NULL DEFAULT 'unmatched'
                        CHECK (match_status IN ('matched', 'variance_within_tolerance', 'variance_exceeds', 'unmatched')),
  variance_amount     DECIMAL(15,2),
  variance_percent    DECIMAL(5,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tenant_id_supplier_invoice_items
  BEFORE INSERT ON supplier_invoice_items
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================
-- 15. ar_aging_snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS ar_aging_snapshots (
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

CREATE TRIGGER set_tenant_id_ar_aging_snapshots
  BEFORE INSERT ON ar_aging_snapshots
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================
-- 16. revenue_recognition_events
-- ============================================================
CREATE TABLE IF NOT EXISTS revenue_recognition_events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES tenants(id),
  invoice_id             UUID NOT NULL REFERENCES invoices(id),
  delivery_id            UUID NOT NULL REFERENCES deliveries(id),
  order_id               UUID NOT NULL REFERENCES orders(id),
  customer_id            UUID NOT NULL REFERENCES customers(id),
  -- EAS 48 five-step model
  recognition_date       DATE NOT NULL,
  recognition_basis      TEXT NOT NULL DEFAULT 'point_in_time',
  performance_obligation TEXT NOT NULL DEFAULT 'goods_delivery',
  -- Revenue amounts
  gross_revenue          DECIMAL(15,2) NOT NULL,
  cost_of_goods_sold     DECIMAL(15,2) NOT NULL,
  delivery_cost          DECIMAL(15,2) DEFAULT 0,
  gross_margin           DECIMAL(15,2) GENERATED ALWAYS AS (gross_revenue - cost_of_goods_sold - delivery_cost) STORED,
  margin_percent         DECIMAL(5,2) GENERATED ALWAYS AS (
                           CASE WHEN gross_revenue > 0
                             THEN ((gross_revenue - cost_of_goods_sold - delivery_cost) / gross_revenue * 100)
                             ELSE 0
                           END
                         ) STORED,
  vat_amount             DECIMAL(15,2) DEFAULT 0,
  currency               TEXT DEFAULT 'EGP',
  -- Principal vs Agent (EAS 48 B34-B38)
  is_principal           BOOLEAN NOT NULL DEFAULT TRUE,
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

CREATE TRIGGER set_tenant_id_revenue_recognition_events
  BEFORE INSERT ON revenue_recognition_events
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================
-- Circular FK resolution: returns.credit_note_id -> credit_notes(id)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE returns ADD CONSTRAINT fk_returns_credit_note
    FOREIGN KEY (credit_note_id) REFERENCES credit_notes(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Deferred FK from Plan 03: deliveries.invoice_id -> invoices(id)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE deliveries ADD CONSTRAINT fk_deliveries_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Deferred FK from Plan 03: drop_ship_pod.invoice_id -> invoices(id)
DO $$ BEGIN
  ALTER TABLE drop_ship_pod ADD CONSTRAINT fk_drop_ship_pod_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
