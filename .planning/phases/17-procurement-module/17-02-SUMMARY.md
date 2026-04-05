---
phase: 17-procurement-module
plan: 02
subsystem: ui
tags: [procurement, react-aria, inquiry-builder, response-tracker, glass-window, i18n]

requires:
  - phase: 17-procurement-module
    plan: 01
    provides: Procurement types, server functions, Zustand store
provides:
  - ProcurementModule shell with 6-tab navigation registered in ModuleWindow
  - InquiryBuilder (PROC-01) with multi-supplier selection and template system
  - ResponseTracker (PROC-02) with 4-color status indicators and bulk remind
  - FreshnessIndicator and DeadlineCountdown shared components
  - Full EN + AR i18n keys for procurement namespace
affects: [17-03, 17-04, 17-05, procurement-ui]

tech-stack:
  added: []
  patterns: [procurement-module-shell, inquiry-builder-form, response-tracking-table, supplier-combobox-selector]

key-files:
  created:
    - apps/internal/src/components/procurement/ProcurementModule.tsx
    - apps/internal/src/components/procurement/ProcurementTabStrip.tsx
    - apps/internal/src/components/procurement/ProcurementShortcuts.tsx
    - apps/internal/src/components/procurement/home/ProcurementHomeView.tsx
    - apps/internal/src/components/procurement/inquiry/InquiryBuilder.tsx
    - apps/internal/src/components/procurement/inquiry/SupplierSelector.tsx
    - apps/internal/src/components/procurement/inquiry/InquiryTemplateSelector.tsx
    - apps/internal/src/components/procurement/inquiry/ResponseTracker.tsx
    - apps/internal/src/components/procurement/inquiry/ResponseStatusBadge.tsx
    - apps/internal/src/components/procurement/shared/FreshnessIndicator.tsx
    - apps/internal/src/components/procurement/shared/DeadlineCountdown.tsx
  modified:
    - apps/internal/src/components/shell/ModuleWindow.tsx
    - apps/internal/src/locales/en/internal.json
    - apps/internal/src/locales/ar/internal.json

key-decisions:
  - "ProcurementModule renders ResponseTracker inline when selectedInquiryId is set, matching SalesModule negotiation pattern"
  - "SupplierSelector sorts by overallScore descending for score-ranked suggestions per CONTEXT.md"
  - "InquiryBuilder uses isKeyboardDismissDisabled on confirmation Dialog per threat model"
  - "DeadlineCountdown updates every 60s (not 1s like AgeTimer) since deadlines are hours/days away"

patterns-established:
  - "Procurement tab routing via Zustand activeTab mirroring SalesModule pattern"
  - "G-prefix hotkey sequence with 1s auto-clear timeout for multi-key shortcuts"
  - "React Aria ComboBox for supplier search with checkbox selection in ListBoxItems"
  - "Template-based message auto-population via getTemplateMessage helper"

requirements-completed: [PROC-01, PROC-02]

duration: 5min
completed: 2026-04-05
---

# Phase 17 Plan 02: Procurement UI Shell & Inquiry Components Summary

**Procurement module shell with 6-tab navigation, inquiry builder with multi-supplier ComboBox selection, response tracker with 4-color status badges and bulk remind, all wired into ModuleWindow**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-05T20:34:25Z
- **Completed:** 2026-04-05T20:39:49Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- ProcurementModule registered in ModuleWindow via React.lazy with Suspense
- 6-tab navigation (Home, Supplier Inquiries, Price Comparison, PO Management, Supplier Directory, Supplier Scorecard)
- Keyboard shortcuts: N (new inquiry), G+I/G+P/G+S (navigation), / (search), ? (help overlay)
- ProcurementHomeView with 4 glass summary cards linked to tab navigation
- InquiryBuilder: RHF with useWatch(), per-item supplier selection, 5 message templates, confirmation dialog with isKeyboardDismissDisabled
- SupplierSelector: React Aria ComboBox with score-ranked suggestions, on-time %, tier badges, freshness indicators
- ResponseTracker: table with gray/blue/green/red status badges, per-row remind, bulk remind all non-responders
- FreshnessIndicator (fresh/aging/stale/suppressed) and DeadlineCountdown (green/yellow/red color thresholds) shared components
- Full EN + AR i18n keys for all procurement UI strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Module shell, tab strip, shortcuts, ModuleWindow registration** - `4b4566d` (feat)
2. **Task 2: Home view, inquiry builder, response tracker, shared components, i18n** - `7a105a0` (feat)

## Files Created/Modified
- `apps/internal/src/components/procurement/ProcurementModule.tsx` - Top-level module shell with 6-tab routing
- `apps/internal/src/components/procurement/ProcurementTabStrip.tsx` - React Aria Tabs with i18n labels
- `apps/internal/src/components/procurement/ProcurementShortcuts.tsx` - G-prefix hotkey sequences
- `apps/internal/src/components/procurement/home/ProcurementHomeView.tsx` - 4 glass summary cards with TanStack Query
- `apps/internal/src/components/procurement/inquiry/InquiryBuilder.tsx` - Multi-supplier inquiry form (PROC-01)
- `apps/internal/src/components/procurement/inquiry/SupplierSelector.tsx` - ComboBox with score-ranked suggestions
- `apps/internal/src/components/procurement/inquiry/InquiryTemplateSelector.tsx` - React Aria Select with 5 templates
- `apps/internal/src/components/procurement/inquiry/ResponseTracker.tsx` - Status tracking table (PROC-02)
- `apps/internal/src/components/procurement/inquiry/ResponseStatusBadge.tsx` - 4-color pill badges
- `apps/internal/src/components/procurement/shared/FreshnessIndicator.tsx` - Stock freshness dots
- `apps/internal/src/components/procurement/shared/DeadlineCountdown.tsx` - Countdown with color thresholds
- `apps/internal/src/components/shell/ModuleWindow.tsx` - Added procurement lazy import + render case
- `apps/internal/src/locales/en/internal.json` - 70+ procurement EN keys
- `apps/internal/src/locales/ar/internal.json` - 70+ procurement AR keys

## Decisions Made
- ProcurementModule renders ResponseTracker inline when selectedInquiryId is set (matches SalesModule negotiation view pattern)
- SupplierSelector sorts by overallScore descending for score-ranked suggestions per CONTEXT.md spec
- InquiryBuilder uses isKeyboardDismissDisabled on confirmation Dialog per threat model ASVS L1
- DeadlineCountdown uses 60s interval (not 1s) since procurement deadlines are hours/days away

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all components render with live data from Plan 01 server functions. Send buttons for Email/Portal/WhatsApp are present but disabled (sending deferred to Phase 27 per plan spec). Comparison/PO Management/Directory/Scorecard tabs render placeholders (Plans 03-05 will implement).

## Self-Check: PASSED

---
*Phase: 17-procurement-module*
*Completed: 2026-04-05*
