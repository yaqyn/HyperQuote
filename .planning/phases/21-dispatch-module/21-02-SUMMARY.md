---
phase: 21-dispatch-module
plan: "02"
subsystem: dispatch
tags: [route-planning, dnd, maplibre, constraints, vrp]
dependency_graph:
  requires: [21-01a, 21-01b]
  provides: [route-planning-view, route-dnd, route-map, optimize-button, publish-button]
  affects: [21-05]
tech_stack:
  added: []
  patterns: [react-aria-dnd-gridlist, maplibre-route-lines, split-pane-resize, constraint-validation]
key_files:
  created:
    - apps/internal/src/components/dispatch/route-planning/RoutePlanningView.tsx
    - apps/internal/src/components/dispatch/route-planning/RouteList.tsx
    - apps/internal/src/components/dispatch/route-planning/RouteCard.tsx
    - apps/internal/src/components/dispatch/route-planning/StopItem.tsx
    - apps/internal/src/components/dispatch/route-planning/UnassignedPool.tsx
    - apps/internal/src/components/dispatch/route-planning/SplitPane.tsx
    - apps/internal/src/components/dispatch/route-planning/RoutePlanningMap.tsx
    - apps/internal/src/components/dispatch/route-planning/OptimizeButton.tsx
    - apps/internal/src/components/dispatch/route-planning/PublishButton.tsx
  modified: []
decisions:
  - "Pure CSS resize handle for SplitPane (no library dependency, RTL-aware via getComputedStyle)"
  - "React Aria useDragAndDrop with GridList for all DnD (route-stop drag type shared across RouteCard and UnassignedPool)"
  - "6-color palette for map route lines (blue, green, orange, purple, teal, pink)"
  - "OptimizeButton uses DialogTrigger with isOpen state for programmatic open after async result"
  - "PublishButton uses alertdialog role for confirmation pattern"
metrics:
  duration: 5min
  completed: "2026-04-06T08:59:Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 0
---

# Phase 21 Plan 02: Route Planning View Summary

Route planning split-pane with React Aria DnD stops, MapLibre color-coded route lines, VRP optimization before/after comparison, and publish routes with confirmation dialog.

## What Was Built

### Task 1: Split pane, route list with DnD stops, constraint badges
- **SplitPane.tsx**: Resizable split pane (300-600px) with pure CSS drag handle, RTL-aware via `getComputedStyle` direction check
- **RoutePlanningView.tsx**: Root view with date picker, OptimizeButton, PublishButton in top bar; SplitPane with RouteList left and RoutePlanningMap (ClientOnly + MapSkeleton fallback) right; loads data from getDispatchBoard/getDriverList server functions
- **RouteList.tsx**: Left panel combining UnassignedPool at top with per-driver RouteCards below
- **RouteCard.tsx**: React Aria `useDragAndDrop` with `GridList` accepting `route-stop` drag type; `onReorder` for within-route resequencing, `onInsert` for cross-route transfer, `onRootDrop` for unassigned pool drops; CapacityBar and validateAllConstraints per stop
- **StopItem.tsx**: Draggable stop with GripVertical handle, sequence number (Geist Mono), customer name, address, weight+time window (Geist Mono), equipment badge, ConstraintBadge list, red border for error-severity violations
- **UnassignedPool.tsx**: Glass card with count badge, React Aria DnD GridList with `route-stop` drag type for compatibility with RouteCard drop targets

### Task 2: Route planning map, optimize button, publish button
- **RoutePlanningMap.tsx**: MapLibre GL via react-map-gl/maplibre; GeoJSON Source+Layer per route with 6-color palette; numbered stop pins (Geist Mono) with selected route highlighted/enlarged; unassigned stops as grey dots; MapTiler key fallback to OSM demo tiles
- **OptimizeButton.tsx**: Blue button with Sparkles icon; calls optimizeRoute server function; shows comparison dialog with before/after distance, duration, savings percentage (Geist Mono); Apply/Cancel actions
- **PublishButton.tsx**: Green-accent button with Send icon; confirmation alertdialog showing route count and driver count; calls publishRoutes server function; disabled when no publishable routes

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all components wire to existing server functions from Plan 01b. Vehicle data is derived from route data in mock mode (production will have dedicated vehicle fetch).

## Self-Check: PASSED

All 9 created files verified on disk. Both commit hashes (3a0d725, a84d568) verified in git log.
