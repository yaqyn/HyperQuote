-- Migration 015: Delivery Domain Tables
-- 11 tables: vehicles, drivers, delivery_routes, deliveries, delivery_items,
-- proof_of_delivery, drop_ship_pod, driver_locations (partitioned),
-- vehicle_inspections, driver_shifts, load_verifications

-- ============================================================
-- 1. vehicles
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  vehicle_number        TEXT NOT NULL,
  vehicle_type          vehicle_type NOT NULL,
  make                  TEXT,
  model                 TEXT,
  year                  INTEGER,
  license_plate         TEXT,
  vin                   TEXT,
  max_payload_kg        DECIMAL(10,2),
  capacity_weight_kg    DECIMAL(10,2),
  gvwr_kg               DECIMAL(10,2),
  requires_license      egyptian_license_class,
  has_boom              BOOLEAN DEFAULT FALSE,
  has_moffett           BOOLEAN DEFAULT FALSE,
  has_liftgate          BOOLEAN DEFAULT FALSE,
  has_crane             BOOLEAN DEFAULT FALSE,
  equipment_type        TEXT[],
  status                vehicle_status DEFAULT 'available',
  maintenance_status    vehicle_status,
  current_warehouse_id  UUID REFERENCES warehouses(id),
  odometer_reading      DECIMAL(10,1),
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  next_inspection_date  DATE,
  insurance_expiry      DATE,
  registration_expiry   DATE,
  ownership_type        TEXT DEFAULT 'owned',
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, vehicle_number)
);

-- ============================================================
-- 2. drivers
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id),
  driver_number            TEXT NOT NULL,
  user_id                  UUID REFERENCES auth.users(id),
  driver_type              driver_type NOT NULL,
  status                   TEXT DEFAULT 'pending',
  first_name               TEXT NOT NULL,
  last_name                TEXT NOT NULL,
  email                    TEXT,
  phone                    TEXT NOT NULL,
  license_class            egyptian_license_class,
  license_number           TEXT,
  license_governorate      TEXT,
  license_expiry           DATE,
  endorsements             TEXT[],
  moffett_certified        BOOLEAN DEFAULT FALSE,
  crane_certified          BOOLEAN DEFAULT FALSE,
  forklift_certified       BOOLEAN DEFAULT FALSE,
  safety_training_date     DATE,
  hire_date                DATE,
  company_name             TEXT,
  insurance_policy_number  TEXT,
  insurance_expiry         DATE,
  home_warehouse_id        UUID REFERENCES warehouses(id),
  assigned_vehicle_id      UUID REFERENCES vehicles(id),
  is_active                BOOLEAN DEFAULT TRUE,
  is_available             BOOLEAN DEFAULT TRUE,
  completed_deliveries     INTEGER DEFAULT 0,
  on_time_rate             DECIMAL(5,2),
  average_rating           DECIMAL(3,2),
  gps_consent_accepted     BOOLEAN DEFAULT FALSE,
  gps_consent_accepted_at  TIMESTAMPTZ,
  pod_compliance_rate      DECIMAL(5,2),
  damage_rate              DECIMAL(5,2),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, driver_number)
);

-- ============================================================
-- 3. delivery_routes
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_routes (
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
  status                      TEXT DEFAULT 'planned',
  stop_sequence               UUID[],
  optimized                   BOOLEAN DEFAULT FALSE,
  optimization_score          DECIMAL(5,2),
  prayer_time_buffer_minutes  INTEGER DEFAULT 15,
  dispatched_by               UUID REFERENCES employees(id),
  dispatched_at               TIMESTAMPTZ,
  notes                       TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, route_number)
);

-- ============================================================
-- 4. deliveries
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
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
  scheduled_date            DATE NOT NULL,
  scheduled_time_start      TIME,
  scheduled_time_end        TIME,
  friday_jummah_blocked     BOOLEAN DEFAULT FALSE,
  actual_pickup_time        TIMESTAMPTZ,
  actual_departure_time     TIMESTAMPTZ,
  actual_arrival_time       TIMESTAMPTZ,
  actual_delivery_time      TIMESTAMPTZ,
  shipping_method           shipping_method DEFAULT 'own_fleet',
  third_party_carrier       TEXT,
  third_party_tracking      TEXT,
  pod_signature             TEXT,
  pod_signed_by             TEXT,
  pod_photos                TEXT[],
  pod_notes                 TEXT,
  delivery_latitude         DECIMAL(10,7),
  delivery_longitude        DECIMAL(10,7),
  failure_reason            delivery_failure_reason,
  failure_notes             TEXT,
  return_reason             TEXT,
  total_weight_kg           DECIMAL(10,2),
  cairo_truck_ban_applies   BOOLEAN,
  rescheduled_from          UUID REFERENCES deliveries(id),
  rescheduled_to            UUID REFERENCES deliveries(id),
  invoice_id                UUID,  -- FK to invoices(id) deferred to Plan 04
  branded_delivery_note_url TEXT,
  created_by                UUID REFERENCES auth.users(id),
  placement_instructions    TEXT,
  ppe_required              TEXT[],
  delivery_note_sent_at     TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, delivery_number)
);

