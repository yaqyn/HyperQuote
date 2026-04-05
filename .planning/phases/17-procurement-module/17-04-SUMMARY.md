---
phase: 17-procurement-module
plan: 04
subsystem: procurement-po-management
tags: [po-management, three-way-match, status-flow, tdd]
dependency_graph:
  requires: [17-01]
  provides: [po-list-view, po-detail-view, po-status-pipeline, three-way-match-display]
  affects: [procurement-module]
tech_stack:
  added: []
  patterns: [tanstack-table, tanstack-query, react-aria-dialog, tdd]
key_files:
  created:
    - apps/internal/src/components/procurement/po/POList.tsx
    - apps/internal/src/components/procurement/po/PODetail.tsx
    - apps/internal/src/components/procurement/po/POStatusFlow.tsx
    - apps/internal/src/components/procurement/po/ThreeWayMatch.tsx
    - apps/internal/src/components/procurement/po/PODocuments.tsx
  modified:
    - apps/internal/src/__tests__/po-management.test.ts
decisions:
  - "VAT formula Math.round(subtotal * 14) / 100 produces decimals for non-round amounts (e.g., 7777 -> 1088.78), not integers as plan assumed"
metrics:
  duration: 6min
  completed: 2026-04-05
---

# Phase 17 Plan 04: PO Management Views Summary

PO list table with TanStack Table, detail view with all sections (line items, delivery tracking, three-way match, documents, activity log), 9-step status pipeline with terminal state badges, and read-only three-way match display with tolerance indicators.

## What Was Built

### Test Suite (TDD RED)
- 17 tests covering PO status flow (happy path, terminal states, valid/invalid transitions), three-way match (matched/partial/mismatch/pending/overall), VAT calculation, and coded delivery reference format
- All tests use exported functions from `types/procurement.ts` (HAPPY_PATH_STATUSES, isValidTransition, computeMatchStatus, computeOverallMatch)

### POList.tsx (316 lines)
- TanStack Table with columns: PO number, supplier, value, status, items count, expected delivery
- Filter tabs: All / Draft / Active / Completed
- Status badges with color coding per status
- J/K keyboard navigation, pagination support
- All numbers in Geist Mono with tabular-nums

### PODetail.tsx (366 lines)
- Header: PO number (Geist Mono), supplier name, coded delivery reference (never customer name), status badge
- POStatusFlow visual pipeline
- Line items table with quantity, unit cost, received, rejected, line total
- Delivery tracking section with expected date and coded reference
- ThreeWayMatch component
- PODocuments section
- Activity log with timestamps in Geist Mono
- Totals: subtotal, VAT (14%), total
- Action buttons: Send to Supplier / Cancel PO with confirmation dialogs (isKeyboardDismissDisabled)

### POStatusFlow.tsx (92 lines)
- 9-step horizontal pipeline: Draft through Closed
- Current step blue (#2563EB), completed steps filled with checkmarks, future steps outlined
- Terminal states (rejected/cancelled) shown as red badge below pipeline

### ThreeWayMatch.tsx (109 lines)
- Read-only 3-column comparison: PO vs Receipt, PO vs Invoice, Receipt vs Invoice
- Green checkmark (matched), yellow warning (partial_match), red X (mismatch), gray clock (pending)
- Variance percentages in Geist Mono
- Tolerance thresholds displayed: Price 0-5%, Qty 0-2%, Tax 0%
- Overall match status badge

### PODocuments.tsx (92 lines)
- Document types: PO PDF, Supplier Confirmation, BOL, Supplier Invoice, Inspection Reports
- Status badges: Available / Pending / Not Required
- View/Download buttons (mock, Phase 28)
- Upload dropzone for supplier confirmation (mock)

## Decisions Made

1. **VAT decimal precision**: `Math.round(subtotal * 14) / 100` yields decimals for non-round subtotals (7777 -> 1088.78). Test expectation adjusted from plan's assumption of integer output. The formula is correct per RESEARCH.md Pitfall 4.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed VAT test expectations**
- **Found during:** Task 1 (TDD RED)
- **Issue:** Plan stated `Math.round(7777 * 14) / 100 = 1088` but actual result is 1088.78
- **Fix:** Corrected test expectations to match actual formula output
- **Files modified:** `apps/internal/src/__tests__/po-management.test.ts`
- **Commit:** fe351e0

## Known Stubs

None. All components are wired to server functions via TanStack Query. PODocuments actions are intentionally mock (Phase 28 handles PDF generation).

## Verification

- 17/17 tests passing
- `codedDeliveryReference` used in PODetail (never customer name)
- `isKeyboardDismissDisabled` on confirmation dialogs
- All financial values use Geist Mono
- Three-way match is read-only display

## Self-Check: PASSED
