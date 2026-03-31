# Phase 5: Website Market + Product Detail

## Goal
Visitors can browse the product catalog, filter by category, and view individual product details with price ranges (never exact prices).

## Dependencies
Phase 4 (Website Layout + Home + About must be complete).

## Requirements

- **WEB-04**: Market page: SSR product catalog with search (fuse.js), filter sidebar, grid/list toggle, price ranges (never exact prices), pagination
- **WEB-05**: Product detail: specs table, availability indicator, price range badge, "Add to Quote" (requires login), related products

## Success Criteria
1. Market page loads via SSR with products from Supabase, showing price ranges in Geist Mono (never exact prices)
2. Filter sidebar narrows results by category, and search (fuse.js) finds products by name
3. Product detail page shows specs table, availability indicator, price range badge, and "Add to Quote" button
4. "Add to Quote" on product detail opens login modal for unauthenticated users

## What to Build
- Market page: SSR with search params for filters
- Category grid, filter sidebar (sticky), product cards with price ranges
- Pagination (24 products per page)
- Product detail: specs, price range badge, availability indicator, "Add to Quote" button
- Server function: `getProductCatalog()` with filtering
- Supabase migration: `products` table (if not already created). NOTE: product categories use the `product_category` enum (27 values) -- there is NO separate `product_categories` table. Categories are a column on the `products` table (`category product_category NOT NULL`).
- fuse.js client-side search + server fallback

## Spec References

### 1.4 Market Page (Catalog)

**Route:** `/market` | **Rendering:** SSR (cached 5 min via Workers Cache API)

**FUNCTIONAL page -- content-driven layout, NOT cinematic. No hero section.**

**Search bar:** React Aria `SearchField`. 48px height, rounded-xl. fuse.js fuzzy search (debounced 300ms). Clear button. Enter navigates to `/market?q={query}`.

**Filter sidebar (inline-start, 256px desktop):**
- Sticky, top 80px. Scrollable.
- Category: CheckboxGroup. Shows count in Geist Mono: "Cement (47)".
- Availability: RadioGroup. "All", "Available", "Low Stock".
- Price Range: checkboxes "Budget", "Mid-Range", "Premium" (internal tiers).
- "Clear All" link when any filter active.
- Mobile (< 1024px): "Filters" button -> bottom sheet (React Aria Modal).
- URL search params: `/market?category=cement,steel&availability=available`. Zod validateSearch.

**Product grid:**
- Toolbar: Result count (Geist Mono for number), Sort dropdown (React Aria Select: Relevance, Name, Category, Availability), View toggle (grid/list, stored in localStorage).
- Grid: 3 cols desktop, 2 tablet, 1 mobile. Gap 16px.
- Each card: image (4:3), name (bilingual, line-clamp-2), category badge, price range (Geist Mono: "From EGP 45/bag"), availability dot + label, hover translateY(-2px) + shadow-md.
- "Add to Quote" on hover (desktop) / always visible (mobile): blue outline button. If logged in: quantity popover -> add to draft. If not logged in: opens Login Modal.
- List view: 80px rows with thumbnail, name, category, price range, availability, plus icon button.

**Pagination:** 24/page. React Aria ListBox. URL param: `/market?page=2`. Mobile: simplified prev/next.

**Loading:** 6 skeleton cards (grid) or 8 skeleton rows (list).
**Empty:** SearchX icon + "No products found" + "Clear Filters" button.
**Error:** AlertTriangle + "Failed to load products" + "Retry" button.

### 1.5 Product Detail Page

**Route:** `/market/{product-slug}` | **Rendering:** SSR (cached 5 min)

**Breadcrumb:** React Aria `Breadcrumbs`. "Market > {Category} > {Product Name}". ChevronRight separator (flips in RTL).

**2-column layout (single column mobile):**

**Column 1 (55%):** Product images. Primary 1:1, thumbnail gallery below (64px squares). Image zoom on hover. Mobile: full-screen viewer on tap.

**Column 2 (45%):** Product name (Inter 700 24px, bilingual), category badge (clickable), SKU (Geist Mono 12px), price range (Geist Mono 20px: "From EGP 45/bag"), availability indicator.

**Specifications table:** Alternating row backgrounds. Property (Inter 500 14px muted) + Value (Inter 400, Geist Mono for numeric). Dimensions, weight, material, standard, origin, UOM, MOQ, certifications.

**"Request a Quote" card (sticky):**
- Quantity: React Aria NumberField. Min: MOQ. Geist Mono.
- UOM display next to quantity.
- "Add to Quote": full width, blue bg, h-48px. If logged in: adds to draft. If not: Login Modal.
- "Or contact us on WhatsApp" link below.

**Documents section:** Downloadable files with Lucide Download icon.
**Related products:** Horizontal scroll of 4-6 product cards.

**Mobile:** Single column. Sticky card becomes fixed bottom bar (quantity + button, h-64px).
**404:** PackageX icon + "Product not found" + "Browse Market" button.

