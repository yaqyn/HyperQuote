---
phase: 05-website-market-product-detail
plan: 01
subsystem: database, api
tags: [supabase, postgresql, tsvector, fuse.js, zod, server-functions, catalog]

requires:
  - phase: 02-supabase-initial-migrations
    provides: enums (product_category, unit_of_measure), tenants table, auth tables
  - phase: 03-shared-packages
    provides: "@hyperquote/auth/server, @hyperquote/i18n formatCurrency, @hyperquote/types enums"

provides:
  - "products table with slug, price ranges, availability, full-text search"
  - "25 seed products across 19 categories (Egyptian building materials)"
  - "getPublicCatalog server function with filtering, pagination, text search"
  - "getProductBySlug server function for product detail pages"
  - "createProductSearch fuse.js factory for client-side fuzzy search"
  - "formatPriceRange utility with Arabic-Indic numeral support"

affects: [05-02-market-page, 05-03-product-detail, 09-portal-material-list]

tech-stack:
  added: [fuse.js ^7.1.0, zod ^3.24.0, "@supabase/supabase-js ^2.100.1"]
  patterns: [server-function-with-inputValidator, public-column-whitelist, seed-tenant-bootstrapping]

key-files:
  created:
    - supabase/migrations/20260331000007_products.sql
    - supabase/migrations/20260331000008_seed_products.sql
    - apps/website/src/lib/catalog.ts
    - apps/website/src/lib/search.ts
    - apps/website/src/lib/price-range.ts
  modified:
    - apps/website/package.json
    - bun.lock

key-decisions:
  - "Explicit public column whitelist in server functions to prevent cost field exposure"
  - "Seed tenant bootstrap in seed migration (ON CONFLICT DO NOTHING) for FK satisfaction"
  - "fuse.js searchProducts takes original array as param since FuseIndex doesn't expose docs"

patterns-established:
  - "Pattern: Server function uses { data: input } destructuring from ServerFnCtx"
  - "Pattern: PUBLIC_COLUMNS whitelist for all public-facing Supabase queries"
  - "Pattern: Seed migrations bootstrap required FK parents with ON CONFLICT DO NOTHING"

requirements-completed: [WEB-04, WEB-05]

duration: 11min
completed: 2026-03-31
---

# Phase 05 Plan 01: Product Catalog Data Layer Summary

**Products table with 25 Egyptian building material seeds, server functions with price-range-only exposure, fuse.js search factory, and Arabic-Indic price formatter**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-31T17:02:48Z
- **Completed:** 2026-03-31T17:13:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Products table with slug, price ranges, availability status, full-text search vector, and RLS (public read, internal write)
- 25 seed products across 19 categories with realistic Egyptian building material data, Arabic names, and EGP pricing
- getPublicCatalog and getProductBySlug server functions that explicitly whitelist public columns (never expose cost/margin)
- fuse.js client-side search factory and formatPriceRange utility with Arabic-Indic numeral support

## Task Commits

1. **Task 1: Products table migration + seed data** - `b763ed4` (feat)
2. **Task 2: Server functions + search helper + price range utility** - `98ce763` (feat)

## Files Created/Modified
- `supabase/migrations/20260331000007_products.sql` - Products table with indexes, search vector trigger, RLS policies
- `supabase/migrations/20260331000008_seed_products.sql` - 25 seed products with seed tenant bootstrap
- `apps/website/src/lib/catalog.ts` - getPublicCatalog and getProductBySlug server functions
- `apps/website/src/lib/search.ts` - fuse.js search instance factory and searchProducts helper
- `apps/website/src/lib/price-range.ts` - formatPriceRange with Arabic-Indic numeral support
- `apps/website/package.json` - Added fuse.js, zod, @supabase/supabase-js dependencies
- `bun.lock` - Updated lockfile

## Decisions Made
- Used explicit PUBLIC_COLUMNS whitelist (never SELECT *) to prevent cost field leakage
- Added seed tenant INSERT with ON CONFLICT DO NOTHING since no prior migration creates it
- searchProducts takes original products array as param because FuseIndex class doesn't expose docs property
- Server function handler uses `{ data: input }` destructuring pattern (TanStack Start ServerFnCtx API)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added seed tenant bootstrap to seed migration**
- **Found during:** Task 1 (Products table migration + seed data)
- **Issue:** No prior migration creates the seed tenant (00000000-0000-0000-0000-000000000001), causing FK violation on INSERT INTO products
- **Fix:** Added INSERT INTO tenants with ON CONFLICT DO NOTHING at top of seed migration
- **Files modified:** supabase/migrations/20260331000008_seed_products.sql
- **Verification:** supabase db reset completes successfully, 25 products across 19 categories confirmed
- **Committed in:** b763ed4

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential for seed data to load. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors in website app (missing @types/react, @types/node, i18n namespace mismatches) affect all files including catalog.ts. These are out of scope for this plan.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all exports are fully functional.

## Next Phase Readiness
- Products table and server functions ready for Market page (Plan 02) consumption
- Search helper ready for client-side filtering in Market page
- Price range formatter ready for ProductCard and ProductDetail components
- All 25 seed products available for rendering

## Self-Check: PASSED

- All 6 created files exist on disk
- Both commits (b763ed4, 98ce763) verified in git log
- Products table has CREATE TABLE, slug, price_range_min/max, availability_status, search_vector, RLS
- Seed data has INSERT INTO products with 25 rows across 19 categories
- catalog.ts exports getPublicCatalog, getProductBySlug with .inputValidator() and getRequest()
- catalog.ts has zero references to last_purchase_price or weighted_avg_cost in column selections (only in comment)
- search.ts uses Fuse and exports createProductSearch
- price-range.ts exports formatPriceRange using formatCurrency

---
*Phase: 05-website-market-product-detail*
*Completed: 2026-03-31*
