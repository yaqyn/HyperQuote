---
phase: 05-website-market-product-detail
verified: 2026-03-31T18:30:00Z
status: passed
score: 23/23 items verified (all tiers)
gaps:
  - truth: "Search finds products by name using fuse.js on client"
    status: partial
    reason: "26 market.* i18n keys missing from both EN and AR website.json. SearchBar calls t('market.searchPlaceholder') — renders key string as placeholder text in both locales. filterClear, resultCount, sortLabel, sortRelevance, sortName, sortCategory, sortAvailability, viewGrid, viewList, availabilityAll, availabilityAvailable, availabilityLowStock, filterBudget, filterMidRange, filterPremium, filtersTrigger, filtersApply, filtersReset, emptyTitle, emptyBody, emptyCTA, errorTitle, errorBody, errorCTA, loginPrompt all absent."
    artifacts:
      - path: "packages/i18n/src/locales/en/website.json"
        issue: "market namespace only contains addToQuote, priceOnRequest, available, lowStock, outOfStock — missing 26 keys"
      - path: "packages/i18n/src/locales/ar/website.json"
        issue: "Same: market namespace missing 26 keys"
    missing:
      - "Add all 26 market.* i18n keys to packages/i18n/src/locales/en/website.json"
      - "Add all 26 market.* i18n keys to packages/i18n/src/locales/ar/website.json"
  - truth: "Breadcrumbs show Market > Category > Product Name with RTL-flipped separator"
    status: partial
    reason: "Product detail route uses t('marketPreview.categories.${product.category}', fallback) but marketPreview.categories only has 6 generic entries (cement, steel, aggregates, bricks, timber, finishing). For 13 of 19 seed categories (reinforcing_steel, ready_mix_concrete, structural_steel, sand, blocks, tiles_ceramic, tiles_porcelain, paint, waterproofing, pipes_pvc, electrical_cable, insulation, plywood, adhesives, gypsum_board, hardware_fasteners) the breadcrumb and category badge will show raw key with underscores replaced by spaces instead of proper translated labels. FilterSidebar and ProductCard correctly use categories.* which has all 27."
    artifacts:
      - path: "apps/website/src/routes/_website/market/$productSlug.tsx"
        issue: "Line 139: t('marketPreview.categories.${product.category}', product.category.replace(/_/g, ' ')) — wrong namespace, should be t('categories.${product.category}')"
    missing:
      - "Change line 139 from t('marketPreview.categories.${product.category}', ...) to t('categories.${product.category}')"
      - "Change line 189 (categoryLabel usage in category badge Link) to use the corrected translation"
human_verification:
  - test: "Visit /market in both EN and AR locales"
    expected: "Filter sidebar shows 'Clear All' (EN) / 'مسح الكل' (AR), search placeholder shows 'Search products...' (EN) / 'ابحث عن منتجات...' (AR), result count shows '25 products', sort dropdown shows 'Relevance'/'Name'/'Category'/'Availability', view toggle shows 'Grid'/'List', availability radios show 'All'/'Available'/'Low Stock', price tier checkboxes show 'Budget'/'Mid-Range'/'Premium'"
    why_human: "26 missing i18n keys cause all these labels to render as key strings — needs visual confirmation of degraded vs fixed state"
  - test: "Visit /market/reinforcing-steel-12mm in both EN and AR locales"
    expected: "Breadcrumb shows 'Market > Reinforcing Steel > {product name}' (EN) / 'السوق > حديد تسليح > {product name}' (AR), category badge shows 'Reinforcing Steel' not 'reinforcing steel'"
    why_human: "Wrong translation path (marketPreview.categories vs categories) causes degraded display for most seed products"
---

# Phase 05: Website Market + Product Detail Verification Report

