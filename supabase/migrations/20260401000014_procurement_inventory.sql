-- Migration 014: Procurement + Inventory Tables + Deferred FKs
-- 3 procurement tables (supplier_pos, supplier_po_items, supplier_inquiries)
-- 8 inventory tables (warehouses through inventory_reservations)
-- Deferred FK additions for order_items and supplier_pos

-- ============================================================================
-- 1. supplier_pos
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_pos (
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
  receiving_warehouse_id    UUID,          -- FK to warehouses(id) deferred to bottom of migration
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

CREATE INDEX IF NOT EXISTS idx_supplier_pos_tenant_supplier ON supplier_pos(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_pos_tenant_status ON supplier_pos(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_pos_order ON supplier_pos(order_id);

ALTER TABLE supplier_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_pos FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage supplier POs" ON supplier_pos
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE POLICY "Suppliers select own POs" ON supplier_pos
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON supplier_pos
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supplier_pos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 2. supplier_po_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_po_items (
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

CREATE INDEX IF NOT EXISTS idx_supplier_po_items_po ON supplier_po_items(supplier_po_id);
CREATE INDEX IF NOT EXISTS idx_supplier_po_items_product ON supplier_po_items(product_id);

ALTER TABLE supplier_po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_po_items FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage PO items" ON supplier_po_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supplier_pos sp
      WHERE sp.id = supplier_po_id
        AND (SELECT is_internal_user())
        AND sp.tenant_id = (SELECT current_tenant_id())
    )
  );

CREATE POLICY "Suppliers select own PO items" ON supplier_po_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM supplier_pos sp
      WHERE sp.id = supplier_po_id
        AND (SELECT is_external_user())
        AND sp.supplier_id = (SELECT current_supplier_id())
    )
  );

-- ============================================================================
-- 3. supplier_inquiries
-- ============================================================================
CREATE TABLE IF NOT EXISTS supplier_inquiries (
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

CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_tenant_supplier ON supplier_inquiries(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_inquiries_quote_request ON supplier_inquiries(quote_request_id);

ALTER TABLE supplier_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_inquiries FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage inquiries" ON supplier_inquiries
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE POLICY "Suppliers select own inquiries" ON supplier_inquiries
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON supplier_inquiries
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON supplier_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 4. warehouses
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id),
  code             TEXT NOT NULL,
  name             TEXT NOT NULL,
  address_id       UUID REFERENCES addresses(id),
  total_area_sqm   DECIMAL(10,2),
  yard_area_sqm    DECIMAL(10,2),
  operating_hours  TEXT,
  manager_id       UUID REFERENCES employees(id),
  phone            TEXT,
  email            TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  is_primary       BOOLEAN DEFAULT FALSE,
  latitude         DECIMAL(10,7),
  longitude        DECIMAL(10,7),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);

ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage warehouses" ON warehouses
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON warehouses
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 5. warehouse_locations
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  code           TEXT NOT NULL,
  name           TEXT,
  zone           TEXT,
  location_type  TEXT DEFAULT 'bin',
  max_weight_kg  DECIMAL(10,2),
  max_volume_cbm DECIMAL(10,3),
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_warehouse ON warehouse_locations(warehouse_id);

ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage warehouse locations" ON warehouse_locations
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================================
-- 6. inventory
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  product_id         UUID NOT NULL REFERENCES products(id),
  warehouse_id       UUID NOT NULL REFERENCES warehouses(id),
  location_id        UUID REFERENCES warehouse_locations(id),
  quantity_on_hand   DECIMAL(12,3) DEFAULT 0,
  quantity_reserved  DECIMAL(12,3) DEFAULT 0,
  quantity_allocated DECIMAL(12,3) DEFAULT 0,
  quantity_available DECIMAL(12,3) GENERATED ALWAYS AS
                       (quantity_on_hand - quantity_reserved - quantity_allocated) STORED,
  quantity_incoming  DECIMAL(12,3) DEFAULT 0,
  atp                DECIMAL(12,3) GENERATED ALWAYS AS
                       (quantity_on_hand - quantity_reserved - quantity_allocated + quantity_incoming) STORED,
  unit_cost          DECIMAL(12,4),
  total_value        DECIMAL(15,2),
  reorder_point      DECIMAL(12,3),
  reorder_quantity   DECIMAL(12,3),
  safety_stock       DECIMAL(12,3),
  lot_number         TEXT,
  batch_number       TEXT,
  expiry_date        DATE,
  last_received_at   TIMESTAMPTZ,
  last_shipped_at    TIMESTAMPTZ,
  last_counted_at    TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- COALESCE-based unique index for nullable location_id and lot_number
