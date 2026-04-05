---
phase: 16-sales-module
plan: "02"
subsystem: sales
tags: [sales-module, tab-strip, shared-components, glass-window, react-aria]
dependency_graph:
  requires: [sales-types, sales-store, sales-i18n]
  provides: [sales-module-root, sales-tab-strip, tier-badge, age-timer, sla-countdown, credit-banner]
  affects: [16-03, 16-04, 16-05, 16-06, 16-07, 16-08, 16-09]
tech_stack:
  added: []
  patterns: [lazy-import-module, react-aria-tabs, business-hours-calculation, intl-number-format]
key_files:
  created:
    - apps/internal/src/components/sales/SalesModule.tsx
    - apps/internal/src/components/sales/SalesTabStrip.tsx
    - apps/internal/src/components/sales/shared/TierBadge.tsx
    - apps/internal/src/components/sales/shared/AgeTimer.tsx
    - apps/internal/src/components/sales/shared/SLACountdown.tsx
    - apps/internal/src/components/sales/shared/CreditStatusBanner.tsx
  modified:
    - apps/internal/src/components/shell/ModuleWindow.tsx
decisions:
  - "Lazy-load SalesModule via React.lazy with Suspense spinner fallback"
  - "React Aria Tabs without TabPanel -- content managed via Zustand store activeTab"
  - "SLA business hours skip Fri-Sat (Egyptian weekend), configurable start/end hours"
  - "AgeTimer uses raw elapsed time (not business hours) per plan spec"
metrics:
  duration: 3min
  completed: "2026-04-05"
---

# Phase 16 Plan 02: Sales Module Wiring + Shared Components Summary

**Sales module wired into glass window with 8-tab React Aria strip and 4 shared components (TierBadge, AgeTimer, SLACountdown, CreditStatusBanner)**

## What Was Built

### Task 1: SalesModule + TabStrip Wiring
- **ModuleWindow.tsx**: Conditional render -- `moduleId === 'sales'` lazy-loads `SalesModule`, all other modules keep the "Coming Soon" placeholder.
- **SalesModule.tsx**: Root component reading `activeTab` from `useSalesStore`. Renders `SalesTabStrip` + tab content placeholders. Includes `negotiatingQuoteId` state for future negotiation view navigation.
- **SalesTabStrip.tsx**: React Aria `Tabs`/`TabList`/`Tab` (no TabPanel -- content managed externally). 8 tabs with i18n labels, blue underline on selected, keyboard accessible.

### Task 2: Shared Sales Components
- **TierBadge.tsx**: Pill badge for customer tier (A=blue, B=neutral, C=light, new=dashed). Three-color compliant. Geist Mono for tier letter.
- **AgeTimer.tsx**: Real-time `setInterval(1000)` elapsed timer. Color transitions: green (<2h) -> yellow (2-4h) -> orange (4-8h) -> red (>8h) -> pulsing red (>24h). Geist Mono tabular-nums.
- **SLACountdown.tsx**: Business-hours countdown with `calculateBusinessTimeRemaining()` that skips Fri-Sat (Egyptian weekend). Configurable business start/end hours. Color ratio based on tier SLA hours.
- **CreditStatusBanner.tsx**: `Intl.NumberFormat` with `ar-EG` locale for Arabic context. Yellow bg when available < 30% of limit, red when <= 0. React Aria Button for credit limit increase request.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 10ef908 | feat(16-02): wire SalesModule into ModuleWindow with tab strip |
| 2 | e77bb30 | feat(16-02): add shared sales components |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all placeholders are intentional "Coming Soon" tab content that subsequent plans (03-09) replace.

## Self-Check: PASSED
