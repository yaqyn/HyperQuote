---
phase: 16-sales-module
plan: 03
subsystem: ui
tags: [react, tanstack-table, react-aria, rfq, inbox, sales]

requires:
  - phase: 16-01
    provides: sales types, server functions, Zustand store
  - phase: 16-02
    provides: shared components (TierBadge, AgeTimer, SLACountdown, CreditStatusBanner)
provides:
  - RFQ inbox with priority-sorted TanStack Table and preview pane
  - RFQ detail view with 60/40 split layout and 7 action buttons
  - Clarification form with 6 structured question types
  - Decline dialog with reason selection and confirmation
affects: [16-04-quote-builder, 16-06-negotiation, 16-07-customer-360]

tech-stack:
  added: []
  patterns: [inbox-preview-pane, dialog-confirmation-two-step, priority-badge-thresholds]

key-files:
  created:
    - apps/internal/src/components/sales/rfq/RFQInboxTable.tsx
    - apps/internal/src/components/sales/rfq/RFQPreviewPane.tsx
    - apps/internal/src/components/sales/rfq/RFQPriorityBadge.tsx
    - apps/internal/src/components/sales/rfq/RFQDetailView.tsx
    - apps/internal/src/components/sales/rfq/ClarificationForm.tsx
    - apps/internal/src/components/sales/rfq/DeclineRFQDialog.tsx
  modified:
    - apps/internal/src/components/sales/SalesModule.tsx

key-decisions:
  - "Two-step decline confirmation: first select reason, then confirm -- prevents accidental RFQ rejection"
  - "Inline note input in detail view instead of dialog -- faster for quick internal notes"

patterns-established:
  - "Inbox-preview pattern: left list (55%) + right preview pane (45%) on desktop, full-width list on mobile"
  - "Priority badge threshold levels: >75 !!!, 50-75 !!, 25-50 !, <25 blank"

requirements-completed: [SALE-01, SALE-02]

duration: 5min
completed: 2026-04-05
---

# Phase 16 Plan 03: RFQ Inbox & Detail Summary

**RFQ inbox with priority-sorted TanStack Table, desktop preview pane, full detail view with 7 actions, structured clarification form, and decline dialog with confirmation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-05T17:50:44Z
- **Completed:** 2026-04-05T17:56:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- RFQ inbox with TanStack Table: priority sorting, 5 tab filters (All/My/Unassigned/Needs Clarification/Urgent), J/K keyboard navigation, selected row highlight, "Assign to Me" claim action
- Desktop preview pane (45% width) showing customer info, materials breakdown, customer history, AI similar quotes, and 5 action buttons
- Full RFQ detail view with 60/40 split: materials table + delivery + attachments | customer context + credit + similar quotes + AI insights
- All 7 action buttons: Start Quote, Request Clarification, Decline RFQ, Assign to..., Add Note, Call Customer, View Full Customer Profile
- Clarification form with 6 structured question types (material_spec_ambiguous, quantity_unclear, delivery_access, no_date, mixed_units, missing_attachment) + free text
- Decline dialog with React Aria Select for 3 reasons, two-step confirmation, isKeyboardDismissDisabled

## Task Commits

Each task was committed atomically:

1. **Task 1: RFQ Inbox with priority-sorted table and preview pane** - `98286db` (feat)
2. **Task 2: RFQ Detail view with actions, clarification form, and decline dialog** - `3017019` (feat)

## Files Created/Modified
- `apps/internal/src/components/sales/rfq/RFQPriorityBadge.tsx` - Priority urgency indicator (!!!/!!/!) with Geist Mono
- `apps/internal/src/components/sales/rfq/RFQInboxTable.tsx` - Email-inbox style table with TanStack Table, sorting, filters, J/K nav
- `apps/internal/src/components/sales/rfq/RFQPreviewPane.tsx` - Desktop preview pane with customer info, materials, history, AI suggestions
- `apps/internal/src/components/sales/rfq/RFQDetailView.tsx` - Full detail with 60/40 split, materials table, customer context, 7 actions
- `apps/internal/src/components/sales/rfq/ClarificationForm.tsx` - Structured clarification with 6 question types + free text
- `apps/internal/src/components/sales/rfq/DeclineRFQDialog.tsx` - Decline with reason selection and two-step confirmation
- `apps/internal/src/components/sales/SalesModule.tsx` - Wired rfq-inbox tab to RFQInboxTable component

## Decisions Made
- Two-step decline confirmation: first select reason, then "Are you sure?" -- prevents accidental RFQ rejection in B2B context
- Inline note input in detail view (not dialog) -- faster workflow for quick internal notes during calls
- Preview pane uses same getRFQDetail query as full detail view -- consistent data, shared cache

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all components are wired to server functions from sales-rfq.ts (mock data in dev mode).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- RFQ inbox and detail views complete, ready for quote builder (Plan 04)
- ClarificationForm and DeclineRFQDialog reusable from any RFQ context
- Preview pane actions wired to mutations for claim, start quote, clarification

---
*Phase: 16-sales-module*
*Completed: 2026-04-05*
