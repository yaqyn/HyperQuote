-- Migration 010: Customer + Supplier + Address Domain Tables
-- 9 tables: customers, customer_contacts, addresses, credit_applications,
-- customer_feedback, suppliers, supplier_contacts, supplier_price_lists, supplier_agreements
-- Prerequisites: tenants, employees, auth.users (migration 003), products (migration 007)

-- ============================================================================
-- 1. customers
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  auth_user_id              UUID REFERENCES auth.users(id),
  customer_number           TEXT NOT NULL,
  company_name              TEXT NOT NULL,
  company_name_ar           TEXT,
  legal_name                TEXT,
  trade_name                TEXT,
  tier                      customer_tier DEFAULT 'tier_1_new',
  status                    TEXT DEFAULT 'unclaimed',
  phone                     TEXT,
  tax_id                    TEXT,
  tax_registration_number   TEXT,
  commercial_register       TEXT,
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
  payment_behavior_score    DECIMAL(5,2),
  composite_tier_score      DECIMAL(5,2),
  assigned_sales_rep        UUID REFERENCES employees(id),
  assigned_account_manager  UUID REFERENCES employees(id),
  website                   TEXT,
  notes                     TEXT,
  tags                      TEXT[],
  is_active                 BOOLEAN DEFAULT TRUE,
  onboarded_at              TIMESTAMPTZ,
  claimed_at                TIMESTAMPTZ,
  founded_date              DATE,
  employee_count_estimate   INTEGER,
  bounced_cheque_count      INTEGER DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, customer_number)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customers
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. customer_contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_contacts (
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

CREATE INDEX IF NOT EXISTS idx_customer_contacts_tenant_id ON customer_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer_id ON customer_contacts(customer_id);

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customer_contacts
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON customer_contacts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON customer_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. addresses (polymorphic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS addresses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  addressable_type          TEXT NOT NULL,
  addressable_id            UUID NOT NULL,
  address_type              address_type DEFAULT 'shipping',
  label                     TEXT,
  line_1                    TEXT NOT NULL,
  line_2                    TEXT,
  city                      TEXT NOT NULL,
  state_province            TEXT,
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

CREATE INDEX IF NOT EXISTS idx_addresses_tenant_id ON addresses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_addresses_addressable ON addresses(addressable_type, addressable_id);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON addresses
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON addresses
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 4. credit_applications
-- ============================================================================
CREATE TABLE IF NOT EXISTS credit_applications (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  customer_id               UUID NOT NULL REFERENCES customers(id),
  requested_limit           DECIMAL(15,2) NOT NULL,
  requested_terms           payment_terms,
  years_in_business         INTEGER,
  annual_revenue            DECIMAL(15,2),
  bank_name                 TEXT,
  bank_account_number_last4 TEXT,
  bank_contact              TEXT,
  trade_references          JSONB DEFAULT '[]',
  duns_number               TEXT,
  credit_score              INTEGER,
  credit_report_url         TEXT,
  credit_report_date        DATE,
  status                    credit_status DEFAULT 'pending_review',
  approved_limit            DECIMAL(15,2),
  approved_terms            payment_terms,
  decision_notes            TEXT,
  reviewed_by               UUID REFERENCES auth.users(id),
  reviewed_at               TIMESTAMPTZ,
  financial_statements_url  TEXT,
  application_form_url      TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_applications_tenant_id ON credit_applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_applications_customer_id ON credit_applications(customer_id);

ALTER TABLE credit_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON credit_applications
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON credit_applications
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON credit_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. customer_feedback
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_feedback (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  customer_id           UUID NOT NULL REFERENCES customers(id),
  delivery_id           UUID,  -- FK to deliveries(id) deferred to Plan 03 (deliveries table)
  order_id              UUID,  -- FK to orders(id) deferred to Plan 02 (orders table)
  nps_score             INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  csat_score            INTEGER CHECK (csat_score >= 1 AND csat_score <= 5),
  feedback_text         TEXT,
  survey_sent_at        TIMESTAMPTZ,
  survey_responded_at   TIMESTAMPTZ,
  channel               notification_channel,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN customer_feedback.delivery_id IS 'FK to deliveries(id) added when deliveries table is created';
COMMENT ON COLUMN customer_feedback.order_id IS 'FK to orders(id) added when orders table is created';

CREATE INDEX IF NOT EXISTS idx_customer_feedback_tenant_id ON customer_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer_id ON customer_feedback(customer_id);

ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON customer_feedback
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON customer_feedback
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- customer_feedback has no updated_at column, so no update trigger needed

-- ============================================================================
-- 6. suppliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  supplier_number          TEXT NOT NULL,
  company_name             TEXT NOT NULL,
  company_name_ar          TEXT,
  legal_name               TEXT,
  tax_registration_number  TEXT,
  commercial_register      TEXT,
  primary_contact_name     TEXT,
  primary_contact_email    TEXT,
  primary_contact_phone    TEXT,
  tax_id                   TEXT,
  website                  TEXT,
  product_categories       product_category[],
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

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_id ON suppliers(tenant_id);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON suppliers
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 7. supplier_contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_contacts (
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

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_tenant_id ON supplier_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier_id ON supplier_contacts(supplier_id);

ALTER TABLE supplier_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON supplier_contacts
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 8. supplier_price_lists
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_price_lists (
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

CREATE INDEX IF NOT EXISTS idx_supplier_price_lists_tenant_id ON supplier_price_lists(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_price_lists_supplier_id ON supplier_price_lists(supplier_id);

ALTER TABLE supplier_price_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON supplier_price_lists
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON supplier_price_lists
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supplier_price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 9. supplier_agreements
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_agreements (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  supplier_id               UUID NOT NULL REFERENCES suppliers(id),
  agreement_type            TEXT NOT NULL CHECK (agreement_type IN ('framework', 'exclusivity', 'volume_commitment')),
  start_date                DATE NOT NULL,
  end_date                  DATE NOT NULL,
  terms                     JSONB DEFAULT '{}'::jsonb,
  volume_target             DECIMAL(15,2),
  volume_actual             DECIMAL(15,2) DEFAULT 0,
  price_escalation_clause   TEXT,
  exclusivity_categories    TEXT[],
  document_url              TEXT,
  status                    TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_agreements_tenant_id ON supplier_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_agreements_supplier_id ON supplier_agreements(supplier_id);

ALTER TABLE supplier_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON supplier_agreements
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON supplier_agreements
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supplier_agreements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
