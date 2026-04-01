---
phase: 11-portal-orders-delivery-remaining-windows
plan: 01
subsystem: portal-orders
tags: [portal, orders, saved-lists, reorder, filter-chips]
dependency_graph:
  requires: []
  provides: [order-types, order-server-functions, order-card, filter-chips, reorder-dialog, saved-list-card]
  affects: [portal-orders-window]
tech_stack:
  added: []
  patterns: [useQuery-per-tab, DatePicker-date-range-filter, ToggleButton-filter-chips, saved-lists-in-drafts]
key_files:
  created:
    - apps/portal/src/types/order.ts
    - apps/portal/src/lib/server/orders.ts
    - apps/portal/src/components/orders/OrderCard.tsx
    - apps/portal/src/components/orders/FilterChips.tsx
    - apps/portal/src/components/orders/ReorderDialog.tsx
    - apps/portal/src/components/orders/SavedListCard.tsx
  modified:
    - apps/portal/src/routes/_portal/orders.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json
decisions:
  - ReorderDialog uses toast from lib/toast (imperative Zustand store), not a separate toastStore
metrics:
  duration: 5min
  completed: 2026-04-01
---

# Phase 11 Plan 01: Orders Window Data-Driven Tabs + Saved Lists Summary

Orders window upgraded from placeholder tabs to 4 data-driven tabs with OrderCard, FilterChips, DatePicker range filter, ReorderDialog (Quick Submit/Edit First), and SavedListCard in Drafts tab for PORT-14.

## What Was Built

### Task 1: Order types, server functions, and components (03c12d3)
- **types/order.ts**: OrderStatus union (11 states), Order interface, OrderFilters, QuoteFilters, SavedList/SavedListItem interfaces
- **lib/server/orders.ts**: 7 server functions (getCustomerOrders, getCustomerQuotes, getCustomerOrderHistory, submitReorder, getSavedLists, createSavedList, deleteSavedList) with isSupabaseConfigured check and dev mock data
- **OrderCard.tsx**: Pressable card with font-mono reference (var(--color-primary)), StatusBadge, item count, description, date, amount (EGP formatted), ChevronRight with rtl:rotate-180
- **FilterChips.tsx**: React Aria ToggleButton group with All/Pending/Ready/Negotiating/Expired, active chip blue bg
- **ReorderDialog.tsx**: GlassElevated modal with isKeyboardDismissDisabled, Quick Submit + Edit First buttons, submitReorder mutation with toast
- **SavedListCard.tsx**: Card with font-mono item count and last used date, Reorder button, Edit link, Trash2 delete with confirmation
- **i18n**: 47 orders namespace keys added to both en/portal.json and ar/portal.json

### Task 2: Upgrade orders.tsx with real data (920b405)
- Active tab: useQuery for getCustomerOrders, OrderCard rendering, SkeletonCards loading (4 cards with animate-pulse), ErrorState with AlertTriangle + Retry button, empty state with Package icon + New Quote Request CTA
- Quotes tab: FilterChips at top, useQuery with filter parameter, OrderCard rendering, empty state
- History tab: Two DatePicker components for date range (default last 90 days), Reorder button on delivered orders, ReorderDialog integration
- Drafts tab: Quote drafts section + Saved Lists sub-section (PORT-14) with SavedListCard, deleteSavedList mutation, ReorderDialog for saved lists
- Tab count badges in font-mono (Geist Mono) for Active, Quotes, Drafts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed toast import path in ReorderDialog**
- **Found during:** Task 2
- **Issue:** ReorderDialog imported from non-existent `../../stores/toastStore`
- **Fix:** Changed import to `../../lib/toast` which is the existing imperative toast store
- **Files modified:** apps/portal/src/components/orders/ReorderDialog.tsx
- **Commit:** 920b405

## Known Stubs

None. All components wire to server functions with dev mock data. No placeholder text or empty data sources.

## Decisions Made

1. Used `toast` from `lib/toast` (existing imperative Zustand store) rather than creating a separate `toastStore` -- consistent with QuoteDetail pattern.

## Self-Check: PASSED

All 6 created files verified on disk. Both commit hashes (03c12d3, 920b405) found in git log.
