---
phase: 24-driver-app-scaffold-auth-shift
plan: 01
subsystem: driver-app
tags: [scaffold, capacitor, router, supabase, i18n, design-tokens]
dependency_graph:
  requires: []
  provides: [driver-app-scaffold, driver-supabase-client, driver-router, driver-i18n, driver-test-infra]
  affects: [24-02, 24-03, 24-04]
tech_stack:
  added: ["@capacitor/core", "@capacitor/camera", "@capacitor/geolocation", "@capacitor/preferences", "@capacitor/app", "@capacitor/status-bar", "@capacitor/splash-screen", "@capacitor/haptics", "@capgo/capacitor-native-biometric", "@supabase/supabase-js", "@tanstack/react-router", "@tanstack/react-query", "zustand", "react-hook-form", "@hookform/resolvers", "zod", "react-i18next", "i18next", "i18next-browser-languagedetector", "react-aria-components", "motion", "react-signature-canvas", "vitest"]
  patterns: [direct-supabase-client, tanstack-router-spa, zustand-theme-store, capacitor-plugin-mocks]
key_files:
  created:
    - apps/driver/capacitor.config.ts
    - apps/driver/vitest.config.ts
    - apps/driver/src/test/setup.ts
    - apps/driver/src/lib/supabase.ts
    - apps/driver/src/stores/theme.ts
    - apps/driver/src/i18n/config.ts
    - apps/driver/src/i18n/locales/ar/driver.json
    - apps/driver/src/i18n/locales/en/driver.json
    - apps/driver/src/router.ts
    - apps/driver/src/routes/__root.tsx
    - apps/driver/src/routes/login.tsx
    - apps/driver/src/routes/home.tsx
    - apps/driver/src/routes/shift-start.tsx
  modified:
    - apps/driver/package.json
    - apps/driver/vite.config.ts
    - apps/driver/tsconfig.json
    - apps/driver/index.html
    - apps/driver/src/styles.css
    - apps/driver/src/main.tsx
  deleted:
    - apps/driver/src/App.tsx
decisions:
  - "Used import.meta.dirname for Vite resolve alias instead of new URL() to handle spaces in directory paths"
  - "Direct @supabase/supabase-js client (not @supabase/ssr) since Capacitor WebView has no server-side rendering"
  - "Arabic-Indic numeral formatting via i18next interpolation.format callback"
  - "Auto dark mode based on hour (18:00-06:00) for night shift drivers"
metrics:
  duration: 215s
  completed: 2026-04-06
  tasks_completed: 2
  tasks_total: 2
  files_created: 13
  files_modified: 6
  files_deleted: 1
---

# Phase 24 Plan 01: Driver App Scaffold Summary

Vite + React SPA with Capacitor 8, TanStack Router, direct Supabase client, i18n with Arabic-Indic numerals, Zustand theme store, and Vitest with full Capacitor plugin mocks.

## Task Results

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | Install dependencies, Capacitor config, Vite config, design tokens | 48c36d0 | Done |
| 2 | TanStack Router, Supabase client, i18n, theme store, route stubs | 59a6526 | Done |

## What Was Built

**Task 1 — Foundation infrastructure:**
- Installed 22 production deps + 3 dev deps (Capacitor 8, Supabase, TanStack Router/Query, Zustand, i18n, Motion, React Aria, Vitest)
- Capacitor config with `net.hyperquote.driver` appId, manual splash screen hide
- Vite config with `@` path alias using `import.meta.dirname` (space-safe)
- Design tokens in `:root` — three brand colors, status colors, font stacks (Inter/Geist Mono/IBM Plex Sans Arabic), 56px touch targets, safe area insets, dark mode via `[data-theme="dark"]`
- Vitest with jsdom, full Capacitor plugin mocks (camera, geolocation, biometric, preferences, app, haptics, status-bar, splash-screen)

**Task 2 — App shell:**
- TanStack Router SPA with `/login`, `/home`, `/shift-start` routes and type-safe registration
- Supabase direct client with PKCE flow, env-var config
- i18n with Arabic primary, English secondary, driver namespace, Arabic-Indic numeral formatting
- Zustand theme store with auto dark mode (18:00-06:00 for night shift) persisted to Capacitor Preferences
- Root layout applies RTL/LTR direction and theme on mount
- Route stubs with translated placeholder text
- Deleted App.tsx, main.tsx now renders RouterProvider with QueryClientProvider

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Vite resolve alias for paths with spaces**
- **Found during:** Task 2 build verification
- **Issue:** `new URL('./src', import.meta.url).pathname` URL-encodes spaces in directory paths, causing ENOENT on `@/stores/theme`
- **Fix:** Switched to `resolve(import.meta.dirname, 'src')` which handles spaces natively
- **Files modified:** apps/driver/vite.config.ts, apps/driver/vitest.config.ts
- **Commit:** 59a6526

**2. [Rule 1 - Bug] Removed unused createRouteMask import**
- **Found during:** Task 2 review
- **Fix:** Cleaned up unused import from router.ts
- **Commit:** 59a6526

## Known Stubs

Route components (`login.tsx`, `home.tsx`, `shift-start.tsx`) contain placeholder text only. This is intentional — they will be fully built in Plan 03 (Auth) and Plan 04 (Shift + Dashboard).

## Verification

- `bun run build` succeeds (209 modules, 1.40s)
- All routes defined and navigable
- Supabase client exports singleton
- i18n loads AR + EN translations
- Vitest config ready with Capacitor mocks

## Self-Check: PASSED

All 13 created files verified present. App.tsx confirmed deleted. Both commits (48c36d0, 59a6526) verified in git log.