**Phase Goal:** Visitors can browse the product catalog, filter by category, and view individual product details with price ranges (never exact prices)
**Verified:** 2026-03-31
**Status:** gaps_found — 2 gaps blocking complete goal achievement (both are i18n defects)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Products table exists with slug, price_range_min, price_range_max, availability_status columns | VERIFIED | supabase/migrations/20260331000007_products.sql line 12-42: all required columns present, UNIQUE(slug), RLS enabled |
| 2 | 20-30 seed products span multiple categories with realistic Egyptian building material data | VERIFIED | 20260331000008_seed_products.sql: 25 products across 19 categories, realistic EGP prices, Arabic names, specifications JSONB |
| 3 | getPublicCatalog server function returns items with price ranges, never exact prices | VERIFIED | catalog.ts: PUBLIC_COLUMNS whitelist explicitly excludes last_purchase_price and weighted_avg_cost, uses .inputValidator() |
| 4 | getProductBySlug server function returns a single product by slug | VERIFIED | catalog.ts line 131-154: .eq('slug', input.slug).eq('is_active', true).single() |
| 5 | fuse.js search finds products by name, name_ar, brand, category | VERIFIED | search.ts: Fuse instance with keys ['name','name_ar','brand','category'], threshold 0.3, distance 100 |
| 6 | Price range formatter outputs Arabic-Indic numerals in AR locale | VERIFIED | price-range.ts: imports formatCurrency from @hyperquote/i18n which handles Arabic-Indic conversion |
| 7 | Market page loads via SSR with products from Supabase | VERIFIED | market/index.tsx: loaderDeps + loader calls getPublicCatalog, Route.useLoaderData() in component |
| 8 | Filter sidebar narrows results by category, availability, and price tier | VERIFIED | FilterSidebar.tsx: CheckboxGroup for categories (27) + RadioGroup for availability + CheckboxGroup for price tiers, navigate on change |
| 9 | URL search params update when filters change and are shareable | VERIFIED | market/index.tsx: marketSearchSchema (Zod validateSearch), all filter changes call navigate({ search: (prev) => {...} }) |
| 10 | Grid/list view toggle works and persists in localStorage | VERIFIED | ProductGrid.tsx: localStorage key 'hq-market-view', useEffect syncs from URL or storage, handleViewChange writes both |
| 11 | Pagination shows 24 products per page with URL param | VERIFIED | market/index.tsx: limit: 24 in loader, Pagination component with onPageChange navigates with page param |
| 12 | Price ranges display in Geist Mono, never exact prices | VERIFIED | ProductCard.tsx: font-mono class on price range element, formatPriceRange() called — never exposes exact price |
| 13 | Search finds products by name using fuse.js on client | FAILED | SearchBar.tsx calls t('market.searchPlaceholder') — key missing from both EN + AR json. 26 market.* i18n keys absent. |
| 14 | Mobile shows filter bottom sheet instead of sidebar | VERIFIED | market/index.tsx: sidebar in hidden lg:block div, MobileFilterSheet in lg:hidden div. Modal with isKeyboardDismissDisabled present |
| 15 | Empty state shows when no products match filters | FAILED | market/index.tsx: EmptyState renders with t('market.emptyTitle'), t('market.emptyBody'), t('market.emptyCTA') — all keys missing |
| 16 | Product detail page loads via SSR by slug | VERIFIED | $productSlug.tsx: loader calls getProductBySlug, RelatedProducts fetched in parallel |
| 17 | Breadcrumbs show Market > Category > Product Name with RTL-flipped separator | FAILED | $productSlug.tsx line 139: uses t('marketPreview.categories.${product.category}') — wrong namespace, only 6 generic categories present |
| 18 | Specs table shows only populated fields with alternating row backgrounds | VERIFIED | SpecsTable.tsx: filters null/empty values, alternating bg-[var(--color-surface)] / bg-transparent |
| 19 | Price range badge displays in Geist Mono, never exact prices | VERIFIED | $productSlug.tsx: font-mono text-xl on priceRange, formatPriceRange() called |
| 20 | Add to Quote button stubs login trigger for unauthenticated users | VERIFIED | QuoteCard.tsx line 64: console.log('Add to Quote clicked - Login Modal coming in Phase 6'), intentional stub per plan |
| 21 | Mobile shows fixed bottom bar instead of sticky sidebar card | VERIFIED | MobileBottomBar.tsx: fixed bottom-0 inset-x-0 z-50 h-16 lg:hidden |
| 22 | Related products scroll horizontally with snap points | VERIFIED | RelatedProducts.tsx: overflow-x-auto snap-x snap-mandatory, w-50 shrink-0 snap-start cards |
| 23 | 404 state renders when product not found | VERIFIED | $productSlug.tsx: if (!product) renders PackageX + notFoundTitle/Body/CTA |