-- (Cannot use UNIQUE constraint with expressions; use unique index instead)
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_product_location
  ON inventory (tenant_id, product_id, warehouse_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'), COALESCE(lot_number, ''));

CREATE INDEX IF NOT EXISTS idx_inventory_tenant_warehouse ON inventory(tenant_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory(tenant_id, warehouse_id) WHERE quantity_available <= reorder_point;

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage inventory" ON inventory
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 7. stock_movements
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  inventory_id   UUID NOT NULL REFERENCES inventory(id),
  product_id     UUID NOT NULL REFERENCES products(id),
  warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  movement_type  stock_movement_type NOT NULL,
  quantity       DECIMAL(12,3) NOT NULL,
  reference_type TEXT,
  reference_id   UUID,
  unit_cost      DECIMAL(12,4),
  total_cost     DECIMAL(15,2),
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

CREATE INDEX IF NOT EXISTS idx_stock_movements_inventory ON stock_movements(inventory_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant_warehouse ON stock_movements(tenant_id, warehouse_id);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage stock movements" ON stock_movements
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================================
-- 8. inventory_transfers
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  transfer_number   TEXT NOT NULL,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id   UUID NOT NULL REFERENCES warehouses(id),
  status            TEXT DEFAULT 'draft',
  items             JSONB NOT NULL DEFAULT '[]',
  shipped_at        TIMESTAMPTZ,
  received_at       TIMESTAMPTZ,
  created_by        UUID REFERENCES auth.users(id),
  received_by       UUID REFERENCES auth.users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_tenant ON inventory_transfers(tenant_id);

ALTER TABLE inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transfers FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage transfers" ON inventory_transfers
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON inventory_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 9. cycle_counts
-- ============================================================================
CREATE TABLE IF NOT EXISTS cycle_counts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  warehouse_id        UUID NOT NULL REFERENCES warehouses(id),
  count_number        TEXT NOT NULL,
  status              TEXT DEFAULT 'planned',
  count_date          DATE NOT NULL,
  items               JSONB NOT NULL DEFAULT '[]',
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

CREATE INDEX IF NOT EXISTS idx_cycle_counts_tenant_warehouse ON cycle_counts(tenant_id, warehouse_id);

ALTER TABLE cycle_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_counts FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage cycle counts" ON cycle_counts
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON cycle_counts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON cycle_counts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 10. source_inventory
-- ============================================================================
CREATE TABLE IF NOT EXISTS source_inventory (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  supplier_id        UUID NOT NULL REFERENCES suppliers(id),
  product_id         UUID NOT NULL REFERENCES products(id),
  reported_quantity  DECIMAL(15,4) NOT NULL DEFAULT 0,
  available_quantity DECIMAL(15,4) NOT NULL DEFAULT 0,
  reserved_quantity  DECIMAL(15,4) NOT NULL DEFAULT 0,
  unit_cost          DECIMAL(15,4),
  currency           TEXT DEFAULT 'EGP',
  lead_time_days     INTEGER,
  min_order_quantity DECIMAL(15,4),
  last_updated_at    TIMESTAMPTZ DEFAULT NOW(),
  confidence         stock_confidence,
  is_suppressed      BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_source_inventory_tenant_supplier ON source_inventory(tenant_id, supplier_id);
CREATE INDEX IF NOT EXISTS idx_source_inventory_product ON source_inventory(product_id);

ALTER TABLE source_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_inventory FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage source inventory" ON source_inventory
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE POLICY "Suppliers select own source inventory" ON source_inventory
  FOR SELECT TO authenticated
  USING (
    (SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id())
  );

CREATE POLICY "Suppliers update own source inventory" ON source_inventory
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id())
  )
  WITH CHECK (
    (SELECT is_external_user()) AND supplier_id = (SELECT current_supplier_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON source_inventory
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON source_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 11. inventory_reservations
-- ============================================================================
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id),
  source_inventory_id UUID REFERENCES source_inventory(id),
  inventory_id        UUID REFERENCES inventory(id),
  product_id          UUID NOT NULL REFERENCES products(id),
  quote_id            UUID REFERENCES quotes(id),
  order_id            UUID REFERENCES orders(id),
  quantity            DECIMAL(15,4) NOT NULL,
  reservation_type    reservation_type NOT NULL,
  status              reservation_status NOT NULL DEFAULT 'active',
  expires_at          TIMESTAMPTZ,
  converted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_tenant ON inventory_reservations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order ON inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_inventory ON inventory_reservations(inventory_id);

ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations FORCE ROW LEVEL SECURITY;

CREATE POLICY "Internal users manage reservations" ON inventory_reservations
  FOR ALL TO authenticated
  USING (
    (SELECT is_internal_user()) AND tenant_id = (SELECT current_tenant_id())
  );

CREATE TRIGGER set_tenant_id BEFORE INSERT ON inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================================
-- DEFERRED FK ADDITIONS
-- ============================================================================

-- order_items.supplier_po_id -> supplier_pos(id)
DO $$ BEGIN
  ALTER TABLE order_items ADD CONSTRAINT fk_order_items_supplier_po
    FOREIGN KEY (supplier_po_id) REFERENCES supplier_pos(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- order_items.warehouse_id -> warehouses(id)
DO $$ BEGIN
  ALTER TABLE order_items ADD CONSTRAINT fk_order_items_warehouse
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- supplier_pos.receiving_warehouse_id -> warehouses(id)
DO $$ BEGIN
  ALTER TABLE supplier_pos ADD CONSTRAINT fk_supplier_pos_warehouse
    FOREIGN KEY (receiving_warehouse_id) REFERENCES warehouses(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
