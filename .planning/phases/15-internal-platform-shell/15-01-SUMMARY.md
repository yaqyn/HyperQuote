---
phase: 15-internal-platform-shell
plan: 01
subsystem: ui
tags: [zustand, xstate, react-aria, tanstack-hotkeys, lucide, vitest, auth-guard]

requires:
  - phase: 03-shared-packages
    provides: GlassWindow, auth guard, i18n, display components
  - phase: 02-supabase-initial-migrations
    provides: Auth pools, RLS policies, role-permission seed data
provides:
  - 11-module registry with icons, hotkeys, permissions
  - Zustand store with keyed per-module window state preservation
  - Keyboard scope state machine (canvas/panel/input) via @xstate/store
  - useShortcut hook wrapping @tanstack/react-hotkeys
  - Auth layout route with internal pool guard + dev fallback
  - Vitest setup with mock auth and 8 Wave 0 test stubs (29 todos)
affects: [15-02-canvas-windows, 15-03-command-palette-notifications, 15-04-activity-feed]

tech-stack:
  added: [zustand, motion, react-aria-components, tailwindcss-react-aria-components, lucide-react, fuse.js, "@xstate/store", "@tanstack/react-hotkeys", "@tanstack/react-query", i18next, react-i18next, vitest, "@testing-library/react", "@testing-library/jest-dom", jsdom]
  patterns: [keyboard-scope-state-machine, keyed-window-state-store, module-registry-config]

key-files:
  created:
    - apps/internal/src/lib/modules.ts
    - apps/internal/src/stores/internal.ts
    - apps/internal/src/stores/keyboard-scope.ts
    - apps/internal/src/hooks/useShortcut.ts
    - apps/internal/src/hooks/useKeyboardScope.ts
    - apps/internal/src/hooks/useWindowState.ts
    - apps/internal/src/routes/_internal.tsx
    - apps/internal/src/routes/_internal/index.tsx
    - apps/internal/vitest.config.ts
    - apps/internal/src/__tests__/setup.ts
  modified:
    - apps/internal/package.json
    - apps/internal/src/routes/__root.tsx
    - apps/internal/src/styles.css

key-decisions:
  - "Keyboard scope panelOpen is single boolean -- command palette and module windows are mutually exclusive"
  - "Zustand store uses skipHydration: true for SSR safety"
  - "Dev mode auth fallback activates only when VITE_SUPABASE_URL unset (same pattern as portal)"

patterns-established:
  - "Module registry: static config array with id/icon/labelKey/hotkey/permission"
  - "Keyboard scope state machine: canvas/panel/input via @xstate/store with React hook"
  - "Window state preservation: keyed Zustand store with auto scroll save on unmount"

requirements-completed: [INT-01, INT-03, INT-04]

duration: 3min
completed: 2026-04-05
---

# Phase 15 Plan 01: Internal Platform Shell Foundation Summary

**Auth-guarded layout route, 11-module registry, Zustand keyed window state store, keyboard scope state machine via @xstate/store, and 8 Wave 0 test stubs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T16:26:19Z
- **Completed:** 2026-04-05T16:29:36Z
- **Tasks:** 3
- **Files modified:** 22

## Accomplishments
- Internal auth layout route with `requiredPool: 'internal'` guard rejecting external pool users
- 11-module registry (Sales, Procurement, Orders, Warehouse, Finance, Dispatch, Customer Service, HR, Admin, Reports, AI) with icons, hotkeys, and permissions
- Zustand store with keyed per-module window state preservation (scroll position, active tab, filters)
- Keyboard scope state machine (canvas/panel/input) with documented mutual exclusivity assumption
- Vitest configured with jsdom, 8 test stub files, 29 todo tests for Nyquist Wave 0 compliance

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and configure __root.tsx** - `4bfb6a7` (feat)
2. **Task 2: Module registry, stores, hooks, _internal.tsx auth layout** - `acff808` (feat)
3. **Task 3: Wave 0 test stubs for Nyquist compliance** - `34677f8` (test)

## Files Created/Modified
- `apps/internal/package.json` - Added 14 runtime + 4 dev dependencies
- `apps/internal/src/routes/__root.tsx` - QueryClientProvider, I18nProvider locale=ar, font links
- `apps/internal/src/styles.css` - CSS design tokens in :root with dark mode variant
- `apps/internal/vitest.config.ts` - jsdom environment, setup file reference
- `apps/internal/src/lib/modules.ts` - 11-module registry with ModuleConfig interface
- `apps/internal/src/stores/internal.ts` - Zustand store with keyed WindowState preservation
- `apps/internal/src/stores/keyboard-scope.ts` - @xstate/store state machine (canvas/panel/input)
- `apps/internal/src/hooks/useShortcut.ts` - Abstraction over @tanstack/react-hotkeys useHotkey
- `apps/internal/src/hooks/useKeyboardScope.ts` - React hook for keyboard scope state machine
- `apps/internal/src/hooks/useWindowState.ts` - Per-module state read/save with auto scroll cleanup
- `apps/internal/src/routes/_internal.tsx` - Auth layout route with internal pool guard
- `apps/internal/src/routes/_internal/index.tsx` - Placeholder canvas route
- `apps/internal/src/__tests__/setup.ts` - Mock auth session factory + stub Supabase client
- `apps/internal/src/__tests__/auth-guard.test.ts` - 3 todo tests
- `apps/internal/src/__tests__/canvas.test.ts` - 4 todo tests
- `apps/internal/src/__tests__/hotkeys.test.ts` - 4 todo tests
- `apps/internal/src/__tests__/permissions.test.ts` - 3 todo tests
- `apps/internal/src/__tests__/command-palette.test.ts` - 4 todo tests
- `apps/internal/src/__tests__/window-state.test.ts` - 3 todo tests
- `apps/internal/src/__tests__/activity-feed.test.ts` - 4 todo tests
- `apps/internal/src/__tests__/notifications.test.ts` - 4 todo tests

## Decisions Made
- Keyboard scope `panelOpen` is a single boolean because command palette and module windows are mutually exclusive (documented in store with comment)
- Zustand store uses `skipHydration: true` for SSR safety
- Dev mode auth fallback only activates when `VITE_SUPABASE_URL` is unset (production always has it set)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Module registry, stores, and hooks ready for Plan 02 (canvas/windows) to build spatial canvas with icon strip and glass windows
- Keyboard scope state machine ready for Plan 03 (command palette) to wire Ctrl+K and scope transitions
- All 8 test stub files ready for subsequent plans to fill in real assertions

## Self-Check: PASSED

All 10 key files verified present. All 3 task commits verified in git log.

---
*Phase: 15-internal-platform-shell*
*Completed: 2026-04-05*
