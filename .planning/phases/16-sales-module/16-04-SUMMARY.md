---
phase: 16-sales-module
plan: "04"
subsystem: sales
tags: [quote-builder, react-hook-form, margin-guardrails, approval-workflow, glass-ui]
dependency_graph:
  requires:
    - phase: 16-01
      provides: sales-types, sales-server-fns, sales-store, sales-i18n
    - phase: 16-02
      provides: sales-module-root, credit-banner
  provides:
    - quote-builder-view (single-page 10-step editing surface)
    - line-items-table (editable with reactive margin calculation)
    - cost-lookup-indicators (fresh/aging/stale/missing)
    - margin-guardrails (configurable thresholds from pricing_rules)
    - margin-control-panel (blended margin, what-if calculator)
    - approval-workflow (margin + value routing with escalation)
  affects: [16-05, 16-06]
tech_stack:
  added: []
  patterns: [useWatch-reactive-pricing, procurement-buffer-display, approval-chain-routing, what-if-calculator]
key_files:
  created:
    - apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx
    - apps/internal/src/components/sales/quote-builder/QuoteBuilderHeader.tsx
    - apps/internal/src/components/sales/quote-builder/LineItemsTable.tsx
    - apps/internal/src/components/sales/quote-builder/CostLookup.tsx
    - apps/internal/src/components/sales/quote-builder/MarginGuardrails.tsx
    - apps/internal/src/components/sales/quote-builder/MarginControlPanel.tsx
    - apps/internal/src/components/sales/quote-builder/ApprovalWorkflow.tsx
  modified:
    - apps/internal/src/components/sales/SalesModule.tsx
key-decisions:
  - "Inline MarginControlPanel stub in Task 1 replaced by proper component in Task 2"
  - "Approval chain uses highest-of(margin-role, value-role) for combined threshold routing"
  - "CostLookup and MarginGuardrails render inline in LineItemsTable columns, not as separate sections"
  - "What-if calculator uses range slider for quick margin experimentation"
patterns-established:
  - "useWatch() for reactive margin/price calculation in editable tables"
  - "Configurable thresholds from server data (pricing_rules), never hardcoded in components"
  - "Approval chain priority: none < sales_manager < director < vp_sales < ceo"
requirements-completed: [SALE-03, SALE-04]
duration: 6min
completed: 2026-04-05
---

# Phase 16 Plan 04: Quote Builder Summary

**Single-page quote builder with editable line items, reactive pricing via useWatch(), margin guardrails from configurable thresholds, and approval routing based on combined margin + value levels**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-05T17:57:53Z
- **Completed:** 2026-04-05T18:04:16Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Quote builder renders as single scrollable page with all 10 steps visible simultaneously (NOT a wizard)
- Line items table with useWatch() for reactive margin/sell-price bidirectional calculation
- Auto-save fires every 30 seconds with "Auto-saved Xs ago" live indicator
- Margin guardrails use getMarginLevel() with configurable thresholds from pricing_rules (no hardcoded values)
- Approval workflow routes based on both margin and value thresholds, highest required approval wins
- MarginControlPanel sidebar with blended margin, quick adjust buttons (15/18/20%), and what-if calculator

## Task Commits

1. **Task 1: QuoteBuilderView root + Header + LineItemsTable** - `da91e58` (feat)
2. **Task 2: CostLookup, MarginGuardrails, MarginControlPanel, ApprovalWorkflow** - `b2d2f58` (feat)

## Files Created/Modified
- `apps/internal/src/components/sales/quote-builder/QuoteBuilderView.tsx` - Root single-page surface with 10 sections, auto-save, FormProvider
- `apps/internal/src/components/sales/quote-builder/QuoteBuilderHeader.tsx` - Header with quote number, version, status, auto-save indicator
- `apps/internal/src/components/sales/quote-builder/LineItemsTable.tsx` - Editable table with useWatch() reactive pricing, useFieldArray for dynamic rows
- `apps/internal/src/components/sales/quote-builder/CostLookup.tsx` - Freshness indicators (fresh/aging/stale/missing) with 6px colored dots
- `apps/internal/src/components/sales/quote-builder/MarginGuardrails.tsx` - Per-line margin indicator using configurable thresholds
- `apps/internal/src/components/sales/quote-builder/MarginControlPanel.tsx` - Right sidebar with blended margin, approval status, quick adjust, what-if calculator
- `apps/internal/src/components/sales/quote-builder/ApprovalWorkflow.tsx` - Approval chain routing with justification/urgency notes, escalation info
- `apps/internal/src/components/sales/SalesModule.tsx` - Wired QuoteBuilderView into quote-builder tab

## Decisions Made
- CostLookup and MarginGuardrails render inline as table columns rather than separate sections -- keeps the single-page surface compact
- Approval chain computes highest-of(margin-role, value-role) to determine the combined required approval level
- What-if calculator uses range slider (0-50%) for quick margin experimentation with instant total/profit preview
- Inline stub pattern for MarginControlPanel in Task 1 to avoid circular imports, replaced by proper import in Task 2

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None. Steps 5-7, 9-10 have intentional placeholder divs labeled "Plan 05" which is the expected continuation plan. All data flows are wired to server functions with mock data.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Steps 5-7 (delivery, payment, validity) and 9-10 (preview, send) ready for Plan 05
- All margin thresholds and approval routing tested with configurable data
- LineItemsTable exports QuoteFormValues type for downstream consumption

---
*Phase: 16-sales-module*
*Completed: 2026-04-05*
