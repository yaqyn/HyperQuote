---
phase: 07-portal-auth-shell
plan: 02
subsystem: ui
tags: [motion, react-aria, zustand, spatial-canvas, portal, greeting, chat-input, glass-navigation]

requires:
  - phase: 07-portal-auth-shell
    provides: "Portal auth gate, i18n namespace, Zustand store, root route"
provides:
  - "Spatial canvas with greeting, AI chat input, and role-aware navigation buttons"
  - "PortalHeader with role toggle, notification bell, and profile menu popover"
  - "Canvas recede animation driven by window route detection"
  - "Complete portal home page composing all canvas and shell components"
affects: [08-portal-ai-chat, 09-portal-material-list-builder-quote-submission, 11-portal-orders-delivery-remaining-windows]

tech-stack:
  added: []
  patterns: [spatial-canvas-recede, react-aria-popover-profile, role-toggle-css-transition, placeholder-crossfade]

key-files:
  created:
    - apps/portal/src/components/canvas/SpatialCanvas.tsx
    - apps/portal/src/components/canvas/Greeting.tsx
    - apps/portal/src/components/canvas/AIChatInput.tsx
    - apps/portal/src/components/canvas/NavButtons.tsx
    - apps/portal/src/components/shell/PortalHeader.tsx
    - apps/portal/src/components/shell/ProfileMenu.tsx
    - apps/portal/src/components/shell/NotificationBell.tsx
    - apps/portal/src/components/shell/RoleToggle.tsx
  modified:
    - apps/portal/src/routes/_portal.tsx
    - apps/portal/src/routes/_portal/index.tsx

key-decisions:
  - "React Aria Popover with CSS transitions for ProfileMenu -- no Motion per UI-VISION gotcha"
  - "RoleToggle uses CSS transition on sliding indicator, not Motion animation"
  - "Canvas recede uses useMatches() to detect window routes without Zustand coupling"

patterns-established:
  - "SpatialCanvas wraps portal home content, applies recede on window route detection"
  - "PortalHeader is absolutely positioned over canvas, transparent background"
  - "ProfileMenu uses DialogTrigger + Popover from react-aria-components with inline sign-out confirmation"

requirements-completed: [PORT-02]

duration: 3min
completed: 2026-04-01
---

# Phase 7 Plan 2: Spatial Canvas + Header Controls Summary

**Spatial canvas with time-aware greeting (3s fade), AI chat input with rotating placeholders, role-aware nav buttons, and React Aria header controls (role toggle, bell, profile popover)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T07:42:26Z
- **Completed:** 2026-04-01T07:45:42Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Spatial canvas renders full viewport with greeting at ~35vh, chat input centered at 640px, and two navigation buttons below
- Greeting shows time-aware text (morning/afternoon/evening/night) with spring entrance and 3s fade to opacity 0.4
- AI chat input with 8s rotating placeholder crossfade, Sparkles icon, and send button (opacity transitions)
- Navigation buttons change based on Zustand activeRole (customer: Orders+Market, supplier: Stock+POs)
- Canvas recede animation (scale 0.96, blur 2px, opacity 0.5) activates on window route match
- PortalHeader with role toggle (CSS sliding indicator, hidden on mobile), notification bell, profile avatar popover
- ProfileMenu uses React Aria Popover with CSS transitions, inline sign-out confirmation, language/theme toggles

## Task Commits

Each task was committed atomically:

1. **Task 1: Canvas components (Greeting, AIChatInput, NavButtons, SpatialCanvas)** - `7abb7b9` (feat)
2. **Task 2: Header controls + portal index route wiring** - `a52695c` (feat)

## Files Created/Modified
- `apps/portal/src/components/canvas/SpatialCanvas.tsx` - Full viewport canvas with recede animation via useMatches
- `apps/portal/src/components/canvas/Greeting.tsx` - Time-aware greeting with spring entrance and 3s opacity fade
- `apps/portal/src/components/canvas/AIChatInput.tsx` - Centered chat input with rotating placeholder crossfade
- `apps/portal/src/components/canvas/NavButtons.tsx` - Role-aware nav buttons with spring stagger entrance
- `apps/portal/src/components/shell/PortalHeader.tsx` - Absolute header composing toggle + bell + profile
- `apps/portal/src/components/shell/ProfileMenu.tsx` - React Aria Popover with menu items and sign-out flow
- `apps/portal/src/components/shell/NotificationBell.tsx` - Bell icon with aria-label and unread dot
- `apps/portal/src/components/shell/RoleToggle.tsx` - CSS pill toggle with sliding blue indicator
- `apps/portal/src/routes/_portal.tsx` - Added PortalHeader with auth context passthrough
- `apps/portal/src/routes/_portal/index.tsx` - Portal home composing SpatialCanvas > Greeting > AIChatInput > NavButtons

## Decisions Made
- **React Aria Popover for ProfileMenu:** Uses CSS transitions per the React Aria + Motion v12 race condition gotcha (no Motion on Popover/Menu).
- **CSS transition for RoleToggle sliding indicator:** Per UI-VISION.md, toggle animations use CSS transitions not Motion. 200ms ease-out on transform.
- **useMatches() for canvas recede:** SpatialCanvas checks route matches directly instead of relying on Zustand activeWindow state, keeping the recede logic self-contained and URL-driven.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `urgentCount` hardcoded to `0` in portal index route (Phase 11 wires real counts)
- `hasUnread` hardcoded to `false` in NotificationBell (Phase 11 wires Supabase Realtime)
- `badgeCount` on Orders nav button hardcoded to `0` (Phase 11 wires real count)
- AIChatInput submit clears input only (Phase 8 wires AI streaming)

## Next Phase Readiness
- All spatial canvas components ready for Plan 03 (glass window system + floating AI button)
- AI chat input ready for Phase 8 streaming integration
- Navigation buttons link to routes that Plan 03 will create as glass window routes

## Self-Check: PASSED

All 8 created files verified present. Both task commits (7abb7b9, a52695c) verified in git log.

---
*Phase: 07-portal-auth-shell*
*Completed: 2026-04-01*
