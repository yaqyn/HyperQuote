-- Migration 009: Quote Request Tables
-- Tables for customer quote requests, material list items, addresses, projects, and attachments.
-- RLS: external users scoped to own customer_id, internal users full tenant access.

-- ============================================================================
-- 1. customer_addresses
-- ============================================================================
CREATE TABLE customer_addresses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL,  -- FK to customers(id) added in Phase 13
  label           TEXT,
  street          TEXT NOT NULL,
  area            TEXT NOT NULL,
  city            TEXT NOT NULL,
  governorate     TEXT NOT NULL,
  landmark        TEXT,
  phone           TEXT,
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN customer_addresses.customer_id IS 'FK to customers(id) added in Phase 13 migration';

CREATE INDEX idx_customer_addresses_tenant_customer ON customer_addresses(tenant_id, customer_id);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;

-- External users: see/insert/update own addresses
CREATE POLICY "External users select own addresses" ON customer_addresses
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

CREATE POLICY "External users insert own addresses" ON customer_addresses
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

CREATE POLICY "External users update own addresses" ON customer_addresses
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  )
  WITH CHECK (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

-- Internal users: full access within tenant
CREATE POLICY "Internal users manage addresses" ON customer_addresses
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON customer_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. projects
-- ============================================================================
CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL,  -- FK to customers(id) added in Phase 13
  name            TEXT NOT NULL,
  description     TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN projects.customer_id IS 'FK to customers(id) added in Phase 13 migration';

CREATE INDEX idx_projects_tenant_customer ON projects(tenant_id, customer_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- External users: see/insert own projects
CREATE POLICY "External users select own projects" ON projects
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

CREATE POLICY "External users insert own projects" ON projects
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

-- Internal users: full access within tenant
CREATE POLICY "Internal users manage projects" ON projects
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. generate_request_number function
-- ============================================================================

-- Sequence for request numbers (global, not per-tenant for simplicity)
CREATE SEQUENCE IF NOT EXISTS quote_request_number_seq START WITH 1;

CREATE OR REPLACE FUNCTION generate_request_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num BIGINT;
BEGIN
  next_num := nextval('quote_request_number_seq');
  RETURN 'QR-' || extract(year FROM now())::TEXT || '-' || lpad(next_num::TEXT, 5, '0');
END;
$$;

-- ============================================================================
-- 4. quote_requests
-- ============================================================================
CREATE TABLE quote_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  customer_id         UUID NOT NULL,  -- FK to customers(id) added in Phase 13
  request_number      TEXT NOT NULL UNIQUE,
  status              quote_request_status NOT NULL DEFAULT 'draft',
  urgency             urgency NOT NULL DEFAULT 'standard',
  project_id          UUID REFERENCES projects(id),
  delivery_address_id UUID REFERENCES customer_addresses(id),
  delivery_date       DATE,
  notes               TEXT,
  attachment_urls     JSONB DEFAULT '[]',
  submitted_at        TIMESTAMPTZ,
  submitted_by        UUID REFERENCES auth.users(id),
  assigned_to         UUID REFERENCES user_profiles(id),
  idempotency_key     UUID,
  -- Approval fields (PORT-13)
  approval_required   BOOLEAN DEFAULT FALSE,
  approved_by         UUID REFERENCES user_profiles(id),
  approval_notes      TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON COLUMN quote_requests.customer_id IS 'FK to customers(id) added in Phase 13 migration';

CREATE INDEX idx_quote_requests_tenant_customer ON quote_requests(tenant_id, customer_id);
CREATE INDEX idx_quote_requests_tenant_status ON quote_requests(tenant_id, status);
CREATE INDEX idx_quote_requests_tenant_request_number ON quote_requests(tenant_id, request_number);
CREATE INDEX idx_quote_requests_idempotency ON quote_requests(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

-- External users: SELECT own quote requests
CREATE POLICY "External users select own quote requests" ON quote_requests
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

-- External users: INSERT own quote requests
CREATE POLICY "External users insert own quote requests" ON quote_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

-- External users: UPDATE own draft/submitted quote requests only
CREATE POLICY "External users update own quote requests" ON quote_requests
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
    AND status IN ('draft', 'submitted')
  )
  WITH CHECK (
    (SELECT is_external_user())
    AND customer_id = (SELECT current_customer_id())
  );

-- Internal users: full access within tenant
CREATE POLICY "Internal users manage quote requests" ON quote_requests
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate request_number on INSERT
CREATE OR REPLACE FUNCTION auto_set_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
    NEW.request_number := generate_request_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_request_number BEFORE INSERT ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION auto_set_request_number();

-- ============================================================================
-- 5. quote_request_items
-- ============================================================================
CREATE TABLE quote_request_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id      UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  product_id            UUID REFERENCES products(id),
  customer_description  TEXT NOT NULL,
  quantity              DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit_of_measure       unit_of_measure NOT NULL,
  notes                 TEXT,
  match_confidence      DECIMAL(3,2),
  sort_order            INTEGER NOT NULL DEFAULT 0,
  is_unmatched          BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_request_items_request ON quote_request_items(quote_request_id);

ALTER TABLE quote_request_items ENABLE ROW LEVEL SECURITY;

-- External users: access items where quote_request belongs to their customer
CREATE POLICY "External users select own items" ON quote_request_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_external_user())
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

CREATE POLICY "External users insert own items" ON quote_request_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_external_user())
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

CREATE POLICY "External users update own items" ON quote_request_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_external_user())
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

CREATE POLICY "External users delete own items" ON quote_request_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_external_user())
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

-- Internal users: full access via quote_request tenant
CREATE POLICY "Internal users manage items" ON quote_request_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_internal_user())
        AND qr.tenant_id = (SELECT current_tenant_id())
    )
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON quote_request_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 6. quote_request_attachments
-- ============================================================================
CREATE TABLE quote_request_attachments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id  UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  file_url          TEXT NOT NULL,
  file_name         TEXT NOT NULL,
  file_size         INTEGER,
  mime_type         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_request_attachments_request ON quote_request_attachments(quote_request_id);

ALTER TABLE quote_request_attachments ENABLE ROW LEVEL SECURITY;

-- External users: access attachments where quote_request belongs to their customer
CREATE POLICY "External users select own attachments" ON quote_request_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_external_user())
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

CREATE POLICY "External users insert own attachments" ON quote_request_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_external_user())
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

CREATE POLICY "External users delete own attachments" ON quote_request_attachments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_external_user())
        AND qr.customer_id = (SELECT current_customer_id())
    )
  );

-- Internal users: full access via quote_request tenant
CREATE POLICY "Internal users manage attachments" ON quote_request_attachments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quote_requests qr
      WHERE qr.id = quote_request_id
        AND (SELECT is_internal_user())
        AND qr.tenant_id = (SELECT current_tenant_id())
    )
  );

-- ============================================================================
-- Note: approvals table already exists in migration 003 (auth_tables).
-- No additional approvals table needed. Quote request approvals use the
-- existing approvals table with entity_type = 'quote_request' and
-- entity_id = quote_request.id.
-- ============================================================================
