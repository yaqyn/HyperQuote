-- Migration 011: Product Extension Tables
-- 3 tables: product_suppliers, pricing_rules, contract_prices
-- Prerequisites: products (migration 007), customers (migration 010), suppliers (migration 010)

-- ============================================================================
-- 1. product_suppliers
-- ============================================================================
CREATE TABLE IF NOT EXISTS product_suppliers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  product_id            UUID NOT NULL REFERENCES products(id),
  supplier_id           UUID NOT NULL REFERENCES suppliers(id),
  supplier_sku          TEXT,
  supplier_product_name TEXT,
  unit_cost             DECIMAL(12,4),
  currency              TEXT DEFAULT 'EGP',
  price_list_id         UUID REFERENCES supplier_price_lists(id),
  minimum_order_qty     DECIMAL(12,3),
  price_breaks          JSONB DEFAULT '[]',
  lead_time_days        INTEGER DEFAULT 7,
  is_preferred          BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  last_quoted_at        TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, product_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_product_suppliers_tenant_id ON product_suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_product_id ON product_suppliers(product_id);
CREATE INDEX IF NOT EXISTS idx_product_suppliers_supplier_id ON product_suppliers(supplier_id);

ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON product_suppliers
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON product_suppliers
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON product_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. pricing_rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS pricing_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  customer_id      UUID REFERENCES customers(id),
  customer_tier    customer_tier,
  project_id       UUID REFERENCES projects(id),
  product_id       UUID REFERENCES products(id),
  product_category product_category,
  priority         INTEGER NOT NULL DEFAULT 100,
  rule_type        TEXT NOT NULL,
  fixed_price      DECIMAL(12,4),
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

CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_id ON pricing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_customer_id ON pricing_rules(customer_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_product_id ON pricing_rules(product_id);

ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON pricing_rules
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON pricing_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 3. contract_prices
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_prices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  customer_id     UUID NOT NULL REFERENCES customers(id),
  product_id      UUID NOT NULL REFERENCES products(id),
  contract_number TEXT,
  unit_price      DECIMAL(12,4) NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_contract_prices_tenant_id ON contract_prices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contract_prices_customer_id ON contract_prices(customer_id);
CREATE INDEX IF NOT EXISTS idx_contract_prices_product_id ON contract_prices(product_id);

ALTER TABLE contract_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON contract_prices
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT public.current_tenant_id()));

CREATE TRIGGER set_tenant_id BEFORE INSERT ON contract_prices
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON contract_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