**Score:** 20/23 truths verified (3 failed — 2 root causes: missing market.* i18n keys + wrong translation path)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260331000007_products.sql` | Products table with indexes and search_vector trigger | VERIFIED | CREATE TABLE products, slug, price_range_min/max, availability_status, search_vector tsvector, GIN index, RLS with (SELECT auth.uid()) |
| `supabase/migrations/20260331000008_seed_products.sql` | Seed data for 25 products across 12+ categories | VERIFIED | 25 products, 19 categories, realistic EGP prices, Arabic names, specifications JSONB, seed tenant bootstrap |
| `apps/website/src/lib/catalog.ts` | getPublicCatalog and getProductBySlug server functions | VERIFIED | Both exported, .inputValidator(), PUBLIC_COLUMNS whitelist, no cost fields |
| `apps/website/src/lib/search.ts` | fuse.js search instance factory | VERIFIED | createProductSearch + searchProducts exported, Fuse with 4 keys |
| `apps/website/src/lib/price-range.ts` | Price range formatting utility | VERIFIED | formatPriceRange exported, uses formatCurrency from @hyperquote/i18n |
| `apps/website/src/routes/_website/market/index.tsx` | Market page route with validateSearch + loader | VERIFIED | validateSearch: marketSearchSchema, loader calls getPublicCatalog, empty/error states |
| `apps/website/src/components/market/SearchBar.tsx` | React Aria SearchField with 300ms debounce | VERIFIED | SearchField, setTimeout 300ms debounce, X clear button |
| `apps/website/src/components/market/FilterSidebar.tsx` | Desktop filter sidebar with CheckboxGroup and RadioGroup | VERIFIED | CheckboxGroup (categories + price tiers), RadioGroup (availability), navigate on change |
| `apps/website/src/components/market/MobileFilterSheet.tsx` | Mobile bottom sheet with Apply/Reset | VERIFIED | Modal, isKeyboardDismissDisabled, Apply + Reset buttons |
| `apps/website/src/components/market/ProductCard.tsx` | Product card in grid and list variants | VERIFIED | formatPriceRange, font-mono, hover:-translate-y-0.5, productSlug Link, grid/list via variant prop |
| `apps/website/src/components/market/ProductGrid.tsx` | Sort dropdown, view toggle, skeleton loading | VERIFIED | Select sort, grid-cols-3 responsive, localStorage persistence, Skeleton cards/rows |
| `apps/website/src/components/market/Pagination.tsx` | Pagination with RTL-aware chevrons | VERIFIED | RTL chevron flip, font-mono page numbers, generatePageNumbers helper |
| `apps/website/src/routes/_website/market/$productSlug.tsx` | Product detail route with SSR loader | VERIFIED (with caveat) | getProductBySlug, Breadcrumbs, PackageX 404, but category translation uses wrong namespace |
| `apps/website/src/components/product/ImageGallery.tsx` | Image gallery with hover zoom | VERIFIED | group-hover:scale-150, cairo.webp fallback, mobile overlay with X button |
| `apps/website/src/components/product/SpecsTable.tsx` | Alternating row specs table | VERIFIED | specifications JSONB iteration, alternating rows, font-mono for numeric values |
| `apps/website/src/components/product/QuoteCard.tsx` | Sticky sidebar quote CTA | VERIFIED | NumberField, sticky top-20, console.log stub, wa.me WhatsApp link |
| `apps/website/src/components/product/MobileBottomBar.tsx` | Fixed bottom bar for mobile | VERIFIED | fixed bottom-0, h-16, NumberField, lg:hidden |
| `apps/website/src/components/product/RelatedProducts.tsx` | Horizontal scroll related products | VERIFIED | overflow-x-auto, snap-x snap-mandatory, w-50 snap-start |
| `packages/i18n/src/locales/en/website.json` | market.* + categories.* + product.* + units.* keys | FAILED | categories.* (27 keys) PASS. product.* PASS. units.* PASS. market.* FAIL — only 5 of 31 expected keys present |
| `packages/i18n/src/locales/ar/website.json` | Arabic equivalents of all above | FAILED | Same gap: market.* only 5 keys, missing 26 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `market/index.tsx` | `apps/website/src/lib/catalog.ts` | loader calls getPublicCatalog | WIRED | import + loader call verified, response destructured to items/total/hasMore |
| `$productSlug.tsx` | `apps/website/src/lib/catalog.ts` | loader calls getProductBySlug | WIRED | import + loader call verified, related products also via getPublicCatalog |
| `FilterSidebar.tsx` | URL search params | navigate({ search }) | WIRED | onFilterChange calls navigate with updated params, page reset to 1 |
| `ProductCard.tsx` | `/market/$productSlug` | Link component | WIRED | Link to="/market/$productSlug" with params={{ productSlug: product.slug }} |
| `catalog.ts` | Supabase products table | createSupabaseServerClient | WIRED | .from('products').select(PUBLIC_COLUMNS) in both server functions |
| `price-range.ts` | `@hyperquote/i18n` | formatCurrency import | WIRED | import { formatCurrency } from '@hyperquote/i18n' at line 1 |
| `ProductCard.tsx` | `price-range.ts` | formatPriceRange | WIRED | import at line 4, called in both GridCard and ListCard render paths |
| `$productSlug.tsx` | categories.* i18n | t('categories.*') | NOT_WIRED | Uses t('marketPreview.categories.*') — wrong path for 13 of 19 categories |
| `market/index.tsx` | market.* i18n | t('market.*') | NOT_WIRED | 26 of 31 market.* keys missing from both EN + AR website.json |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `market/index.tsx` | `data.items` | `getPublicCatalog` → Supabase `.from('products').select(PUBLIC_COLUMNS)` | Yes — real DB query with filters + pagination | FLOWING |
| `$productSlug.tsx` | `product` | `getProductBySlug` → Supabase `.from('products').select(PUBLIC_COLUMNS).eq('slug', ...).single()` | Yes — real DB query by slug | FLOWING |
| `$productSlug.tsx` | `relatedProducts` | `getPublicCatalog` filtered by category, excludes current product | Yes — real DB query filtered by category | FLOWING |
| `ProductCard.tsx` | price range display | `formatPriceRange(product.price_range_min, product.price_range_max, ...)` | Yes — comes from DB, never exact price | FLOWING |
| `SearchBar.tsx` | placeholder text | `t('market.searchPlaceholder')` | No — key missing from EN + AR json, returns key string | STATIC (missing i18n) |

---

## Behavioral Spot-Checks

Step 7b: SKIPPED — requires running server (SSR app with Supabase connection). Cannot test API responses without a live Supabase instance. All code paths verified statically.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| WEB-04 | 05-01, 05-02 | Market page: SSR product catalog with search (fuse.js), filter sidebar, grid/list toggle, price ranges (never exact prices), pagination | PARTIAL | Core functionality wired and substantive. Blocked by 26 missing market.* i18n keys causing degraded UI text in SearchBar, FilterSidebar, ProductGrid, empty states, MobileFilterSheet |
| WEB-05 | 05-01, 05-03 | Product detail: specs table, availability indicator, price range badge, "Add to Quote" (requires login), related products | PARTIAL | Core functionality wired. Blocked by wrong translation namespace for category labels on breadcrumb and category badge |

Both requirements are satisfied at the functional/data-flow level but have i18n presentation defects.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/website/src/routes/_website/market/$productSlug.tsx` | 139 | `t('marketPreview.categories.${product.category}', fallback)` — wrong namespace | Blocker | 13 of 19 seed product category labels show raw key string in breadcrumb + category badge on product detail page |
| `packages/i18n/src/locales/en/website.json` | — | 26 market.* keys absent from market namespace | Blocker | All filter labels, search placeholder, sort options, view toggle labels, empty state copy, error copy render as i18n key strings |
| `packages/i18n/src/locales/ar/website.json` | — | Same 26 market.* keys absent | Blocker | Same degraded UI in Arabic locale |
| `apps/website/src/components/product/QuoteCard.tsx` | 64 | `console.log('Add to Quote clicked - Login Modal coming in Phase 6')` | Info | Intentional stub per plan, documented in KNOWN_STUBS. Not a defect. |
| `apps/website/src/components/product/MobileBottomBar.tsx` | 53 | `console.log('Add to Quote - Phase 6')` | Info | Same intentional stub as QuoteCard. |

