---
phase: 16-sales-module
plan: "09"
subsystem: internal-platform
tags: [sales, home, activity-feed, calendar, contacts, reports, shortcuts, realtime]
dependency_graph:
  requires: [16-01, 16-02, 16-03]
  provides: [SALE-10]
  affects: [sales-module]
tech_stack:
  added: []
  patterns: [supabase-realtime-subscription, css-bar-charts, client-side-csv-export, g-prefix-shortcuts]
key_files:
  created:
    - apps/internal/src/components/sales/home/SalesHomeView.tsx
    - apps/internal/src/components/sales/home/UrgentSection.tsx
    - apps/internal/src/components/sales/home/PipelineSnapshot.tsx
    - apps/internal/src/components/sales/home/SalesActivityFeed.tsx
    - apps/internal/src/components/sales/calendar/SalesCalendar.tsx
    - apps/internal/src/components/sales/contacts/SalesContacts.tsx
    - apps/internal/src/components/sales/reports/SalesReports.tsx
    - apps/internal/src/components/sales/SalesShortcuts.tsx
  modified:
    - apps/internal/src/components/sales/SalesModule.tsx
decisions:
  - "Supabase Realtime with dynamic import -- falls back to 30s polling when Supabase not configured"
  - "CSS-based charts (bar, stacked bar, funnel) -- no chart library dependency"
  - "Client-side CSV generation with Blob download -- no server-side file creation"
  - "G-prefix shortcut pattern using setTimeout(1s) for two-key sequences (G+I, G+P, G+C)"
  - "Fuzzy search uses simple substring + word-start matching as fuse.js fallback"
metrics:
  duration: 6min
  completed: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 8
  files_modified: 1
requirements: [SALE-10]
---

# Phase 16 Plan 09: Sales Home, Calendar, Contacts, Reports, and Shortcuts Summary

Sales Home dashboard with urgent items, pipeline snapshot, and real-time activity feed; Calendar with 5 color-coded event types across week/day/month views; Contacts directory with fuzzy search and expandable rows; Reports with revenue/margin/pipeline/conversion/forecast and CSV export; keyboard shortcuts with G-prefix sequences.

## What Was Built

### Task 1: Sales Home View (1718ecd)
- **SalesHomeView** -- vertical stack of UrgentSection, PipelineSnapshot, SalesActivityFeed
- **UrgentSection** -- 3 urgent cards (unassigned RFQs, expiring quotes, overdue follow-ups) with red border when count > 0, Geist Mono counts, click navigates to filtered view
- **PipelineSnapshot** -- total pipeline value, weighted forecast, active deal count, mini funnel bar per stage, all Geist Mono, click navigates to Pipeline tab
- **SalesActivityFeed** -- fetches via getActivityFeed, 6 filter tabs (All/RFQs/Quotes/Orders/Payments/Comms), type-specific icons, relative timestamps, action buttons, "Load more" pagination, Supabase Realtime subscription via postgres_changes with 30s polling fallback

### Task 2: Calendar, Contacts, Reports, Shortcuts (290852a)
- **SalesCalendar** -- week/day/month view toggle (React Aria ToggleButton), 5 color-coded event types (blue=customer meetings, green=site visits, orange=quote deadlines, red=overdue follow-ups, purple=internal meetings), grid-based layout, Add Event button, click event navigates to linked entity
- **SalesContacts** -- React Aria Table with name/company/role/email/phone/last-contact columns, fuzzy search bar, expandable rows showing relationship strength/deal role/credit/address, Add Contact button
- **SalesReports** -- period filter (week/month/quarter/year), summary cards (revenue/orders/avg order), revenue by product bar chart, margin by customer table, pipeline by stage stacked bar, conversion funnel, forecast section, Export CSV (client-side Blob download), Email Report placeholder
- **SalesShortcuts** -- N (new quote), G+I (RFQ inbox), G+P (pipeline), G+C (customer 360), / (focus search), ? (help overlay), only active when sales module open and keyboard scope is panel
- **SalesModule** -- all 8 tabs now wired to functional components, no placeholders remain

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all components render real mock data from server functions. Email Report button is intentionally deferred to Phase 28 per plan specification.

## Self-Check: PASSED
