---
phase: 12-supplier-portal
plan: 01
subsystem: api
tags: [tanstack-start, server-functions, zustand, i18n, recharts, lucide-react]

requires:
  - phase: 07-portal-auth
    provides: portal shell, role toggle, NavButtons, WindowShell, useShortcut, usePortalStore
provides:
  - 10 TypeScript interfaces for supplier domain (SupplierProduct, SupplierPO, SupplierInvoice, SupplierAnalytics, etc.)
  - 13 server functions across 5 files with mock data for dev mode
  - Supplier keyboard shortcuts (S/P/A) conditioned on activeRole
  - Analytics nav button in NavButtons (BarChart3 icon)
  - AI context switching for supplier mode in FloatingAIButton
  - Profile popover supplier links (Invoice Submission, Catalog Upload, Quality Requirements)
  - Full i18n namespace (100+ keys EN+AR) for all Phase 12 supplier views
  - Recharts dependency installed for analytics chart
affects: [12-02, 12-03, 12-04, 12-05]

tech-stack:
  added: [recharts ^3.8.1]
  patterns: [supplier server function pattern with isSupabaseConfigured dev fallback, array-based bulk update signature]

key-files:
  created:
    - apps/portal/src/types/supplier.ts
    - apps/portal/src/lib/server/supplier-stock.ts
    - apps/portal/src/lib/server/supplier-orders.ts
    - apps/portal/src/lib/server/supplier-invoices.ts
    - apps/portal/src/lib/server/supplier-catalog.ts
    - apps/portal/src/lib/server/supplier-analytics.ts
  modified:
    - apps/portal/src/components/canvas/NavButtons.tsx
    - apps/portal/src/components/windows/FloatingAIButton.tsx
    - apps/portal/src/components/shell/ProfileMenu.tsx
    - apps/portal/src/routes/_portal.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json
    - apps/portal/package.json

key-decisions:
  - "bulkUpdatePrices uses array-based { updates[] } input, not { fileUrl } -- CSV parsed client-side via PapaParse, diff array sent to server"
  - "ProfileMenu.tsx is the actual component (not ProfilePopover.tsx) -- adapted plan to match existing codebase"
  - "FloatingAIButton.tsx is at components/windows/ (not components/canvas/) -- adapted plan to match existing path"
  - "Customer shortcuts O/M conditioned on activeRole === 'customer' to prevent conflict with supplier shortcuts"

patterns-established:
  - "Supplier server functions follow same isSupabaseConfigured() + mock data pattern as orders.ts"
  - "Role-conditional useShortcut via { enabled: activeRole === 'role' } opts object"

requirements-completed: [SUPP-01]

duration: 7min
completed: 2026-04-01
---

# Phase 12 Plan 01: Supplier Portal Foundation Summary

**13 supplier server functions with mock data, types, S/P/A keyboard shortcuts, analytics nav button, AI context switch, profile popover links, recharts, and full EN+AR i18n namespace**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-01T20:49:14Z
- **Completed:** 2026-04-01T20:55:44Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- 10 TypeScript interfaces covering all supplier domain types (products, POs, invoices, analytics, catalog uploads)
- 13 server functions across 5 files, all returning realistic mock data (building materials in EGP, HQ-2026-NNNN references, no customer names)
- SUPP-01 complete: keyboard shortcuts S/P/A, analytics nav button, AI supplier context, profile popover links
- Full i18n coverage for all Phase 12 supplier views in both English and Arabic

## Task Commits

1. **Task 1: Supplier types + server functions + recharts** - `f2f6bcd` (feat)
2. **Task 2: SUPP-01 keyboard shortcuts + nav + AI + profile + i18n** - `f857929` (feat)

## Files Created/Modified
- `apps/portal/src/types/supplier.ts` - 10 interfaces for supplier domain
- `apps/portal/src/lib/server/supplier-stock.ts` - 4 functions: getSupplierProducts, updateSupplierStock, bulkUpdatePrices, getSupplierPriceHistory
- `apps/portal/src/lib/server/supplier-orders.ts` - 4 functions: getSupplierPOs, confirmPO, rejectPO, uploadDeliveryNote
- `apps/portal/src/lib/server/supplier-invoices.ts` - 2 functions: submitSupplierInvoice, getSupplierInvoices
- `apps/portal/src/lib/server/supplier-catalog.ts` - 2 functions: uploadCatalog, getSupplierUploadHistory
- `apps/portal/src/lib/server/supplier-analytics.ts` - 1 function: getSupplierAnalytics
- `apps/portal/src/components/canvas/NavButtons.tsx` - Added BarChart3 analytics button to supplier items
- `apps/portal/src/components/windows/FloatingAIButton.tsx` - Added activeRole awareness and supplier context
- `apps/portal/src/components/shell/ProfileMenu.tsx` - Added supplier links (invoices, catalog, quality)
- `apps/portal/src/routes/_portal.tsx` - Added S/P/A supplier shortcuts, conditioned O/M to customer
- `packages/i18n/src/locales/en/portal.json` - Full supplier namespace + nav keys
- `packages/i18n/src/locales/ar/portal.json` - Full Arabic supplier namespace + nav keys
- `apps/portal/package.json` - Added recharts ^3.8.1

## Decisions Made
- bulkUpdatePrices locked to array-based `{ updates[] }` signature (CONTEXT.md says `{ fileUrl }` but diff preview UX requires parsed array)
- ProfileMenu.tsx is the actual file (plan referenced ProfilePopover.tsx which doesn't exist)
- FloatingAIButton.tsx located at components/windows/ (plan referenced components/canvas/)
- Customer shortcuts O/M now conditioned on `activeRole === 'customer'` to prevent key conflicts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted file paths for FloatingAIButton and ProfilePopover**
- **Found during:** Task 2
- **Issue:** Plan referenced `components/canvas/FloatingAIButton.tsx` and `components/layout/ProfilePopover.tsx` which don't exist. Actual files are `components/windows/FloatingAIButton.tsx` and `components/shell/ProfileMenu.tsx`.
- **Fix:** Updated the correct existing files at their actual paths.
- **Files modified:** FloatingAIButton.tsx, ProfileMenu.tsx
- **Verification:** grep confirms activeRole usage in both files
- **Committed in:** f857929

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** File path correction only. All planned functionality delivered.

## Issues Encountered
None

## Known Stubs
None -- all server functions return complete mock data, all i18n keys have values.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 13 server functions ready for Wave 2 plans to consume
- Types importable from `../../types/supplier`
- i18n keys cover all strings needed by Plans 02-04
- Recharts ready for analytics chart in Plan 04

---
*Phase: 12-supplier-portal*
*Completed: 2026-04-01*
