---
phase: 15-internal-platform-shell
plan: 02
subsystem: ui
tags: [react, zustand, glass-window, hotkeys, i18n, spatial-ui, motion]

requires:
  - phase: 15-internal-platform-shell/01
    provides: "Module config, Zustand store, keyboard scope, useShortcut hook"
  - phase: 03-shared-packages
    provides: "GlassWindow, LionMark, hasPermission, formatNumber, i18n"
provides:
  - "InternalCanvas with greeting, urgent items, lion watermark, quick actions"
  - "IconStrip with permission-filtered module icons"
  - "ModuleWindow glass window system with keyboard scope management"
  - "WindowHeader with module icon/name and close button"
  - "NotificationBell with unread dot (Button-based for window opening)"
  - "MobileModuleGrid 2-column glass card grid"
  - "InternalShortcuts registering 11 module hotkeys + Escape"
  - "Server function getUrgentItems with 6 parallel mock queries"
  - "AR+EN i18n locale files for internal namespace"
affects: [15-03-command-palette-notifications, 16-sales, 17-procurement, 18-orders, 19-warehouse, 20-finance, 21-dispatch, 22-support-hr-admin-reports-ai]

tech-stack:
  added: []
  patterns: ["Icon strip + hotkey navigation for internal modules", "Glass window with keyboard scope transitions", "Server function mock pattern for urgent items"]

key-files:
  created:
    - apps/internal/src/components/shell/InternalCanvas.tsx
    - apps/internal/src/components/shell/IconStrip.tsx
    - apps/internal/src/components/shell/WindowHeader.tsx
    - apps/internal/src/components/shell/ModuleWindow.tsx
    - apps/internal/src/components/shell/NotificationBell.tsx
    - apps/internal/src/components/shell/MobileModuleGrid.tsx
    - apps/internal/src/components/shell/InternalShortcuts.tsx
    - apps/internal/src/lib/server/urgent-items.ts
    - apps/internal/src/locales/en/internal.json
    - apps/internal/src/locales/ar/internal.json
  modified:
    - apps/internal/src/routes/_internal.tsx
    - apps/internal/src/routes/_internal/index.tsx

key-decisions:
  - "NotificationBell uses Button (not Link) since internal notifications open a window, not navigate"
  - "InternalShortcuts iterates MODULES with for-of loop for useShortcut registration"
  - "Focus/blur event delegation with capture:true on document for keyboard scope input detection"

patterns-established:
  - "Module window pattern: GlassWindow + WindowHeader + placeholder content for Phases 16-22"
  - "Icon strip toggle: same hotkey or click toggles module open/closed"
  - "Desktop/mobile split: max-md:hidden/md:hidden for canvas vs card grid"

requirements-completed: [INT-02, INT-03, INT-04, INT-07]

duration: 3min
completed: 2026-04-05
---

# Phase 15 Plan 02: Internal Platform Shell Components Summary

**Spatial canvas with hotkey-driven glass window navigation, permission-filtered icon strip, notification bell, and mobile card grid for the internal platform operational hub**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-05T16:31:47Z
- **Completed:** 2026-04-05T16:34:57Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Built all shell components: canvas, icon strip, window header, module window, notification bell, mobile grid
- Wired layout route with icon strip, 11 hotkeys (keyboard scope guarded), glass windows, and notification bell
- Created server function for urgent items aggregation (6 parallel mock queries)
- Full AR+EN i18n locale files for internal namespace

## Task Commits

Each task was committed atomically:

1. **Task 1: Build canvas, icon strip, window header, bell, mobile grid, and i18n** - `274b948` (feat)
2. **Task 2: Wire layout with icon strip, shortcuts, canvas, bell, and window system** - `790d473` (feat)

## Files Created/Modified
- `apps/internal/src/lib/server/urgent-items.ts` - Server function with 6 parallel urgent item mock queries
- `apps/internal/src/components/shell/InternalCanvas.tsx` - Time-aware greeting, urgent count, lion watermark, role-based quick actions
- `apps/internal/src/components/shell/IconStrip.tsx` - Permission-filtered module icon strip with active state
- `apps/internal/src/components/shell/WindowHeader.tsx` - Module icon + name + close button header bar
- `apps/internal/src/components/shell/ModuleWindow.tsx` - Glass window with keyboard scope and scroll restoration
- `apps/internal/src/components/shell/NotificationBell.tsx` - Bell button with unread dot indicator
- `apps/internal/src/components/shell/MobileModuleGrid.tsx` - 2-column glass card grid for mobile
- `apps/internal/src/components/shell/InternalShortcuts.tsx` - 11 module hotkeys + Escape with scope guard
- `apps/internal/src/locales/en/internal.json` - English i18n keys
- `apps/internal/src/locales/ar/internal.json` - Arabic i18n keys
- `apps/internal/src/routes/_internal.tsx` - Layout with icon strip, bell, shortcuts, window system, focus delegation
- `apps/internal/src/routes/_internal/index.tsx` - Canvas (desktop) + mobile grid

## Decisions Made
- NotificationBell uses `<Button>` (not `<Link>`) since internal notifications open a window overlay, not navigate to a route
- InternalShortcuts iterates MODULES array with for-of loop for hotkey registration (each module gets its own useShortcut call)
- Focus/blur event delegation with `capture: true` on document for reliable keyboard scope input detection across all descendant inputs

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

| File | Line | Stub | Reason |
|------|------|------|--------|
| `urgent-items.ts` | All counters | Return 0 | Mock until Supabase connected |
| `ModuleWindow.tsx` | Content area | "Coming soon" placeholder | Real content built in Phases 16-22 |
| `_internal.tsx` | NotificationBell | `hasUnread={false}` | Plan 03 wires notification store |
| `_internal.tsx` | NotificationBell onPress | `console.log` | Plan 03 builds notification window |

All stubs are intentional and documented with clear resolution phases.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shell is fully navigable: icon strip + hotkeys on desktop, card grid on mobile
- Glass windows open/close with spring/tween animations via GlassWindow
- Ready for Plan 03: command palette (Ctrl+K) and notifications window
- Module content areas are placeholder -- Phases 16-22 will build actual module UIs

## Self-Check: PASSED

All 10 created files verified on disk. Both task commits (274b948, 790d473) verified in git log.

---
*Phase: 15-internal-platform-shell*
*Completed: 2026-04-05*