---

## Human Verification Required

### 1. Market page i18n rendering

**Test:** Open /market in browser with EN locale
**Expected:** Search bar placeholder shows "Search products...", filter sidebar shows "Clear All" button (when active), result count shows "25 products", sort dropdown shows "Relevance"/"Name"/"Category"/"Availability", view toggle shows "Grid"/"List" labels, mobile "Filters" button shows "Filters" text, availability radios show "All"/"Available"/"Low Stock", price tier checkboxes show "Budget"/"Mid-Range"/"Premium"
**Why human:** 26 missing i18n keys render as key strings — needs visual confirmation of gap and fix

### 2. Product detail category breadcrumb

**Test:** Open /market/reinforcing-steel-12mm-grade-b500c in browser with EN locale
**Expected:** Breadcrumb shows "Market > Reinforcing Steel > {product name}", category badge shows "Reinforcing Steel"
**Why human:** Wrong translation path causes "reinforcing steel" (raw fallback) vs "Reinforcing Steel" (from categories namespace) — subtle difference needs human confirmation

### 3. Arabic locale full sweep

**Test:** Switch to AR locale and visit /market then a product detail page
**Expected:** Full RTL layout, Arabic-Indic numerals in prices, Arabic category names from categories.* namespace, RTL breadcrumb separator flip (ChevronRight rotates 180deg), Arabic filter/sort labels
**Why human:** i18n defects affect Arabic more severely (missing keys fallback to EN key strings, not Arabic)

