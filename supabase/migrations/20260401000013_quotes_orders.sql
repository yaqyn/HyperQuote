-- Migration 013: Quotes + Orders Tables
-- Tables for quotes, quote items, orders, and order items.
-- Do NOT recreate: quote_requests, quote_request_items, quote_request_attachments (exist in migration 009).

-- ============================================================================
-- 1. quotes
-- ============================================================================
CREATE TABLE IF NOT EXISTS quotes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  quote_number            TEXT NOT NULL,
  quote_request_id        UUID REFERENCES quote_requests(id),
  customer_id             UUID NOT NULL REFERENCES customers(id),
  project_id              UUID REFERENCES projects(id),
  version_number          INTEGER DEFAULT 1,
  previous_version_id     UUID REFERENCES quotes(id),
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
  eta_uuid                TEXT,
  validity_days           INTEGER DEFAULT 30,
  valid_until             DATE,
  requires_approval       BOOLEAN DEFAULT FALSE,
  approval_threshold      DECIMAL(15,2),
  approved_by             UUID REFERENCES auth.users(id),
  approved_at             TIMESTAMPTZ,
  customer_po_reference   TEXT,
  company_stamp_url       TEXT,
  digital_signature_url   TEXT,
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
  source_currency         TEXT DEFAULT 'EGP',
  exchange_rate           DECIMAL(18,8),
  exchange_rate_locked_at TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, quote_number)
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant_customer ON quotes(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_status ON quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_request ON quotes(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(tenant_id, valid_until) WHERE status IN ('sent', 'viewed');

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage quotes" ON quotes
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE POLICY "External users select own quotes" ON quotes
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. quote_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS quote_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id              UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  quote_request_item_id UUID REFERENCES quote_request_items(id),
  product_id            UUID NOT NULL REFERENCES products(id),
  product_name          TEXT NOT NULL,
  product_sku           TEXT,
  description           TEXT,
  quantity              DECIMAL(12,3) NOT NULL,
  unit_of_measure       unit_of_measure NOT NULL,
  supplier_cost         DECIMAL(15,2),
  unit_price            DECIMAL(12,4) NOT NULL,
  discount_percent      DECIMAL(5,2) DEFAULT 0,
  line_total            DECIMAL(15,2) NOT NULL,
  margin_percent        DECIMAL(5,2),
  margin_amount         DECIMAL(15,2),
  freshness_indicator   stock_confidence,
  pricing_rule_id       UUID REFERENCES pricing_rules(id),
  pricing_source        TEXT,
  supplier_id           UUID REFERENCES suppliers(id),
  lead_time_days        INTEGER,
  is_accepted           BOOLEAN,
  sort_order            INTEGER DEFAULT 0,
  notes                 TEXT,
  customer_counter_price DECIMAL(15,4),
  line_status           TEXT DEFAULT 'pending',
  rejection_reason      TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_product ON quote_items(product_id);

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage quote items" ON quote_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_id
        AND (SELECT is_internal_user())
        AND q.tenant_id = (SELECT current_tenant_id())
    )
  );

CREATE POLICY "External users select own quote items" ON quote_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
      WHERE q.id = quote_id
        AND (SELECT is_external_user())
        AND q.customer_id = (SELECT current_customer_id())
    )
  );

-- ============================================================================
-- 3. orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
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

CREATE INDEX IF NOT EXISTS idx_orders_tenant_customer ON orders(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_quote ON orders(quote_id);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage orders" ON orders
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE POLICY "External users select own orders" ON orders
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user()) AND customer_id = (SELECT current_customer_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 4. order_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
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
  supplier_po_id       UUID,          -- FK to supplier_pos(id) deferred to migration 014
  warehouse_id         UUID,          -- FK to warehouses(id) deferred to migration 014
  is_fulfilled         BOOLEAN DEFAULT FALSE,
  is_backordered       BOOLEAN DEFAULT FALSE,
  sort_order           INTEGER DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage order items" ON order_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (SELECT is_internal_user())
        AND o.tenant_id = (SELECT current_tenant_id())
    )
  );

CREATE POLICY "External users select own order items" ON order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (SELECT is_external_user())
        AND o.customer_id = (SELECT current_customer_id())
    )
  );
