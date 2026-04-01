---
phase: 12-supplier-portal
plan: 03
subsystem: ui
tags: [react-aria, tanstack-query, zustand, react-hook-form, zod, i18n]

requires:
  - phase: 12-supplier-portal
    provides: supplier types, server functions (supplier-orders.ts, supplier-invoices.ts), i18n keys, WindowShell, FloatingAIButton
provides:
  - PO inbox route with 3 tabs (Pending Action, Confirmed, History)
  - PO detail route with per-line confirm/reject and delivery scheduling
  - POCard, PODetail, POLineItem, DeliveryScheduleForm components
  - Invoice submission route with 2 tabs (Submit New, Submitted Invoices)
  - InvoiceForm with auto-populate from PO, 14% VAT calculation, mismatch warning
  - InvoiceListTable with status badges for 5 invoice statuses
affects: [12-04]

tech-stack:
  added: []
  patterns: [React Aria Checkbox for per-line confirm toggle, DropZone+FileTrigger for PDF upload, useWatch for reactive form totals]

key-files:
  created:
    - apps/portal/src/routes/_portal/supplier.orders.tsx
    - apps/portal/src/routes/_portal/supplier.orders.$poId.tsx
    - apps/portal/src/routes/_portal/supplier.invoices.tsx
    - apps/portal/src/components/supplier/POCard.tsx
    - apps/portal/src/components/supplier/PODetail.tsx
    - apps/portal/src/components/supplier/POLineItem.tsx
    - apps/portal/src/components/supplier/DeliveryScheduleForm.tsx
    - apps/portal/src/components/supplier/InvoiceForm.tsx
    - apps/portal/src/components/supplier/InvoiceListTable.tsx
  modified: []

key-decisions:
  - "POCard deadline urgency uses runtime Date comparison, not server-computed field"
  - "InvoiceForm VAT: Math.round(subtotal * 14) / 100 to avoid floating point errors"
  - "ConfirmedPOCard has inline Update Status modal rather than separate route"

patterns-established:
  - "Confirmed tab pattern: filter multiple statuses from single query result"
  - "Search param forwarding: supplier.invoices reads ?poId to pre-select PO in InvoiceForm"

requirements-completed: [SUPP-04, SUPP-05]

duration: 10min
completed: 2026-04-01
---

# Phase 12 Plan 03: PO Inbox + Invoice Submission Summary

**PO inbox with per-line confirm/reject, delivery scheduling, and invoice submission with auto-populate from POs and 14% VAT calculation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-01T20:59:17Z
- **Completed:** 2026-04-01T21:09:56Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- PO inbox with 3 tabs: Pending Action (sorted by urgency), Confirmed (with Update Status + Submit Invoice), History
- PO detail with per-line Checkbox confirm/reject, conditional reason Select (4 options), partial qty and price change NumberFields
- Invoice form auto-populates line items from selected PO via ComboBox, calculates VAT at 14% with Math.round precision
- All modals use GlassElevated pattern with isKeyboardDismissDisabled on reject modal

## Task Commits

1. **Task 1: PO inbox route + PO detail route + components** - `48ec6bb` (feat)
2. **Task 2: Invoice submission route + InvoiceForm + InvoiceListTable** - `56d13b7` (feat)

## Files Created/Modified
- `apps/portal/src/routes/_portal/supplier.orders.tsx` - PO inbox with 3 tabs, confirmed tab Update Status
- `apps/portal/src/routes/_portal/supplier.orders.$poId.tsx` - PO detail route
- `apps/portal/src/routes/_portal/supplier.invoices.tsx` - Invoice submission with 2 tabs
- `apps/portal/src/components/supplier/POCard.tsx` - PO summary card with deadline color coding
- `apps/portal/src/components/supplier/PODetail.tsx` - Full PO detail with confirm/reject modals
- `apps/portal/src/components/supplier/POLineItem.tsx` - Per-line toggle with conditional fields
- `apps/portal/src/components/supplier/DeliveryScheduleForm.tsx` - Ship date, method, tracking, notes
- `apps/portal/src/components/supplier/InvoiceForm.tsx` - RHF + standardSchemaResolver, useWatch, ComboBox
- `apps/portal/src/components/supplier/InvoiceListTable.tsx` - Invoice list with 5 status badges

## Decisions Made
- POCard deadline urgency computed client-side from responseDeadline vs Date.now()
- InvoiceForm VAT uses `Math.round(subtotal * 14) / 100` per RESEARCH.md Pitfall 4
- ConfirmedPOCard includes inline Update Status modal (not a separate route) for faster workflow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Known Stubs
None -- all components consume real server functions from Plan 01 (which return mock data in dev mode).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PO and invoice routes ready for Plan 04 (Analytics dashboard)
- All supplier routes now exist: /supplier/stock (Plan 02), /supplier/orders (Plan 03), /supplier/invoices (Plan 03)

## Self-Check: PASSED

All 9 created files verified on disk. Both task commits (48ec6bb, 56d13b7) verified in git log.

---
*Phase: 12-supplier-portal*
*Completed: 2026-04-01*
