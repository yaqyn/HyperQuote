---
phase: 20-finance-module
plan: 03
subsystem: finance-ar
tags: [ar, aging, kpi, drill-down, filters, sparklines]
dependency_graph:
  requires: [20-01]
  provides: [ARDashboard, ARKPIStrip, ARAgingTable, ARDrillDown, ARFilters]
  affects: [FinanceModule]
tech_stack:
  added: []
  patterns: [aging-color-coding, drill-down-navigation, filter-pills, sparkline-inline-svg]
key_files:
  created:
    - apps/internal/src/components/finance/ar/ARKPIStrip.tsx
    - apps/internal/src/components/finance/ar/ARAgingTable.tsx
    - apps/internal/src/components/finance/ar/ARDashboard.tsx
    - apps/internal/src/components/finance/ar/ARDrillDown.tsx
    - apps/internal/src/components/finance/ar/ARFilters.tsx
  modified:
    - apps/internal/src/components/finance/FinanceModule.tsx
decisions:
  - ARDrillDown navigates to invoicing tab via store (setSelectedInvoiceId + setActiveTab) for cross-tab drill-down
  - Mock data inline in ARDashboard; server function integration deferred to when Supabase is connected
metrics:
  duration: 5min
  completed: 2026-04-06
---

# Phase 20 Plan 03: AR Aging View Summary

AR aging view with KPI strip, color-coded aging table with sparklines, cell-click drill-down to filtered invoices, and comprehensive filtering with removable pills and saved views.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AR KPI strip and aging table with sparklines | fa92abe | ARKPIStrip.tsx, ARAgingTable.tsx, ARDashboard.tsx, FinanceModule.tsx |
| 2 | AR drill-down and filters | ef3b9ea | ARDrillDown.tsx, ARFilters.tsx, ARDashboard.tsx |

## What Was Built

### ARKPIStrip
- 5 glass panel KPI cards: Total Outstanding, DSO (with trend arrow vs prior period), CEI%, Overdue Amount (red-highlighted when above threshold), Collections (with % of target)
- All amounts via CurrencyCell (Geist Mono), clickable cards to filter table
- Trend arrows: green for improving, red for worsening

### ARAgingTable
- Columns: Customer Name | Current | 1-30 | 31-60 | 61-90 | 90+ | Total | Trend Sparkline
- All amounts right-aligned in Geist Mono via CurrencyCell
- Cell color coding: current=green-50, 1-30=yellow-50, 31-60=orange-50, 61-90=red-50, 90+=red-100+bold
- Row backgrounds shift based on worst aging bucket (pale-yellow for 31-60, pale-red for 61+)
- Column header row shows aggregate totals per bucket
- SparklineSVG in last column for 6-month aging trend
- Each amount cell clickable for drill-down
- Sortable columns (customer name, total) with pagination (20/page)

### ARDashboard
- Container combining KPI strip + filters + aging table
- Drill-down state management: cell click shows ARDrillDown, back button returns to table
- Breadcrumb navigation: "AR Dashboard > [Bucket] > [Customer Name]"

### ARDrillDown
- Filtered invoice list per customer+bucket
- Invoice rows: Invoice #, Amount, Issue Date, Due Date, Days Overdue, Status, Communications
- Dispute status badge on invoices with active disputes
- Click invoice -> navigates to invoicing tab (sets selectedInvoiceId in store)
- Communication log summary per invoice (last/next reminder)

### ARFilters
- Filter by: customer tier, sales rep, date range, amount range
- Group by: customer/region/salesperson (radio buttons)
- Sort by: total outstanding/oldest invoice/highest risk
- Active filters shown as removable pills with clear-all
- Save/load named filter views
- Reads/writes arFilters from useFinanceStore

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all components render with mock data that demonstrates full functionality. Mock data is inline in ARDashboard and ARDrillDown, consistent with existing patterns in the finance module (finance-ar.ts server function also uses mock data).

## Self-Check: PASSED
