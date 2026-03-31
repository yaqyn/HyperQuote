---
phase: 05-website-market-product-detail
plan: 03
subsystem: ui
tags: [react-aria, breadcrumbs, number-field, image-gallery, specs-table, i18n, rtl]

requires:
  - phase: 05-website-market-product-detail
    provides: "getProductBySlug, getPublicCatalog server functions, formatPriceRange utility"
  - phase: 04-website-layout-home-about
    provides: "Website layout shell with header/footer, _website route wrapper"
  - phase: 03-shared-packages
    provides: "@hyperquote/i18n, @hyperquote/ui components"

provides:
  - "Product detail page at /market/{product-slug} with SSR loader"
  - "ImageGallery with hover zoom 1.5x and mobile overlay viewer"
  - "SpecsTable with alternating rows and Geist Mono for numeric values"
  - "QuoteCard with React Aria NumberField and WhatsApp fallback"
  - "MobileBottomBar with compact quantity input (fixed bottom, h-16)"
  - "RelatedProducts horizontal scroll with snap points"
  - "404 state with PackageX icon for invalid slugs"
  - "Complete product detail i18n keys in EN + AR"
  - "Unit translation keys (14 units) in EN + AR"

affects: [06-website-remaining-pages, 09-portal-material-list-builder-quote-submission]

tech-stack:
  added: []
  patterns: [product-detail-2-column-layout, mobile-bottom-bar-pattern, related-products-horizontal-scroll]

key-files:
  created:
    - apps/website/src/routes/_website/market/$productSlug.tsx
    - apps/website/src/components/product/ImageGallery.tsx
    - apps/website/src/components/product/SpecsTable.tsx
    - apps/website/src/components/product/QuoteCard.tsx
    - apps/website/src/components/product/MobileBottomBar.tsx
    - apps/website/src/components/product/RelatedProducts.tsx
  modified:
    - packages/i18n/src/locales/en/website.json
    - packages/i18n/src/locales/ar/website.json

key-decisions:
  - "Related products fetched in route loader alongside main product for SSR"
  - "QuoteCard hidden on mobile via CSS, MobileBottomBar hidden on desktop (lg:hidden vs hidden lg:block)"
  - "Breadcrumb separator uses rtl:rotate-180 class for RTL flip instead of conditional icon"

patterns-established:
  - "Pattern: Mobile bottom bar replaces desktop sidebar card below lg breakpoint"
  - "Pattern: Related products use simplified inline cards (not full ProductCard) for lightweight rendering"
  - "Pattern: Specs table auto-labels from JSONB key names with title-case transform"

requirements-completed: [WEB-05]

duration: 4min
completed: 2026-03-31
---

# Phase 05 Plan 03: Product Detail Page Summary

**Product detail page with image gallery (hover zoom), specs table (alternating rows, Geist Mono numerics), quote CTA card with React Aria NumberField, mobile bottom bar, and related products horizontal scroll**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-31T17:38:03Z
- **Completed:** 2026-03-31T17:42:32Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Product detail route with SSR loader, head meta, breadcrumbs with RTL separator, and 404 state
- Image gallery with hover zoom 1.5x, thumbnail selection, and mobile full-screen overlay
- Specs table showing only populated fields with alternating row backgrounds and Geist Mono for numerics
- Quote card with React Aria NumberField, UOM display, stubbed Add to Quote, and WhatsApp fallback
- Mobile bottom bar replacing desktop quote card below lg breakpoint
- Related products from same category in horizontal scroll with snap points
- Complete i18n keys for product detail and 14 unit translations in EN + AR

## Task Commits

1. **Task 1: Product detail route + ImageGallery + SpecsTable + QuoteCard** - `6ef38da` (feat)
2. **Task 2: MobileBottomBar + RelatedProducts + i18n keys** - `d9c18c9` (feat)

## Files Created/Modified
- `apps/website/src/routes/_website/market/$productSlug.tsx` - Product detail route with SSR loader, breadcrumbs, 2-column layout, 404 state
- `apps/website/src/components/product/ImageGallery.tsx` - Primary image with hover zoom 1.5x, thumbnails, mobile overlay
- `apps/website/src/components/product/SpecsTable.tsx` - Alternating row specs table from JSONB + product fields
- `apps/website/src/components/product/QuoteCard.tsx` - Sticky sidebar with NumberField, WhatsApp link
- `apps/website/src/components/product/MobileBottomBar.tsx` - Fixed bottom bar with compact quantity + CTA
- `apps/website/src/components/product/RelatedProducts.tsx` - Horizontal scroll cards with snap
- `packages/i18n/src/locales/en/website.json` - Added market, product, and units namespaces
- `packages/i18n/src/locales/ar/website.json` - Added market, product, and units namespaces (Arabic)

## Decisions Made
- Related products fetched in route loader (SSR) alongside main product, filtered to exclude current product
- Mobile bottom bar and desktop quote card toggle via CSS breakpoint (lg:hidden / hidden lg:block)
- Breadcrumb RTL flip uses Tailwind rtl:rotate-180 on ChevronRight rather than conditional ChevronLeft import
- Add to Quote button logs to console as stub per plan (Login Modal coming in Phase 6)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in website app (missing @types/react, module declarations) affect all files including new ones. These are infrastructure issues documented in Plan 01 Summary, not caused by this plan.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `QuoteCard.tsx` line 72: `console.log('Add to Quote clicked - Login Modal coming in Phase 6')` - Intentional stub, will be replaced in Phase 6
- `MobileBottomBar.tsx` line 57: `console.log('Add to Quote - Phase 6')` - Same stub as QuoteCard

## Next Phase Readiness
- Product detail page complete and ready for integration with Market page (Plan 02)
- All product detail i18n keys available for Phase 6 (Login Modal) and Phase 9 (Portal quote flow)
- Unit translation keys available for all product-related rendering across apps

## Self-Check: PASSED

- All 6 created files exist on disk
- Both commits (6ef38da, d9c18c9) verified in git log
- $productSlug.tsx contains getProductBySlug, Breadcrumbs, PackageX, MobileBottomBar, RelatedProducts
- ImageGallery.tsx contains scale-150 and cairo.webp
- SpecsTable.tsx contains specifications and font-mono
- QuoteCard.tsx contains NumberField, console.log, wa.me
- MobileBottomBar.tsx contains fixed bottom, NumberField, h-16
- RelatedProducts.tsx contains overflow-x-auto, snap, w-50
- EN/AR website.json contain specsHeading, bag unit keys

---
*Phase: 05-website-market-product-detail*
*Completed: 2026-03-31*
