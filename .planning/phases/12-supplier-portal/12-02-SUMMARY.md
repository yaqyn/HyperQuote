---
phase: 12-supplier-portal
plan: 02
subsystem: ui
tags: [react-aria, inline-edit, number-field, papaparse, csv-diff, zustand, tanstack-query]

requires:
  - phase: 12-supplier-portal
    provides: supplier types, server functions, i18n keys, recharts
provides:
  - Stock & Pricing route with 3-tab layout (My Products, Price Updates, Upload History)
  - InlineEditCell component for click-to-edit price/quantity with flash feedback
  - FreshnessIndicator with color-coded relative time
  - StockTable with React Aria Table, inline editing, StatusBadge, pagination
  - ProductEditDrawer (480px inline-end slide, RHF + standardSchemaResolver)
  - BulkUpdateDiff with PapaParse CSV download/upload and diff preview
  - PriceHistoryTable with old/new price display and status badges
  - UploadHistoryList with keyboard-accessible cards navigating to catalog review
affects: [12-03, 12-04, 12-05]

tech-stack:
  added: []
  patterns: [standalone React Aria NumberField for inline table cells, lazy-loaded tab panels with Suspense]

key-files:
  created:
    - apps/portal/src/routes/_portal/supplier.stock.tsx
    - apps/portal/src/components/supplier/StockTable.tsx
    - apps/portal/src/components/supplier/InlineEditCell.tsx
    - apps/portal/src/components/supplier/FreshnessIndicator.tsx
    - apps/portal/src/components/supplier/ProductEditDrawer.tsx
    - apps/portal/src/components/supplier/BulkUpdateDiff.tsx
    - apps/portal/src/components/supplier/PriceHistoryTable.tsx
    - apps/portal/src/components/supplier/UploadHistoryList.tsx

key-decisions:
  - "InlineEditCell uses standalone React Aria NumberField (not RHF wrapper) since cells lack FormProvider context"
  - "ProductEditDrawer uses RHF NumberField from @hyperquote/forms (wrapped version with Controller)"
  - "BulkUpdateDiff indexes products by ID for O(1) diff lookup per Pitfall 3 guidance"
  - "Tab panels lazy-loaded with React.lazy + Suspense for code splitting"

patterns-established:
  - "Inline table editing: standalone NumberField + element.animate flash on success + revert on error"
  - "Tab-based window layout: WindowShell > Tabs > TabList > TabPanel with lazy content"

requirements-completed: [SUPP-02]

duration: 4min
completed: 2026-04-01
---

# Phase 12 Plan 02: Stock & Pricing Window Summary

**React Aria Table with inline price/qty editing, freshness indicators, product edit drawer, CSV bulk update with diff preview, price history, and upload history tabs**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-01T21:04:00Z
- **Completed:** 2026-04-01T21:08:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Stock & Pricing window with 3-tab layout: My Products, Price Updates, Upload History
- Inline editing for price and quantity columns with immediate server save, green flash feedback, and error revert
- FreshnessIndicator with < 24h green, 1-3d yellow, > 3d red color coding via Intl.RelativeTimeFormat
- ProductEditDrawer with RHF + Zod + standardSchemaResolver, 480px inline-end slide, spring enter animation
- BulkUpdateDiff with PapaParse CSV download/upload, O(1) diff comparison, confirmation modal
- PriceHistoryTable with old price strikethrough, StatusBadge per status, pending review note
- UploadHistoryList with keyboard-accessible cards (React Aria Button) navigating to catalog review

## Task Commits

1. **Task 1: Stock route + StockTable + InlineEditCell + FreshnessIndicator** - `07a7041` (feat)
2. **Task 2: ProductEditDrawer + BulkUpdateDiff + PriceHistoryTable + UploadHistoryList** - `96b2826` (feat)

## Files Created/Modified
- `apps/portal/src/routes/_portal/supplier.stock.tsx` - Stock & Pricing window with 3 tabs, lazy imports
- `apps/portal/src/components/supplier/StockTable.tsx` - React Aria Table with inline edit, pagination, empty state
- `apps/portal/src/components/supplier/InlineEditCell.tsx` - Standalone NumberField, blur/Enter save, flash feedback
- `apps/portal/src/components/supplier/FreshnessIndicator.tsx` - Color-coded relative time with Intl.RelativeTimeFormat
- `apps/portal/src/components/supplier/ProductEditDrawer.tsx` - 480px drawer, RHF + standardSchemaResolver, spring animation
- `apps/portal/src/components/supplier/BulkUpdateDiff.tsx` - CSV download/upload via PapaParse, diff preview, confirmation
- `apps/portal/src/components/supplier/PriceHistoryTable.tsx` - Price history table with strikethrough old values
- `apps/portal/src/components/supplier/UploadHistoryList.tsx` - Upload history cards with keyboard-accessible navigation

## Decisions Made
- InlineEditCell uses standalone React Aria NumberField because inline table cells don't have FormProvider context
- ProductEditDrawer uses RHF-wrapped NumberField from @hyperquote/forms for full form context
- BulkUpdateDiff indexes products by ID in a Map for O(1) lookup during diff comparison (per Pitfall 3)
- Tab panels lazy-loaded via React.lazy + Suspense to avoid loading all components on initial render

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Known Stubs
None -- all components wire to server functions from Plan 01 which return complete mock data.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Stock & Pricing window fully functional with inline editing and all tab content
- ProductEditDrawer and BulkUpdateDiff available as lazy imports
- Ready for Plan 03 (PO inbox) and Plan 04 (catalog upload flow)

## Self-Check: PASSED

All 8 created files verified present. Both task commits (07a7041, 96b2826) verified in git log.

---
*Phase: 12-supplier-portal*
*Completed: 2026-04-01*
