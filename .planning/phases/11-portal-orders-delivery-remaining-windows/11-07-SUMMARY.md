---
phase: 11-portal-orders-delivery-remaining-windows
plan: "07"
subsystem: portal-pwa-guest-claiming
tags: [pwa, service-worker, push-notifications, guest-claiming, install-prompt]
dependency_graph:
  requires: [11-03, 11-05]
  provides: [pwa-infrastructure, guest-claiming-flow, ai-reorder-slot]
  affects: [portal-canvas, portal-engagement]
tech_stack:
  added: [workbox-precaching, workbox-strategies, workbox-routing, workbox-expiration]
  patterns: [service-worker, push-notifications, install-prompt, guest-claiming]
key_files:
  created:
    - apps/portal/public/manifest.json
    - apps/portal/public/sw.js
    - apps/portal/workbox-config.js
    - apps/portal/src/components/pwa/useInstallPrompt.ts
    - apps/portal/src/components/pwa/usePushPermission.ts
    - apps/portal/src/components/pwa/PWAInstallBanner.tsx
    - apps/portal/src/components/pwa/PushPermissionPrompt.tsx
    - apps/portal/src/lib/server/guest-claiming.ts
    - apps/portal/src/components/canvas/GuestClaimBanner.tsx
  modified:
    - apps/portal/src/routes/_portal/index.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json
decisions:
  - Workbox service worker with manual imports (not workbox-webpack-plugin) for TanStack Start/Vite compatibility
  - AIReorderSuggestion wired via dynamic require() slot to avoid hard dependency on parallel Plan 05 output
  - Migrated flat pwa.install/pwa.button i18n keys to nested pwa namespace for consistency with other sections
  - Push permission triggered on first notification arrival (unreadCount 0->N), never on page load
metrics:
  duration: 3min
  completed: "2026-04-01T15:52:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 9
  files_modified: 3
---

# Phase 11 Plan 07: PWA Infrastructure and Guest Claiming Summary

PWA service worker with Workbox precaching, stale-while-revalidate API cache, push notifications, install prompt after 3rd visit, and guest order claiming with race-condition-safe account linking.

## Task Results

### Task 1: PWA manifest, service worker, install prompt, push permission
**Commit:** 05b8d45
**Files:** 7 created

- manifest.json: standalone display, HyperQuote branding, Arabic default lang, theme_color #2563EB
- sw.js: Workbox precacheAndRoute, StaleWhileRevalidate for API (5min), CacheFirst for static (30d), NetworkFirst for navigation (3s timeout), push event handler with notification display and click-to-open
- workbox-config.js: injectManifest config for build pipeline
- useInstallPrompt: localStorage visit counter (hq-visit-count), beforeinstallprompt capture, canInstall only at visits >= 3
- usePushPermission: permission state tracking, triggerPrompt for first notification action, VAPID subscription
- PWAInstallBanner: fixed bottom banner with tween slide-up, dismiss to localStorage
- PushPermissionPrompt: GlassElevated dialog with isKeyboardDismissDisabled, Allow/Not now buttons

### Task 2: Guest claiming flow and canvas integration
**Commit:** b4a53d4
**Files:** 2 created, 3 modified

- guest-claiming.ts: checkUnclaimedCustomer (masked name hint), claimCustomerAccount (WHERE auth_user_id IS NULL race guard)
- GuestClaimBanner: shows masked hint, "Yes, that's me" claims account, "No, new account" dismisses with localStorage flag
- Portal index.tsx: service worker registration, manifest link in head, guest claim query, push permission on first notification, PWA banner, AIReorderSuggestionSlot
- i18n: pwa and guestClaim namespaces added to en and ar portal.json

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Migrated flat pwa i18n keys to nested namespace**
- **Found during:** Task 2
- **Issue:** Existing flat keys `pwa.install` and `pwa.button` conflicted with new nested `pwa` object
- **Fix:** Removed flat keys, all PWA i18n now in nested `pwa` namespace
- **Files modified:** packages/i18n/src/locales/en/portal.json, packages/i18n/src/locales/ar/portal.json

**2. [Rule 3 - Blocking] AIReorderSuggestion not yet in worktree**
- **Found during:** Task 2
- **Issue:** Plan 05 creates AIReorderSuggestion.tsx but this worktree doesn't have it yet (parallel execution)
- **Fix:** Created AIReorderSuggestionSlot with dynamic require() and try/catch fallback to null
- **Files modified:** apps/portal/src/routes/_portal/index.tsx

## Known Stubs

None -- all components are fully implemented. Guest claiming uses dev mock when Supabase is not configured (existing pattern). AIReorderSuggestion uses dynamic import slot that will resolve when Plan 05 output is merged.

## Self-Check: PASSED
