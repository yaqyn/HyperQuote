---
phase: 10-portal-quote-detail-acceptance
plan: 02
title: "Quote Detail Route and Display Components"
one_liner: "Quote detail page with header, timeline, line items table, subtotals, and sticky action bar"
completed: 2026-04-01
duration: 2min
tasks_completed: 2
tasks_total: 2
dependency_graph:
  requires: [10-01]
  provides: [quote-detail-route, quote-display-components]
  affects: [10-03]
tech_stack:
  added: []
  patterns: [react-aria-table, conditional-rendering-by-status, editable-cell-pattern]
key_files:
  created:
    - apps/portal/src/routes/_portal/orders_.$quoteId.tsx
    - apps/portal/src/components/quote-detail/QuoteDetail.tsx
    - apps/portal/src/components/quote-detail/QuoteHeader.tsx
    - apps/portal/src/components/quote-detail/QuoteTimeline.tsx
    - apps/portal/src/components/quote-detail/LineItemsTable.tsx
    - apps/portal/src/components/quote-detail/SubtotalsSection.tsx
    - apps/portal/src/components/quote-detail/ValidityCountdown.tsx
    - apps/portal/src/components/quote-detail/QuoteActionBar.tsx
  modified: []
decisions:
  - "StatusBadge maps QuoteStatus to semantic variants (success/warning/error/info/neutral) via getStatusVariant helper"
  - "LineItemsTable EditablePrice uses local state with inline editing pattern, ready for Plan 03 wiring"
requirements: [PORT-05]
---

# Phase 10 Plan 02: Quote Detail Route and Display Components Summary

Quote detail page with header, timeline, line items table, subtotals, and sticky action bar -- all numbers in Geist Mono, RTL-safe with logical properties.

## Task Results

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Route file and QuoteDetail orchestrator | 4a60dce | orders_.$quoteId.tsx, QuoteDetail.tsx |
| 2 | Display components (Header, Timeline, LineItems, Subtotals, Validity, ActionBar) | abdf49c | 6 component files |

## What Was Built

**Route (`orders_.$quoteId.tsx`):** TanStack Router dynamic route that loads quote data via `getQuoteDetail` server function in the loader, wraps content in `WindowShell` with `FloatingAIButton`.

**QuoteDetail orchestrator:** Composes all sub-components with conditional rendering -- line items and subtotals hidden for early statuses (draft/internal_review/pending_approval/approved), action bar only shown when status is 'sent'. Back link with RTL-safe arrow rotation.

**QuoteHeader:** Reference in Geist Mono 20px 600, DateDisplay for createdAt, StatusBadge with mapped semantic variant, ValidityCountdown, and WhatsApp rep link.

**QuoteTimeline:** 7-step timeline with vertical desktop layout (connecting lines, green completed circles, animated blue current, gray future dots) and horizontal scrollable mobile layout.

**LineItemsTable:** React Aria Table for desktop with 6 columns (all numbers text-end + font-mono), card layout for mobile. Accepts `editable`, `onPriceChange`, `partialMode`, and `renderPartialControls` props for Plan 03 integration. EditablePrice component with inline editing, strikethrough original price, and amber highlight for modified cells.

**SubtotalsSection:** End-aligned totals with subtotal, delivery fee (green "free" when 0), VAT 14%, divider, and bold total in Geist Mono 18px 600. Payment terms box and price disclaimer below.

**ValidityCountdown:** Color-coded by urgency -- muted for >3 days, warning for <=3, error for expired.

**QuoteActionBar:** Sticky bottom bar with 4 React Aria Buttons: Accept (green bg), Counter-Offer (amber outline), Partial Accept (blue outline), Decline (red outline). Row layout on desktop, column on mobile.

## Verification Results

- 7 files in quote-detail/ directory
- font-mono count: 18 (>= 10 threshold)
- text-end count: 9 (>= 3 threshold)
- CurrencyDisplay count: 12 (>= 4 threshold)
- useTranslation count: 14 (>= 5 threshold)
- Route file contains createFileRoute, getQuoteDetail, WindowShell, FloatingAIButton, Route.useLoaderData()

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- action bar `onAccept`/`onCounter`/`onPartial`/`onDecline` pass empty functions in QuoteDetail.tsx, but these are intentionally wired by Plan 03 (quote actions/negotiation flows).

## Self-Check: PASSED
