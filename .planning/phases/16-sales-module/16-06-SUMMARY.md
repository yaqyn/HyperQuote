---
phase: 16-sales-module
plan: 06
subsystem: ui
tags: [react, react-aria, negotiation, quote-lifecycle, slider, dialog]

requires:
  - phase: 16-01
    provides: sales types, server functions (markAsWon, markAsLost, convertQuoteToOrder)
  - phase: 16-02
    provides: SalesModule shell with negotiatingQuoteId state, SalesTabStrip

provides:
  - NegotiationView root component with version timeline, comparison, calculator, thread
  - VersionTimeline horizontal strip traversing previous_version_id chain
  - SideBySideComparison with price diff highlighting and customerCounterPrice
  - WhatIfCalculator with React Aria Slider and real-time margin recalculation
  - ConvertToOrderDialog with standard and phone-confirmed conversion paths
  - NegotiationThread with internal-only flagging and addInternalNote mutation

affects: [16-09-pipeline, 18-orders-module]

tech-stack:
  added: []
  patterns:
    - "Version chain traversal via previous_version_id for quote version timeline"
    - "What-if recalculation pattern: blanket margin + per-item overrides"
    - "Dual conversion path: standard (portal accept) vs phone-confirmed"

key-files:
  created:
    - apps/internal/src/components/sales/negotiation/NegotiationView.tsx
    - apps/internal/src/components/sales/negotiation/VersionTimeline.tsx
    - apps/internal/src/components/sales/negotiation/SideBySideComparison.tsx
    - apps/internal/src/components/sales/negotiation/WhatIfCalculator.tsx
    - apps/internal/src/components/sales/negotiation/ConvertToOrderDialog.tsx
    - apps/internal/src/components/sales/negotiation/NegotiationThread.tsx
  modified:
    - apps/internal/src/components/sales/SalesModule.tsx

key-decisions:
  - "Mock version chain simulates previous_version_id traversal until Supabase connected"
  - "WhatIfCalculator uses blanket margin slider with per-item override expansion"
  - "ConvertToOrderDialog shows all 5 downstream effects before conversion"

patterns-established:
  - "Negotiation event timeline with type-based icons and internal-only flagging"
  - "Side-by-side price diff with green (lower=better for customer) and red (higher) highlighting"

requirements-completed: [SALE-06]

duration: 6min
completed: 2026-04-05
---

# Phase 16 Plan 06: Negotiation View Summary

**Quote negotiation lifecycle with version timeline, side-by-side price comparison, what-if margin calculator, and quote-to-order conversion dialog**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-05T18:05:52Z
- **Completed:** 2026-04-05T18:11:34Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- NegotiationView root with 60/40 split layout (comparison + calculator), version timeline, thread, and actions bar
- VersionTimeline horizontal strip with previous_version_id chain traversal, Geist Mono for versions/dates/prices
- SideBySideComparison with price diff highlighting (green=lower, red=higher) and customerCounterPrice column
- WhatIfCalculator with React Aria Slider (0-50%), real-time recalculation, per-item adjustments, VAT via Math.round(subtotal * 14) / 100
- ConvertToOrderDialog with isKeyboardDismissDisabled, standard + phone-confirmed paths, customer PO number, advance payment option
- NegotiationThread with event timeline, internal-only flagging with lock icon, addInternalNote mutation
- SalesModule wired to render NegotiationView when negotiatingQuoteId is set

## Task Commits

Each task was committed atomically:

1. **Task 1: NegotiationView, VersionTimeline, SideBySideComparison, NegotiationThread** - `c35ea77` (feat)
2. **Task 2: WhatIfCalculator and ConvertToOrderDialog** - `7ed0725` (feat)

## Files Created/Modified
- `apps/internal/src/components/sales/negotiation/NegotiationView.tsx` - Root negotiation view with layout, Mark as Lost dialog, actions bar
- `apps/internal/src/components/sales/negotiation/VersionTimeline.tsx` - Horizontal version chain strip with selection
- `apps/internal/src/components/sales/negotiation/SideBySideComparison.tsx` - Two-column price comparison with diff highlighting
- `apps/internal/src/components/sales/negotiation/NegotiationThread.tsx` - Event timeline with internal-only notes and Add Note input
- `apps/internal/src/components/sales/negotiation/WhatIfCalculator.tsx` - Margin slider with real-time recalculation
- `apps/internal/src/components/sales/negotiation/ConvertToOrderDialog.tsx` - Quote-to-order conversion with dual paths
- `apps/internal/src/components/sales/SalesModule.tsx` - Wired NegotiationView conditional render

## Decisions Made
- Mock version chain simulates previous_version_id traversal (3 versions: Original, Revised, Current) until Supabase is connected
- WhatIfCalculator uses blanket margin slider with expandable per-item overrides section
- ConvertToOrderDialog shows all 5 downstream effects (SO, POs, delivery, notifications, proforma) before conversion
- Loss reason dialog uses native select for simplicity, with conditional competitor name field

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Negotiation view complete, ready for pipeline integration (Plan 09)
- Order detail navigation placeholder for Phase 18
- All mock data wired; real Supabase queries deferred to database connection phase

---
*Phase: 16-sales-module*
*Completed: 2026-04-05*
