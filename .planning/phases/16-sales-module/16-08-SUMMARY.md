---
phase: 16-sales-module
plan: "08"
subsystem: sales-pipeline
tags: [pipeline, kanban, dnd, react-aria, funnel]
dependency_graph:
  requires: [16-01, 16-02]
  provides: [pipeline-kanban, pipeline-list, pipeline-funnel, stage-advance]
  affects: [sales-module]
tech_stack:
  added: []
  patterns: [react-aria-dnd, tanstack-table-sort-filter, css-funnel, optimistic-cache-update]
key_files:
  created:
    - apps/internal/src/components/sales/pipeline/PipelineView.tsx
    - apps/internal/src/components/sales/pipeline/KanbanBoard.tsx
    - apps/internal/src/components/sales/pipeline/KanbanColumn.tsx
    - apps/internal/src/components/sales/pipeline/KanbanCard.tsx
    - apps/internal/src/components/sales/pipeline/StageAdvancePanel.tsx
    - apps/internal/src/components/sales/pipeline/PipelineSummaryBar.tsx
    - apps/internal/src/components/sales/pipeline/PipelineListView.tsx
    - apps/internal/src/components/sales/pipeline/PipelineFunnel.tsx
  modified:
    - apps/internal/src/components/sales/SalesModule.tsx
decisions:
  - React Aria GridList + useDragAndDrop for kanban DnD (no external DnD library)
  - Optimistic cache update for deal stage moves via queryClient.setQueryData
  - CSS-based funnel chart with proportional bar widths (no chart library)
  - Confirmation dialogs use manual div overlay with Escape stopPropagation for isKeyboardDismissDisabled behavior
metrics:
  duration: 6min
  completed: "2026-04-05T18:28:Z"
---

# Phase 16 Plan 08: Pipeline/Kanban View Summary

Pipeline kanban board with 9 stages, click-to-advance via side panel, React Aria DnD for power users, plus list and funnel alternative views with summary metrics bar.

## What Was Built

### Task 1: Kanban Board + Click-to-Advance + Summary Bar
- **PipelineView.tsx**: Root view with view toggles (Kanban/List/Funnel), scope toggle (My/Team), filters (customer search, value range, age range), active filter pills, save filter set
- **KanbanBoard.tsx**: 9-column horizontal scroll board querying getSalesPipeline with pipelineFilters. Optimistic cache updates on deal moves
- **KanbanColumn.tsx**: React Aria GridList with useDragAndDrop, acceptedDragTypes: ['deal']. Confirmation dialog for Won/Lost critical transitions with Escape stopPropagation
- **KanbanCard.tsx**: Customer name + TierBadge, deal value (Geist Mono), status text, days in stage with green/yellow/red coloring, win probability, rep avatar initials, left border color by deal health
- **StageAdvancePanel.tsx**: Side panel with full deal details, [Advance to Next Stage] as primary action, stage-specific validation, Convert to Order dialog for Won, Loss Reason dialog for Lost
- **PipelineSummaryBar.tsx**: Total pipeline, weighted forecast, target, gap (green/red). Collapsible analytics with conversion rates and avg time per stage
- **SalesModule.tsx**: Replaced pipeline placeholder with PipelineView

### Task 2: List View + Funnel Chart
- **PipelineListView.tsx**: TanStack Table with getSortedRowModel + getFilteredRowModel. Columns: Stage (pill), Customer + TierBadge, Deal Value, Win %, Days, Rep, Status, Actions. Row click opens StageAdvancePanel
- **PipelineFunnel.tsx**: CSS-based funnel with proportional bar widths per stage. Color gradient from neutral to blue. Conversion rate percentages between stages. Lost/Expired shown separately below

## Commits

| # | Hash | Message | Files |
|---|------|---------|-------|
| 1 | f37cc64 | feat(16-08): pipeline kanban board with 9 columns, click-to-advance, and DnD | 9 files |
| 2 | 67d54ac | feat(16-08): pipeline list view and funnel chart | 2 files |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. All components are wired to getSalesPipeline server function which returns mock data when Supabase is not configured.

## Self-Check: PASSED