-- ============================================================
-- 5. delivery_items
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id        UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  order_item_id      UUID REFERENCES order_items(id),
  product_id         UUID NOT NULL REFERENCES products(id),
  expected_quantity  DECIMAL(12,3) NOT NULL,
  delivered_quantity DECIMAL(12,3) DEFAULT 0,
  refused_quantity   DECIMAL(12,3) DEFAULT 0,
  damaged_quantity   DECIMAL(12,3) DEFAULT 0,
  status             TEXT DEFAULT 'pending',
  refusal_reason     TEXT,
  notes              TEXT,
  sort_order         INTEGER DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. proof_of_delivery
-- ============================================================
CREATE TABLE IF NOT EXISTS proof_of_delivery (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id                UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  tenant_id                  UUID NOT NULL REFERENCES tenants(id),
  signer_name                TEXT NOT NULL,
  signer_role                TEXT,
  signature_url              TEXT NOT NULL,
  photos                     TEXT[],
  gps_lat                    DECIMAL(10,7) NOT NULL,
  gps_lng                    DECIMAL(10,7) NOT NULL,
  condition_notes            TEXT,
  captured_at                TIMESTAMPTZ DEFAULT NOW(),
  signer_national_id         TEXT,
  signer_phone               TEXT,
  signer_company             TEXT,
  signature_hash             TEXT NOT NULL,
  document_hash              TEXT NOT NULL,
  device_id                  TEXT,
  device_model               TEXT,
  ip_address                 INET,
  capture_method             TEXT NOT NULL DEFAULT 'touch_signature',
  gps_accuracy_meters        DECIMAL(6,1),
  gps_altitude               DECIMAL(8,2),
  photos_hashes              TEXT[],
  offline_captured           BOOLEAN DEFAULT FALSE,
  synced_at                  TIMESTAMPTZ,
  legal_disclaimer_accepted  BOOLEAN DEFAULT TRUE,
  delivery_note_pdf_url      TEXT,
  tamper_check_status        TEXT DEFAULT 'valid',
  created_at                 TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. drop_ship_pod
-- ============================================================
CREATE TABLE IF NOT EXISTS drop_ship_pod (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id),
  delivery_id               UUID NOT NULL REFERENCES deliveries(id),
  supplier_id               UUID NOT NULL REFERENCES suppliers(id),
  order_id                  UUID NOT NULL REFERENCES orders(id),
  customer_id               UUID NOT NULL REFERENCES customers(id),
  supplier_photo_urls       TEXT[],
  supplier_submitted_at     TIMESTAMPTZ,
  supplier_phone            TEXT,
  supplier_whatsapp_msg_id  TEXT,
  supplier_notes            TEXT,
  customer_confirmed        BOOLEAN DEFAULT FALSE,
  customer_confirmed_at     TIMESTAMPTZ,
  customer_confirmed_via    TEXT,
  customer_confirmed_by     UUID REFERENCES auth.users(id),
  customer_disputed         BOOLEAN DEFAULT FALSE,
  customer_disputed_at      TIMESTAMPTZ,
  customer_dispute_reason   TEXT,
  customer_dispute_photos   TEXT[],
  auto_confirmed            BOOLEAN DEFAULT FALSE,
  auto_confirm_deadline     TIMESTAMPTZ,
  invoice_triggered         BOOLEAN DEFAULT FALSE,
  invoice_triggered_at      TIMESTAMPTZ,
  invoice_id                UUID,  -- FK to invoices(id) deferred
  status                    drop_ship_pod_status DEFAULT 'awaiting_supplier_pod',
  matched_by                TEXT,
  matched_at                TIMESTAMPTZ,
  manually_matched_by       UUID REFERENCES auth.users(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (delivery_id)
);

-- ============================================================
-- 8. driver_locations (PARTITIONED)
-- ============================================================
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

-- No FK constraints on driver_id, delivery_id, route_id
-- PostgreSQL limitation: FK references FROM partitioned tables not supported
-- when FK column is not part of the partition key

-- Monthly partitions
CREATE TABLE driver_locations_2026_04 PARTITION OF driver_locations
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE driver_locations_2026_05 PARTITION OF driver_locations
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE driver_locations_2026_06 PARTITION OF driver_locations
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE driver_locations_2026_07 PARTITION OF driver_locations
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- ============================================================
-- 9. vehicle_inspections
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id),
  driver_id            UUID NOT NULL REFERENCES drivers(id),
  vehicle_id           UUID NOT NULL REFERENCES vehicles(id),
  inspection_type      TEXT NOT NULL CHECK (inspection_type IN ('pre_trip', 'post_trip')),
  inspection_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  odometer_reading     DECIMAL(10,1),
  items                JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_result       TEXT NOT NULL CHECK (overall_result IN ('pass', 'fail', 'conditional')),
  defects_found        BOOLEAN NOT NULL DEFAULT FALSE,
  driver_signature_url TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. driver_shifts
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_shifts (
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
  odometer_start            DECIMAL(10,1),
  odometer_end              DECIMAL(10,1),
  fuel_level_start          DECIMAL(5,2),
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

-- ============================================================
-- 11. load_verifications
-- ============================================================
CREATE TABLE IF NOT EXISTS load_verifications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  delivery_route_id       UUID NOT NULL REFERENCES delivery_routes(id),
  vehicle_id              UUID NOT NULL REFERENCES vehicles(id),
  verified_by             UUID NOT NULL REFERENCES auth.users(id),
  scan_results            JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items_expected    INTEGER NOT NULL,
  total_items_scanned     INTEGER NOT NULL DEFAULT 0,
  weight_expected_kg      DECIMAL(10,2),
  weight_actual_kg        DECIMAL(10,2),
  weight_variance_percent DECIMAL(5,2),
  photos                  JSONB DEFAULT '[]'::jsonb,
  driver_signature_url    TEXT,
  loader_signature_url    TEXT,
  gate_clearance          TEXT NOT NULL CHECK (gate_clearance IN ('approved', 'blocked', 'override')),
  override_by             UUID REFERENCES auth.users(id),
  override_reason         TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Deferred FK: user_profiles.driver_id -> drivers(id)
-- ============================================================
DO $$ BEGIN
  ALTER TABLE user_profiles ADD CONSTRAINT fk_user_profiles_driver
    FOREIGN KEY (driver_id) REFERENCES drivers(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_drivers_user ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_tenant ON delivery_routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_driver ON delivery_routes(driver_id);
CREATE INDEX IF NOT EXISTS idx_delivery_routes_date ON delivery_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_tenant ON deliveries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_route ON deliveries(route_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled ON deliveries(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_proof_of_delivery_delivery ON proof_of_delivery(delivery_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_delivery ON drop_ship_pod(delivery_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_supplier ON drop_ship_pod(supplier_id);
CREATE INDEX IF NOT EXISTS idx_drop_ship_pod_order ON drop_ship_pod(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_driver ON driver_shifts(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_shifts_date ON driver_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle ON vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_load_verifications_route ON load_verifications(delivery_route_id);

-- driver_locations indexes on each partition (not parent)
CREATE INDEX IF NOT EXISTS idx_driver_locations_2026_04_driver ON driver_locations_2026_04(driver_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_2026_04_tenant ON driver_locations_2026_04(tenant_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_2026_05_driver ON driver_locations_2026_05(driver_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_2026_05_tenant ON driver_locations_2026_05(tenant_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_2026_06_driver ON driver_locations_2026_06(driver_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_2026_06_tenant ON driver_locations_2026_06(tenant_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_2026_07_driver ON driver_locations_2026_07(driver_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_driver_locations_2026_07_tenant ON driver_locations_2026_07(tenant_id, recorded_at);

-- ============================================================
-- Triggers: set_tenant_id + update_updated_at
-- (NOT on driver_locations — partitioned table)
-- ============================================================
CREATE TRIGGER set_tenant_id_vehicles BEFORE INSERT ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_vehicles BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tenant_id_drivers BEFORE INSERT ON drivers
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_drivers BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tenant_id_delivery_routes BEFORE INSERT ON delivery_routes
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_delivery_routes BEFORE UPDATE ON delivery_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tenant_id_deliveries BEFORE INSERT ON deliveries
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_deliveries BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tenant_id_proof_of_delivery BEFORE INSERT ON proof_of_delivery
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER set_tenant_id_drop_ship_pod BEFORE INSERT ON drop_ship_pod
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_drop_ship_pod BEFORE UPDATE ON drop_ship_pod
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tenant_id_vehicle_inspections BEFORE INSERT ON vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_vehicle_inspections BEFORE UPDATE ON vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tenant_id_driver_shifts BEFORE INSERT ON driver_shifts
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();
CREATE TRIGGER update_updated_at_driver_shifts BEFORE UPDATE ON driver_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_tenant_id_load_verifications BEFORE INSERT ON load_verifications
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_of_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_ship_pod ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_vehicles ON vehicles USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_drivers ON drivers USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_delivery_routes ON delivery_routes USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_deliveries ON deliveries USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_delivery_items ON delivery_items
  USING (delivery_id IN (SELECT id FROM deliveries WHERE tenant_id = (SELECT auth.uid())));
CREATE POLICY tenant_isolation_proof_of_delivery ON proof_of_delivery USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_drop_ship_pod ON drop_ship_pod USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_driver_locations ON driver_locations USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_vehicle_inspections ON vehicle_inspections USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_driver_shifts ON driver_shifts USING (tenant_id = (SELECT auth.uid()));
CREATE POLICY tenant_isolation_load_verifications ON load_verifications USING (tenant_id = (SELECT auth.uid()));