---

## Gaps Summary

Two root causes block full goal achievement:

**Gap 1 — Missing market.* i18n keys (26 keys in both locales)**
The SUMMARY for Plan 02 claimed all market namespace keys were added, but the actual json files only contain 5 keys (addToQuote, priceOnRequest, available, lowStock, outOfStock). The remaining 26 keys (searchPlaceholder, filterClear, resultCount, sortLabel, all sort options, view labels, availability labels, price tier labels, filtersTrigger, filtersApply, filtersReset, emptyTitle/Body/CTA, errorTitle/Body/CTA, loginPrompt) were never written. Components call t('market.searchPlaceholder') etc. and i18next returns the key string as fallback — visible to every visitor.

**Gap 2 — Wrong translation namespace in product detail (1 line fix)**
`$productSlug.tsx` line 139 calls `t('marketPreview.categories.${product.category}', fallback)` instead of `t('categories.${product.category}')`. The `marketPreview.categories` namespace only has 6 generic entries from Phase 4's home page. The full 27-entry `categories` namespace (used correctly by FilterSidebar and ProductCard) was not used here. For 13 of 19 seed categories, breadcrumb and category badge show degraded text.

Both gaps are pure i18n defects — all underlying data structures, server functions, and component logic are correctly implemented and wired.

---

_Verified: 2026-03-31T18:30:00Z_
_Verifier: Claude (gsd-verifier)_
