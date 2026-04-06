---
phase: 23-ceo-command-center
plan: "06"
subsystem: infra
tags: [pwa, service-worker, workbox, indexeddb, offline, idb]

requires:
  - phase: 23-02
    provides: CEO app shell with routes, stores, hooks, styles
provides:
  - Service worker with Workbox precaching and runtime caching strategies
  - IndexedDB schema (5 stores) for offline data cache via idb
  - PWA manifest with black theme color
  - Post-build script for Workbox injectManifest
  - OfflineIndicator and SyncTimestamp shared components
  - SW registration in root component
affects: [23-ceo-command-center]

tech-stack:
  added: [workbox-precaching, workbox-routing, workbox-strategies, workbox-expiration, workbox-cacheable-response, workbox-build, idb]
  patterns: [manual-workbox-injectmanifest, indexeddb-offline-cache, staleness-color-coding]

key-files:
  created:
    - apps/ceo/src/sw.ts
    - apps/ceo/src/lib/offline.ts
    - apps/ceo/src/lib/registerSW.ts
    - apps/ceo/public/manifest.json
    - apps/ceo/public/icons/icon-192.png
    - apps/ceo/public/icons/icon-512.png
    - apps/ceo/scripts/build-sw.ts
    - apps/ceo/src/components/shared/OfflineIndicator.tsx
    - apps/ceo/src/components/shared/SyncTimestamp.tsx
  modified:
    - apps/ceo/package.json
    - apps/ceo/src/routes/__root.tsx

key-decisions:
  - "Manual Workbox injectManifest via post-build script (vite-plugin-pwa incompatible with TanStack Start)"
  - "NetworkFirst for navigation (3s timeout), StaleWhileRevalidate for API, CacheFirst for fonts/images"
  - "Exclude /_server routes from SW caching (TanStack Start server functions)"
  - "Singleton IndexedDB connection via getOfflineDB() with lazy init"
  - "Staleness colors: gray < 15min, yellow 15-30min, red > 30min"

patterns-established:
  - "Manual Workbox: compile sw.ts via Bun.build, then injectManifest into dist/client/sw.js"
  - "IndexedDB offline cache: 5 stores (digest, insight, attention, entities, searches) with syncedAt timestamps"
  - "Staleness color coding: three-tier visual feedback for data freshness"

requirements-completed: [CEO-08]

duration: 8min
completed: 2026-04-06
---

# Phase 23 Plan 06: PWA Infrastructure & Offline Mode Summary

**Manual Workbox service worker with precaching + runtime strategies, IndexedDB 5-store offline cache via idb, and staleness-colored sync indicators**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-06T08:39:54Z
- **Completed:** 2026-04-06T08:48:00Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Service worker with Workbox: precache app shell, NetworkFirst navigation (3s timeout), StaleWhileRevalidate API (30min TTL), CacheFirst fonts (1yr) and images (7d)
- IndexedDB schema via idb with 5 stores: digest, insight, attention, entities (with by-type index), searches
- PWA manifest with black theme color (zero accent), placeholder icons, SW registration in root
- OfflineIndicator (subtle text, hidden when online) and SyncTimestamp (Geist Mono, staleness colors)
- Build pipeline: vite build -> bun run scripts/build-sw.ts (compile + inject manifest)

## Task Commits

Each task was committed atomically:

1. **Task 1: Service worker, IndexedDB, PWA manifest, and build script** - `1b68387` (feat)
2. **Task 2: Offline indicator and sync timestamp components** - `02c37ed` (feat)

## Files Created/Modified
- `apps/ceo/src/sw.ts` - Service worker source with Workbox precaching + runtime strategies
- `apps/ceo/src/lib/offline.ts` - IndexedDB helpers via idb (5 stores, 10 helper functions)
- `apps/ceo/src/lib/registerSW.ts` - Service worker registration helper
- `apps/ceo/public/manifest.json` - PWA manifest (black theme, standalone)
- `apps/ceo/public/icons/icon-192.png` - Placeholder PWA icon 192x192
- `apps/ceo/public/icons/icon-512.png` - Placeholder PWA icon 512x512
- `apps/ceo/scripts/build-sw.ts` - Post-build Workbox injectManifest script
- `apps/ceo/src/components/shared/OfflineIndicator.tsx` - Subtle offline text indicator
- `apps/ceo/src/components/shared/SyncTimestamp.tsx` - Relative time with staleness colors
- `apps/ceo/package.json` - Updated build script chain
- `apps/ceo/src/routes/__root.tsx` - Added SW registration useEffect

## Decisions Made
- Manual Workbox injectManifest as post-build step (vite-plugin-pwa incompatible with TanStack Start Vite environment API)
- NetworkFirst for navigation requests with 3s timeout fallback to prevent stale SSR HTML
- /_server routes excluded from SW caching since TanStack Start server functions use POST to /_server
- Singleton lazy-init pattern for IndexedDB connection to avoid multiple open handles
- Staleness thresholds from CONTEXT.md: 15min warning, 30min error

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## Known Stubs
- `apps/ceo/public/icons/icon-192.png` - Placeholder black square, replace with lion logo
- `apps/ceo/public/icons/icon-512.png` - Placeholder black square, replace with lion logo

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- PWA infrastructure ready for offline data caching in other plans
- OfflineIndicator and SyncTimestamp available for use in home screen and data views
- Build pipeline produces sw.js in dist/client/ with precache manifest
- IndexedDB helpers ready for wiring into server function responses

---
*Phase: 23-ceo-command-center*
*Completed: 2026-04-06*
