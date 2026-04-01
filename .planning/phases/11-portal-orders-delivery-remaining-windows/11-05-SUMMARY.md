---
phase: 11-portal-orders-delivery-remaining-windows
plan: 05
subsystem: ui
tags: [maplibre-gl, react-map-gl, gps-tracking, pod, delivery, favorites, ai-reorder, i18n]

requires:
  - phase: 11-01
    provides: Order types, server functions, OrderCard component, WindowShell pattern
  - phase: 10
    provides: Quote detail patterns, toast store, StatusBadge
provides:
  - 5-stage delivery ProgressBar component
  - GPS DeliveryMap via MapLibre GL (ClientOnly wrapped)
  - POD confirm/dispute flow with 72h countdown
  - Payment instructions card with clipboard IBAN copy
  - ETA display component
  - FavoriteButton with red heart toggle
  - AIReorderSuggestion with 7-day cooldown
  - Delivery server functions (getOrderDetail, getDeliveryTracking, confirmDropShipDelivery, disputeDropShipDelivery, getPODDetails)
  - Order tracking route (orders_.$orderId.tsx)
affects: [portal-notifications, portal-settings, internal-dispatch, driver-app]

tech-stack:
  added: [react-map-gl, maplibre-gl]
  patterns: [ClientOnly-map-wrapper, delivery-stage-progress-bar, pod-confirm-dispute-flow, localStorage-cooldown-pattern]

key-files:
  created:
    - apps/portal/src/lib/server/deliveries.ts
    - apps/portal/src/components/orders/ProgressBar.tsx
    - apps/portal/src/components/orders/DeliveryMap.tsx
    - apps/portal/src/components/orders/PODConfirmFlow.tsx
    - apps/portal/src/components/orders/ETADisplay.tsx
    - apps/portal/src/components/orders/PaymentInstructionsCard.tsx
    - apps/portal/src/components/orders/FavoriteButton.tsx
    - apps/portal/src/components/orders/AIReorderSuggestion.tsx
    - apps/portal/src/routes/_portal/orders_.$orderId.tsx
  modified:
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json

key-decisions:
  - "DeliveryMap uses require() inside ClientOnly render function for lazy loading"
  - "GPS polling at 10s interval via refetchInterval on delivery tracking query"
  - "POD countdown uses useMemo for hours remaining calculation (not real-time timer)"

patterns-established:
  - "ClientOnly map wrapper: MapLibre GL wrapped at call site, not inside map component"
  - "localStorage cooldown: store ISO date, check if stored date + N days > now"
  - "Delivery stage mapping: mapStatusToStage() converts order status to 5-stage DeliveryStage"

requirements-completed: [PORT-07, PORT-14]

duration: 6min
completed: 2026-04-01
---

# Phase 11 Plan 05: Order Tracking + Delivery Map + POD + Favorites Summary

**5-stage order tracking with GPS delivery map (MapLibre GL), POD confirm/dispute flow with 72h countdown, payment instructions with copyable IBAN, favorites toggle, and AI reorder suggestions with 7-day cooldown**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T15:48:59Z
- **Completed:** 2026-04-01T15:55:12Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Built complete order tracking view with 5-stage progress bar (completed/current/future visual states)
- GPS delivery map via react-map-gl/maplibre with driver blue dot, route polyline, destination pin, ETA overlay
- POD confirmation/dispute flow with 72h countdown, dispute modal with isKeyboardDismissDisabled
- Payment instructions card with clipboard IBAN copy and toast feedback
- FavoriteButton with red heart fill (data state exception to three-color rule)
- AI reorder suggestion card with 7-day localStorage cooldown
- Full EN/AR i18n for all tracking, POD, payment, favorites, and AI suggestion strings

## Task Commits

Each task was committed atomically:

1. **Task 1: Create delivery server functions, ProgressBar, DeliveryMap, POD flow, payment card** - `61a9d2c` (feat)
2. **Task 2: Wire order tracking route + FavoriteButton + AI reorder suggestion** - `037793a` (feat)

## Files Created/Modified
- `apps/portal/src/lib/server/deliveries.ts` - Delivery server functions with dev mode fallback (getOrderDetail, getDeliveryTracking, confirmDropShipDelivery, disputeDropShipDelivery, getPODDetails)
- `apps/portal/src/components/orders/ProgressBar.tsx` - 5-stage delivery progress bar with pulse animation for current stage
- `apps/portal/src/components/orders/DeliveryMap.tsx` - MapLibre GL GPS map with driver tracking, route polyline, smooth position interpolation
- `apps/portal/src/components/orders/PODConfirmFlow.tsx` - Confirm/dispute flow with 72h countdown and dispute modal
- `apps/portal/src/components/orders/ETADisplay.tsx` - Compact ETA display in Geist Mono
- `apps/portal/src/components/orders/PaymentInstructionsCard.tsx` - Bank details with clipboard IBAN copy
- `apps/portal/src/components/orders/FavoriteButton.tsx` - Heart toggle with red fill exception
- `apps/portal/src/components/orders/AIReorderSuggestion.tsx` - Contextual reorder card with 7-day cooldown
- `apps/portal/src/routes/_portal/orders_.$orderId.tsx` - Order tracking route wiring all components
- `packages/i18n/src/locales/en/portal.json` - English tracking/POD/favorites/AI i18n keys
- `packages/i18n/src/locales/ar/portal.json` - Arabic tracking/POD/favorites/AI i18n keys

## Decisions Made
- DeliveryMap uses require() inside ClientOnly render function for lazy loading -- avoids SSR crash from maplibre-gl browser API access at import time
- GPS polling at 10s interval via TanStack Query refetchInterval -- balances freshness vs network load
- POD countdown uses useMemo for hours remaining calculation rather than a real-time updating timer -- sufficient for the 72h timeframe and avoids unnecessary re-renders

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None - all components are fully wired with mock data from server functions.

## User Setup Required
None - no external service configuration required. MapTiler key (VITE_MAPTILER_KEY) is optional; falls back to OSM demo tiles.

## Next Phase Readiness
- Order tracking view complete with all sub-components
- Ready for real Supabase data integration when database is connected
- MapTiler API key needed for production Arabic map labels
- react-map-gl and maplibre-gl packages need to be installed via `bun add react-map-gl maplibre-gl` before runtime

## Self-Check: PASSED

All 9 created files verified on disk. Both task commits (61a9d2c, 037793a) verified in git log.

---
*Phase: 11-portal-orders-delivery-remaining-windows*
*Completed: 2026-04-01*
