---
phase: 05-website-market-product-detail
plan: 02
subsystem: ui
tags: [react-aria, tanstack-router, zod, i18n, fuse.js, pagination, filters]

requires:
  - phase: 05-website-market-product-detail
    provides: getPublicCatalog server function, formatPriceRange helper, search.ts
  - phase: 04-website-layout-home-about
    provides: _website layout route, WebsiteHeader/Footer, i18n setup
provides:
  - Market page route with SSR product loading via validateSearch + loader
  - FilterSidebar with CheckboxGroup (categories, price tiers) and RadioGroup (availability)
  - MobileFilterSheet with React Aria Modal bottom sheet pattern
  - SearchBar with 300ms debounce
  - ProductCard with grid/list variants and price ranges in Geist Mono
  - ProductGrid with sort dropdown and view toggle (localStorage persistence)
  - Pagination with RTL-aware chevrons
  - Full market + categories i18n keys (EN + AR)
affects: [06-website-remaining-pages, 07-portal-auth-shell]

tech-stack:
  added: []
  patterns: [URL search params via Zod validateSearch for filter state, localStorage view persistence, debounced search]

key-files:
  created:
    - apps/website/src/routes/_website/market/index.tsx
    - apps/website/src/components/market/SearchBar.tsx
    - apps/website/src/components/market/FilterSidebar.tsx
    - apps/website/src/components/market/MobileFilterSheet.tsx
    - apps/website/src/components/market/ProductCard.tsx
    - apps/website/src/components/market/ProductGrid.tsx
    - apps/website/src/components/market/Pagination.tsx
  modified:
    - packages/i18n/src/locales/en/website.json
    - packages/i18n/src/locales/ar/website.json

key-decisions:
  - "Pagination uses prev/next buttons with page number display instead of ListBox for simpler UX"
  - "Add to Quote button stubbed as console.log per Phase 6 Login Modal dependency"
  - "View toggle state stored in both localStorage and URL param for shareable links"

patterns-established:
  - "URL filter state: Zod schema transforms comma-joined strings to arrays for multi-select"
  - "Mobile filter sheet pattern: local state + Apply button to batch filter changes"
  - "Product card grid/list variant pattern via variant prop"

requirements-completed: [WEB-04]

duration: 6min
completed: 2026-03-31
---

# Phase 5 Plan 2: Market Catalog Page Summary

**SSR market catalog with filter sidebar, debounced search, grid/list toggle, pagination, and full EN/AR i18n for 27 product categories**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-31T17:18:00Z
- **Completed:** 2026-03-31T17:24:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Market page route with SSR product loading, Zod-validated search params, and proper error/empty states
- Full filter system: desktop sidebar with CheckboxGroup/RadioGroup, mobile bottom sheet with Modal
- ProductCard in grid (3-col responsive) and list (80px row) variants with price ranges in Geist Mono
- All 27 category translations plus full market namespace i18n in both EN and AR

## Task Commits

1. **Task 1: Market route + FilterSidebar + MobileFilterSheet + SearchBar** - `455ab67` (feat)
2. **Task 2: ProductCard + ProductGrid + Pagination + i18n keys** - `72abf00` (feat)

## Files Created/Modified
- `apps/website/src/routes/_website/market/index.tsx` - Market page route with validateSearch, loader, empty/error states
- `apps/website/src/components/market/SearchBar.tsx` - React Aria SearchField with 300ms debounce
- `apps/website/src/components/market/FilterSidebar.tsx` - Desktop filter sidebar with category, availability, price tier filters
- `apps/website/src/components/market/MobileFilterSheet.tsx` - Mobile bottom sheet with Apply/Reset and isKeyboardDismissDisabled
- `apps/website/src/components/market/ProductCard.tsx` - Grid and list card variants with formatPriceRange
- `apps/website/src/components/market/ProductGrid.tsx` - Sort dropdown, view toggle, skeleton loading
- `apps/website/src/components/market/Pagination.tsx` - Page numbers with RTL chevron flip
- `packages/i18n/src/locales/en/website.json` - Added market.* and categories.* keys
- `packages/i18n/src/locales/ar/website.json` - Added market.* and categories.* keys in Arabic

## Decisions Made
- Used prev/next pagination pattern instead of ListBox for page selection -- simpler, better keyboard UX
- Add to Quote button renders as stub (console.log) since Login Modal is Phase 6 dependency
- Filter sidebar uses logical CSS properties (ps-/pe-/inset-is-/inset-ie-) throughout for RTL

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `apps/website/src/components/market/ProductCard.tsx` line 109/157: "Add to Quote" onClick logs to console -- requires Phase 6 Login Modal

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Market page complete and ready for product detail page (Plan 03)
- Add to Quote requires Phase 6 Login Modal integration
- Product card links to `/market/$productSlug` which needs Plan 03 route

## Self-Check: PASSED

- All 7 created files verified on disk
- Commits 455ab67 and 72abf00 verified in git log

---
*Phase: 05-website-market-product-detail*
*Completed: 2026-03-31*
