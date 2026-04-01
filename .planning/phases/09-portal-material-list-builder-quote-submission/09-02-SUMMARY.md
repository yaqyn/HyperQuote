---
phase: 09-portal-material-list-builder-quote-submission
plan: 02
subsystem: ui
tags: [react-aria, combobox, gridlist, drag-drop, zustand, motion, i18n, quote-builder]

requires:
  - phase: 09-portal-material-list-builder-quote-submission
    provides: Zustand store (useQuoteBuilderStore), useProductSearch hook, useQuoteDraft hook, server functions
  - phase: 07-portal-auth-shell
    provides: WindowShell, FloatingAIButton, portal layout, auth pattern

provides:
  - /orders/new route with 3-step quote builder flow
  - QuoteBuilderFlow orchestrator with step transitions and action bar
  - StepIndicator with accessible step navigation
  - BuildListStep with 4-tab input method selector
  - SearchAndAdd ComboBox with debounced product search
  - ProductListTable with drag reorder, inline editing, mobile card layout
  - DraftResumeBanner for returning users
  - 70+ i18n keys for EN and AR covering all Phase 9 UI text

affects: [09-03, 09-04, 09-05]

tech-stack:
  added: []
  patterns: [GridList + useDragAndDrop for reorderable lists, ComboBox with useProductSearch for product search, AnimatePresence mode=wait for step transitions]

key-files:
  created:
    - apps/portal/src/routes/_portal/orders_.new.tsx
    - apps/portal/src/components/quote-builder/QuoteBuilderFlow.tsx
    - apps/portal/src/components/quote-builder/StepIndicator.tsx
    - apps/portal/src/components/quote-builder/DraftResumeBanner.tsx
    - apps/portal/src/components/quote-builder/step1/BuildListStep.tsx
    - apps/portal/src/components/quote-builder/step1/SearchAndAdd.tsx
    - apps/portal/src/components/quote-builder/step1/ProductListTable.tsx
  modified:
    - apps/portal/src/routes/_portal/orders.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json

key-decisions:
  - "Removed react-stately useListData -- direct Zustand store items as GridList source for simpler sync"
  - "UOM step sizes defined as inline lookup table in ProductListTable for NumberField step prop"
  - "Draft resume banner as separate component for clean separation from flow orchestrator"

patterns-established:
  - "GridList + useDragAndDrop pattern for keyboard-accessible drag reorder in React Aria"
  - "ComboBox with menuTrigger=input for search-as-you-type product lookup"
  - "Step transitions via AnimatePresence mode=wait with x-offset tween"
  - "Mobile card layout breakpoint at md -- no drag reorder below md"

requirements-completed: [PORT-04]

duration: 6min
completed: 2026-04-01
---

# Phase 9 Plan 2: Core Step 1 UI Summary

**3-step quote builder route with SearchAndAdd ComboBox, drag-reorderable ProductListTable (GridList), StepIndicator, and 70+ bilingual i18n keys**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T09:43:14Z
- **Completed:** 2026-04-01T09:49:09Z
- **Tasks:** 2/2
- **Files created:** 7
- **Files modified:** 3

## Accomplishments

- /orders/new route renders WindowShell with 3-step flow orchestrator, draft resume banner, and FloatingAI
- SearchAndAdd ComboBox with 150ms debounced product search, category badges, availability dots, auto-focus on quantity
- ProductListTable with React Aria GridList + useDragAndDrop for keyboard-accessible drag reorder, inline NumberField/TextField editing, delete with Trash2
- StepIndicator with active/completed/upcoming states, accessible navigation (aria-current="step"), mobile-responsive
- 70+ i18n keys in EN and AR covering all copywriting contract items from 09-UI-SPEC.md
- Mobile card layout for product items, desktop grid with drag handles

## Task Commits

1. **Task 1: Route, flow orchestrator, step indicator, and i18n keys** - `c9ae430` (feat)
2. **Task 2: Search & Add method and product list table with drag reorder** - `4bbaa81` (feat)

## Files Created/Modified

- `apps/portal/src/routes/_portal/orders_.new.tsx` - New quote builder route within portal
- `apps/portal/src/components/quote-builder/QuoteBuilderFlow.tsx` - 3-step flow orchestrator with transitions
- `apps/portal/src/components/quote-builder/StepIndicator.tsx` - Accessible step indicator component
- `apps/portal/src/components/quote-builder/DraftResumeBanner.tsx` - Draft resume banner for returning users
- `apps/portal/src/components/quote-builder/step1/BuildListStep.tsx` - Step 1 with 4-tab input methods
- `apps/portal/src/components/quote-builder/step1/SearchAndAdd.tsx` - Product search ComboBox
- `apps/portal/src/components/quote-builder/step1/ProductListTable.tsx` - Reorderable product list with GridList
- `apps/portal/src/routes/_portal/orders.tsx` - Added "New Quote Request" button
- `packages/i18n/src/locales/en/portal.json` - Added 70+ quoteBuilder i18n keys
- `packages/i18n/src/locales/ar/portal.json` - Added 70+ quoteBuilder Arabic i18n keys

## Decisions Made

- Removed react-stately useListData dependency -- using Zustand store items directly as GridList source for simpler state sync
- UOM step sizes defined as inline lookup table rather than importing from shared package (self-contained, no cross-package dependency for UI logic)
- Draft resume banner is a separate component rather than inline in the route for clean separation of concerns

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Removed react-stately import**
- **Found during:** Task 2
- **Issue:** Plan specified useListData from react-stately but the package was unused after switching to direct Zustand store binding
- **Fix:** Removed import, used items directly from useQuoteBuilderStore
- **Files modified:** ProductListTable.tsx
- **Committed in:** 4bbaa81

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor simplification. No scope creep.

## Issues Encountered

None.

## Known Stubs

- Steps 2 and 3 in QuoteBuilderFlow render placeholder divs (will be implemented in Plans 04 and 05)
- Upload, Quick Pad, and AI Assist tabs render "Coming soon" placeholders (will be implemented in Plan 03)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03 (Upload, Quick Pad, AI Assist input methods) can build directly on BuildListStep tabs
- Plans 04-05 (Details and Review steps) can replace placeholder divs in QuoteBuilderFlow
- All i18n keys for the entire Phase 9 are already in place

---
*Phase: 09-portal-material-list-builder-quote-submission*
*Completed: 2026-04-01*
