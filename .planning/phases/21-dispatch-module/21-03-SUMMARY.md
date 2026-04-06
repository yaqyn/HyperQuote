---
phase: 21-dispatch-module
plan: "03"
subsystem: dispatch/live-map
tags: [maplibre, gps, realtime, clustering, broadcast]
dependency_graph:
  requires: [21-01b]
  provides: [LiveMapView, VehicleMap, useGPSBroadcast, useClusters, VehiclePopup, DriverSidebar]
  affects: [dispatch-module-tab-wiring]
tech_stack:
  added: []
  patterns: [supabase-realtime-broadcast, supercluster-clustering, maplibre-data-driven-layers, clientonly-map-wrapper]
key_files:
  created:
    - apps/internal/src/hooks/useGPSBroadcast.ts
    - apps/internal/src/hooks/useClusters.ts
    - apps/internal/src/components/dispatch/live-map/VehicleMap.tsx
    - apps/internal/src/components/dispatch/live-map/VehiclePopup.tsx
    - apps/internal/src/components/dispatch/live-map/LiveMapView.tsx
    - apps/internal/src/components/dispatch/live-map/DriverSidebar.tsx
  modified: []
decisions:
  - "GPS broadcast uses null supabase client in dev mode for simulation via setInterval jitter"
  - "VehicleMap uses MapLibre native clustering (Source cluster prop) instead of separate useClusters for simpler integration"
  - "DriverSidebar collapses via CSS transition width 320->0, not Motion (panel, not glass window)"
  - "Route lines bridge last completed stop to first remaining stop for visual continuity"
metrics:
  duration: 4min
  completed: "2026-04-06T08:58:37Z"
  tasks: 2
  files: 6
requirements: [DISP-02]
---

# Phase 21 Plan 03: Live GPS Map Summary

Live GPS tracking map with MapLibre GL, Supabase Realtime Broadcast for position updates, color-coded vehicle pins with zoom-adaptive sizing, native cluster layers, solid/dashed route lines, geofence circles, vehicle popups, and collapsible driver sidebar with hierarchy and search.

## What Was Built

### Task 1: GPS broadcast hook, clusters hook, VehicleMap with pins and route lines
**Commit:** `d3e69ed`

- **useGPSBroadcast** - Supabase Realtime Broadcast subscription on `fleet-gps` channel with throttled state updates (max 1/sec via requestAnimationFrame). Dev simulation mode with random jitter every 3s when no Supabase client provided.
- **useClusters** - Supercluster integration for vehicle pin clustering (radius 60, maxZoom 16). Memoized GeoJSON point creation with ref-based Supercluster instance.
- **VehicleMap** - MapLibre GL map with:
  - Data-driven circle layer: color by status (yellow=loading, green=transit, blue=at_site, red=problem, grey=offline)
  - Zoom-adaptive pin sizing (6px at zoom 8, 12px at zoom 14) with white stroke
  - Native cluster circles with count labels
  - Route lines per driver: solid for completed segments, dashed (line-dasharray: [2, 2]) for remaining
  - Geofence circles (200m radius) around delivery sites
  - Click cluster to expand, click pin to show popup
  - Highlighted route support for sidebar interaction
- **VehiclePopup** - Driver name, status badge, speed/heading (Geist Mono), route progress (X/Y stops), next stop ETA, Call/Message/Details action buttons.

### Task 2: LiveMapView with collapsible sidebar and driver hierarchy
**Commit:** `cd4f7e0`

- **LiveMapView** - Full-height layout with collapsible sidebar + flex-1 map. Loads initial data from getDriverLocations + getDispatchBoard. ClientOnly wraps VehicleMap with MapSkeleton fallback. Sidebar toggle with PanelLeftClose/PanelLeftOpen icons. Driver click zooms map and shows popup.
- **DriverSidebar** - 320px collapsible panel with CSS transition. Hierarchical tree: Internal > Contracted > On-Demand driver groups. Each row shows status dot (colored), stop count (Geist Mono), next ETA. Quick filter buttons: All/Problems/Arriving Soon/Completed. React Aria SearchField for driver name or order ID search. Unassigned tasks section with React Aria DnD (drag type 'dispatch-task'). Selected driver highlighted with blue border.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Route line continuity bridge**
- **Found during:** Task 1
- **Issue:** Completed and remaining route segments would have a visual gap
- **Fix:** Bridge last completed stop as first point of remaining segment
- **Files modified:** VehicleMap.tsx

**2. [Rule 3 - Blocking] MapLibre native clustering vs useClusters**
- **Found during:** Task 1
- **Issue:** Using both useClusters hook AND MapLibre Source `cluster` prop would double-cluster. The Source cluster prop is simpler and handles interaction (getClusterExpansionZoom) natively.
- **Fix:** Used MapLibre native clustering via Source `cluster` prop. useClusters hook still exported for use cases needing custom cluster logic outside the map.
- **Files modified:** VehicleMap.tsx

## Verification

- [x] fleet-gps broadcast channel in useGPSBroadcast
- [x] removeChannel cleanup in useGPSBroadcast
- [x] Supercluster in useClusters
- [x] circle-color data-driven styling in VehicleMap
- [x] line-dasharray for dashed route lines in VehicleMap
- [x] react-map-gl/maplibre import in VehicleMap
- [x] VITE_MAPTILER_KEY fallback in VehicleMap
- [x] ClientOnly wraps map in LiveMapView
- [x] SearchField in DriverSidebar
- [x] PanelLeft icons in LiveMapView
- [x] DispatchModule.tsx NOT modified

## Known Stubs

None. All components are fully wired with mock data from server functions. GPS simulation runs in dev mode when Supabase client is null.
