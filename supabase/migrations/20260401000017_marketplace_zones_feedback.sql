-- Migration 017: Driver Marketplace + Delivery Zones
-- 3 tables: driver_jobs, driver_earnings, delivery_zones

-- ============================================================
-- 1. driver_jobs
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_jobs (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                  UUID NOT NULL REFERENCES tenants(id),
  delivery_id                UUID NOT NULL REFERENCES deliveries(id),
  status                     TEXT NOT NULL DEFAULT 'available'
                               CHECK (status IN ('available', 'offered', 'accepted', 'declined', 'expired', 'completed', 'cancelled')),
  offered_to_driver_id       UUID REFERENCES drivers(id),
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
  materials_summary          TEXT,
  total_weight_kg            DECIMAL(10,2),
  requires_moffett           BOOLEAN DEFAULT FALSE,
  requires_boom              BOOLEAN DEFAULT FALSE,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tenant_id_driver_jobs
  BEFORE INSERT ON driver_jobs
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_driver_jobs
  BEFORE UPDATE ON driver_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. driver_earnings
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_earnings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  driver_id          UUID NOT NULL REFERENCES drivers(id),
  period_start       DATE NOT NULL,
  period_end         DATE NOT NULL,
  total_jobs         INTEGER NOT NULL DEFAULT 0,
  total_earned       DECIMAL(15,2) NOT NULL DEFAULT 0,
  withholding_tax    DECIMAL(15,2) NOT NULL DEFAULT 0,
  net_payable        DECIMAL(15,2) NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  paid_at            TIMESTAMPTZ,
  bank_account_last4 TEXT,
  payment_reference  TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tenant_id_driver_earnings
  BEFORE INSERT ON driver_earnings
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

-- ============================================================
-- 3. delivery_zones
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_zones (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  zone_name               TEXT NOT NULL,
  zone_name_ar            TEXT,
  min_distance_km         DECIMAL(8,2),
  max_distance_km         DECIMAL(8,2),
  base_price              DECIMAL(15,2),
  price_per_km            DECIMAL(8,2),
  free_delivery_threshold DECIMAL(15,2),
  surcharge_moffett       DECIMAL(15,2),
  surcharge_boom          DECIMAL(15,2),
  surcharge_night         DECIMAL(15,2),
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_tenant_id_delivery_zones
  BEFORE INSERT ON delivery_zones
  FOR EACH ROW EXECUTE FUNCTION set_tenant_id();

CREATE TRIGGER update_updated_at_delivery_zones
  BEFORE UPDATE ON delivery_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Verification: Total table count should be ~61 new business tables
-- SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
