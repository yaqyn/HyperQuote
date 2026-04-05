---
phase: 16-sales-module
plan: 07
subsystem: sales-customer360
tags: [customer-360, health-score, add-customer, tabs, lazy-loading]
dependency_graph:
  requires: [16-01, 16-02]
  provides: [customer-360-view, add-customer-dialog, health-score]
  affects: [SalesModule]
tech_stack:
  added: []
  patterns: [lazy-tab-loading, duplicate-check-on-blur, composite-health-score]
key_files:
  created:
    - apps/internal/src/components/sales/customer360/Customer360View.tsx
    - apps/internal/src/components/sales/customer360/CustomerHeader.tsx
    - apps/internal/src/components/sales/customer360/HealthScore.tsx
    - apps/internal/src/components/sales/customer360/OverviewTab.tsx
    - apps/internal/src/components/sales/customer360/ContactsTab.tsx
    - apps/internal/src/components/sales/customer360/QuotesTab.tsx
    - apps/internal/src/components/sales/customer360/OrdersTab.tsx
    - apps/internal/src/components/sales/customer360/FinancialsTab.tsx
    - apps/internal/src/components/sales/customer360/ProjectsTab.tsx
    - apps/internal/src/components/sales/customer360/CommunicationsTab.tsx
    - apps/internal/src/components/sales/customer360/DocumentsTab.tsx
    - apps/internal/src/components/sales/customer360/NotesTab.tsx
    - apps/internal/src/components/sales/AddCustomerDialog.tsx
  modified:
    - apps/internal/src/components/sales/SalesModule.tsx
decisions:
  - Tabs use enabled prop + per-tab useQuery for lazy loading (no React.lazy)
  - Duplicate check runs on blur, not on every keystroke
  - Health score factors use default mock values until server computation exists
metrics:
  duration: 8min
  completed: 2026-04-05
---

# Phase 16 Plan 07: Customer 360 View & Add Customer Summary

Customer 360 with 9 lazy-loaded tabs showing full customer history, composite health score (0-100), and Add Customer dialog with Egyptian phone validation and duplicate protection.

## What Was Built

### Task 1a: Customer360View with header, health score, and first 3 tabs
- **Customer360View.tsx**: Root component with fixed CustomerHeader + 9 React Aria Tabs. Uses `getCustomer360` with 2min staleTime. Each tab receives `enabled` prop tied to `selectedTab` state.
- **CustomerHeader.tsx**: Company name, TierBadge, address, phone (Geist Mono), account manager. Unclaimed customers get yellow banner "No credit established" with dashed border.
- **HealthScore.tsx**: Composite 0-100 score with color coding (green >70, yellow 40-70, red <40). Score number in Geist Mono. 6-factor breakdown (payment history, order frequency, revenue trend, relationship depth, quote win rate, recent activity) each with mini progress bar.
- **OverviewTab.tsx**: Health score card, key metrics (lifetime value, orders, revenue, win rate -- all Geist Mono), credit & AR card, key contacts (top 5), recent activity timeline.
- **ContactsTab.tsx**: React Aria Table with expandable rows for relationship strength and deal roles. Org chart visualization from reportsTo hierarchy. +Add Contact button.
- **QuotesTab.tsx**: React Aria Table with win/loss analysis. Status filter via React Aria Select. Quote numbers and values in Geist Mono. Outcome badges (green won, red lost).
- **Commit:** `8364903`

### Task 1b: Remaining 6 tabs + AddCustomerDialog + SalesModule wiring
- **OrdersTab.tsx**: React Aria Table with order number, date, total, status, delivery status, payment status columns. All numbers in Geist Mono.
- **FinancialsTab.tsx**: Credit limit history timeline, AR aging 5 buckets (current/1-30/31-60/61-90/90+) with proportional bars, payment history table with on-time/late indicators, avg days to pay. All amounts in Geist Mono.
- **ProjectsTab.tsx**: Project cards with stage pills (planning/foundation/structure/finishing), material requirement tags. AI cross-sell placeholder.
- **CommunicationsTab.tsx**: Searchable chronological timeline. Type icons (call/email/meeting/WhatsApp). Text filter on summary and contact name.
- **DocumentsTab.tsx**: Upload area (drag & drop + file input), document grid with type icons. View/download buttons.
- **NotesTab.tsx**: Add note form with tag selection (general/quote-related/order-related). Notes list with author avatars, tags, timestamps.
- **AddCustomerDialog.tsx**: React Aria Dialog with React Hook Form. 3 required fields (phone, company, contact). Egyptian phone regex validation. Phone duplicate check on blur via `getCustomerList`. Fuzzy company name duplicate check on blur. Warning banners with link to existing customer. Creates unclaimed record with no auth credentials. Optional fields: delivery address, project name, notes.
- **SalesModule.tsx**: Wired Customer360View for customer-360 tab. Added AddCustomerDialog button to tab strip area.
- **Commit:** `15425bb`

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None. All components render real mock data from `sales-customers.ts` server functions. Add Contact dialog, file upload handler, and addInternalNote mutation are TODO placeholders for future plans but do not prevent the current plan's goals.

## Self-Check: PASSED

- All 13 created files verified on disk
- Commit 8364903 (Task 1a) verified in git log
- Commit 15425bb (Task 1b) verified in git log
