---
phase: 09-portal-material-list-builder-quote-submission
plan: 05
subsystem: portal
tags: [approval-workflow, react-aria, tanstack-query, supabase, zustand]

requires:
  - phase: 09-portal-material-list-builder-quote-submission
    provides: "Quote builder flow, stores, server functions (Plans 01-04)"
  - phase: 07-portal-auth-shell
    provides: "Portal auth, WindowShell, route context with roles"
provides:
  - "Buyer-side approval workflow: submitForApproval, approve, requestChanges"
  - "useIsApprover/useNeedsApproval hooks for role-based UI"
  - "Orders window with 4 tabs (Active, Quotes, History, Drafts)"
  - "ApprovalBanner component for approver review"
  - "ReviewStep and SubmitConfirmation for step 3 of quote builder"
affects: [10-portal-quote-detail-acceptance, 11-portal-orders-delivery-remaining-windows]

tech-stack:
  added: []
  patterns: ["Conditional submit based on team role", "Server-side approver lookup with fallback to direct submit"]

key-files:
  created:
    - apps/portal/src/lib/server/approvals.ts
    - apps/portal/src/hooks/useApproval.ts
    - apps/portal/src/components/quote-builder/step3/ReviewStep.tsx
    - apps/portal/src/components/quote-builder/step3/SubmitConfirmation.tsx
    - apps/portal/src/components/quote-builder/ApprovalBanner.tsx
  modified:
    - apps/portal/src/routes/_portal/orders.tsx
    - apps/portal/src/components/quote-builder/QuoteBuilderFlow.tsx

key-decisions:
  - "No approver found = bypass approval (direct submit). Solo accounts skip approval gate."
  - "checkTeamHasApprover is a separate server function for useNeedsApproval hook with 5min staleTime"
  - "Dev mode localStorage flag 'dev-is-approver' for testing approval flows without auth"

patterns-established:
  - "Approval pattern: create approval record + keep entity as draft until approved"
  - "Role-based conditional UI: useIsApprover/useNeedsApproval hooks read from route context"

requirements-completed: [PORT-13]

duration: 6min
completed: 2026-04-01
---

# Phase 09 Plan 05: Buyer-side Approval Workflows Summary

**Approval server functions with conditional submit, approver review UI in Orders window with tabs/drafts**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T09:51:39Z
- **Completed:** 2026-04-01T09:57:39Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Full approval workflow: submitForApproval, getPendingApprovals, approveQuoteRequest, requestChanges server functions
- Conditional submit button: non-approver buyers see "Submit for Approval", approvers/solo users see direct submit
- Orders window overhauled with React Aria Tabs (Active, Quotes, History, Drafts) and approver pending section
- ReviewStep and SubmitConfirmation wired into QuoteBuilderFlow step 3

## Task Commits

Each task was committed atomically:

1. **Task 1: Approval server functions and conditional submit** - `21195c9` (feat)
2. **Task 2: Approver review UI in Orders window** - `fa42f40` (feat)

## Files Created/Modified
- `apps/portal/src/lib/server/approvals.ts` - submitForApproval, getPendingApprovals, approveQuoteRequest, requestChanges, checkTeamHasApprover
- `apps/portal/src/hooks/useApproval.ts` - useIsApprover, useNeedsApproval hooks
- `apps/portal/src/components/quote-builder/step3/ReviewStep.tsx` - Step 3 review with conditional approval submit
- `apps/portal/src/components/quote-builder/step3/SubmitConfirmation.tsx` - Success view with isApproval variant
- `apps/portal/src/components/quote-builder/ApprovalBanner.tsx` - Approver review card with approve/request changes
- `apps/portal/src/routes/_portal/orders.tsx` - Orders window with tabs, pending approvals, drafts
- `apps/portal/src/components/quote-builder/QuoteBuilderFlow.tsx` - Wired ReviewStep into step 3

## Decisions Made
- No approver found = bypass approval (direct submit). Solo accounts never get stuck in approval limbo.
- checkTeamHasApprover is a dedicated server function queried by useNeedsApproval with 5min staleTime to avoid repeated lookups.
- Dev mode localStorage flag 'dev-is-approver' allows testing approval UI without actual auth roles.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data paths wired to server functions with dev mode fallbacks.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Quote builder flow complete (steps 1-3 with approval workflow)
- Orders window ready for Phase 10 (quote detail) and Phase 11 (order tracking) population
- Active/Quotes/History tabs are placeholder empty states -- populated by future phases

---
*Phase: 09-portal-material-list-builder-quote-submission*
*Completed: 2026-04-01*
