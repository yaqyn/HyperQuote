-- Migration 007: Products Table
-- Public catalog table with full-text search, price ranges, and availability tracking.
-- RLS: publicly readable, writable only by internal users.

-- ============================================================================
-- 1. products table
-- ============================================================================
CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  sku                   TEXT NOT NULL,
  slug                  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  name_ar               TEXT NOT NULL,
  description           TEXT,
  description_ar        TEXT,
  category              product_category NOT NULL,
  subcategory           TEXT,
  brand                 TEXT,
  manufacturer          TEXT,
  specifications        JSONB DEFAULT '{}',
  unit_of_measure       unit_of_measure NOT NULL,
  weight_kg             DECIMAL(10,3),
  min_order_qty         DECIMAL(12,3) DEFAULT 1,
  max_order_qty         DECIMAL(12,3),
  lead_time_days        INTEGER,
  last_purchase_price   DECIMAL(12,2),          -- INTERNAL ONLY: never exposed to public
  weighted_avg_cost     DECIMAL(12,2),          -- INTERNAL ONLY: never exposed to public
  price_range_min       DECIMAL(12,2),          -- Public-facing min price range
  price_range_max       DECIMAL(12,2),          -- Public-facing max price range
  price_tier            TEXT CHECK (price_tier IN ('budget', 'mid_range', 'premium')),
  availability_status   TEXT NOT NULL DEFAULT 'available' CHECK (availability_status IN ('available', 'low_stock', 'out_of_stock')),
  image_urls            TEXT[] DEFAULT '{}',
  tags                  TEXT[] DEFAULT '{}',
  is_active             BOOLEAN DEFAULT TRUE,
  is_stockable          BOOLEAN DEFAULT TRUE,
  search_vector         TSVECTOR,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, sku),
  UNIQUE (slug)
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================
CREATE INDEX idx_products_tenant_active ON products(tenant_id, is_active);
CREATE INDEX idx_products_category ON products(category);
CREATE UNIQUE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_search_vector ON products USING GIN(search_vector);
CREATE INDEX idx_products_availability ON products(availability_status);

-- ============================================================================
-- 3. Full-text search trigger
-- ============================================================================
CREATE FUNCTION update_product_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.name_ar, '') || ' ' ||
    coalesce(NEW.brand, '') || ' ' ||
    coalesce(NEW.category::text, '') || ' ' ||
    coalesce(NEW.sku, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- ============================================================================
-- 4. Row Level Security
-- ============================================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Products are publicly readable (public catalog)
CREATE POLICY "Products are publicly readable" ON products
  FOR SELECT USING (true);

-- Internal users can manage products
CREATE POLICY "Internal users can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = (SELECT auth.uid())
      AND user_type = 'internal'
    )
  );

-- ============================================================================
-- 5. updated_at trigger (reuse function from migration 004 if exists)
-- ============================================================================
-- update_updated_at() is defined in migration 004; attach it here
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