### Products Table Schema
```sql
CREATE TABLE products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id),
  sku                   TEXT NOT NULL,
  name                  TEXT NOT NULL,
  name_ar               TEXT,
  description           TEXT,
  category              product_category NOT NULL,
  subcategory           TEXT,
  brand                 TEXT,
  manufacturer          TEXT,
  model_number          TEXT,
  egs_code              TEXT,
  gpc_code              TEXT,
  specifications        JSONB DEFAULT '{}',
  unit_of_measure       unit_of_measure NOT NULL,
  secondary_uom         unit_of_measure,
  uom_conversion_factor DECIMAL(12,6),
  weight_kg             DECIMAL(10,3),
  length_cm             DECIMAL(10,2),
  width_cm              DECIMAL(10,2),
  height_cm             DECIMAL(10,2),
  last_purchase_price   DECIMAL(12,4),
  weighted_avg_cost     DECIMAL(12,4),
  is_stockable          BOOLEAN DEFAULT FALSE,
  is_active             BOOLEAN DEFAULT TRUE,
  requires_inspection   BOOLEAN DEFAULT FALSE,
  is_hazmat             BOOLEAN DEFAULT FALSE,
  shelf_life_days       INTEGER,
  image_urls            TEXT[],
  search_vector         TSVECTOR,
  tags                  TEXT[],
  is_non_cancellable    BOOLEAN DEFAULT FALSE,
  is_wind_sensitive     BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, sku)
);
```

### Server Function: `getPublicCatalog()` (from BACKEND.md Section 6 — Website functions)

| Function | Method | Input | Output | Auth | Side Effects |
|---|---|---|---|---|---|
| `getPublicCatalog` | GET | `{ category?, search?, page, limit }` | `{ items[], total, hasMore }` | none | none |

This is the server function for the Market page. Named `getPublicCatalog` in BACKEND.md (not `getProductCatalog`). No authentication required -- public endpoint. Returns items with price ranges (never exact prices), total count, and `hasMore` flag for pagination.

### Product Categories Note

Categories use the `product_category` enum (27 values) -- there is NO separate `product_categories` table. The `products` table has `category product_category NOT NULL`. Filter sidebar should enumerate the 27 enum values: cement, reinforcing_steel, structural_steel, aggregates, sand, ready_mix_concrete, bricks, blocks, tiles_ceramic, tiles_porcelain, marble, granite, lumber, plywood, insulation, waterproofing, pipes_pvc, pipes_metal, electrical_cable, electrical_conduit, paint, adhesives, glass, aluminum_profiles, gypsum_board, roofing, hardware_fasteners.

### Quote-Based Pricing Model
Prices are NEVER published to customers. The platform operates on a Request-for-Quote model. Market page shows only price RANGES ("EGP 400-600 per bag"). Actual prices come in the quote after internal pricing.

### Margin Benchmarks (from RESEARCH.md — background context for price ranges)

These are internal-only reference margins. They inform how price ranges are computed but are NEVER exposed to customers:
- **Lumber/Timber:** 15-20% (floor 12%)
- **Concrete/Cement:** 18-22% (floor 14%)
- **Steel/Metal:** 12-18% (floor 10%)
- **Roofing:** 22-28% (floor 18%)
- **Specialty/Custom:** 30-45% (floor 25%)

### Pagination vs Infinite Scroll Discrepancy

**Website Market page (this phase):** Uses **pagination** -- 24 items per page, React Aria ListBox, URL param `?page=2`, mobile simplified prev/next. This is per FRONTEND.md 1.4.

**Portal (Phase 8+):** Uses **infinite scroll** for product browsing within AI chat results and product search within the portal. Different UX pattern for different contexts.

Both are correct -- the website uses traditional pagination for SEO and shareability (URL state), while the portal uses infinite scroll for fluid AI-driven interaction.

## Non-Negotiable Rules
1. **No exact prices shown -- only price ranges.** "From EGP 45/bag" or "Price on Request".
2. **Geist Mono for ALL numbers.** Price ranges, product counts, SKUs.
3. **React Aria Components.** SearchField, CheckboxGroup, RadioGroup, Select, NumberField, Breadcrumbs, Popover, Modal.
4. **fuse.js for client-side search.** Server fallback for complex queries.
5. **SSR rendering.** Products fetched at request time from server function, cached 5 min.
6. **URL state via TanStack Router search params** with Zod validateSearch.
7. **"Add to Quote" requires login** -> opens Login Modal for unauthenticated users.
8. **Arabic-Indic numerals** for all numbers in Arabic context. Price: "من ٤٥ ج.م/كيس".

## Known Risks & Gotchas

### Product Data
- Products table must exist with seed data for the market to render anything useful.
- Price ranges are computed from internal data -- never expose exact supplier costs.
- `search_vector` TSVECTOR column enables PostgreSQL full-text search as server fallback.

### RTL/Arabic
- Grid reads right-to-left. Sidebar at inline-start (right in RTL).
- Price format: "من ٤٥ ج.م/كيس". Category badges translated.
- "Add to Quote" -> "أضف للعرض".
- Breadcrumb separator flips in RTL.

## Tips
- No exact prices shown -- only ranges ("EGP 400-600 per bag")
- "Add to Quote" requires login -> opens login modal
- Search uses fuse.js client-side + server fallback
- Product detail specs table only shows populated fields
- Filter changes update URL search params for shareable links
- Market is a FUNCTIONAL page -- content-driven, not cinematic
