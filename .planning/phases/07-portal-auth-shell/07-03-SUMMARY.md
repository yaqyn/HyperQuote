---
phase: 07-portal-auth-shell
plan: 03
subsystem: ui
tags: [motion, glass-windows, deep-linking, keyboard-shortcuts, floating-ai, portal, spatial-glass]

requires:
  - phase: 07-portal-auth-shell
    provides: "Portal auth gate, i18n namespace, Zustand store, spatial canvas components"
provides:
  - "Glass window system with spring open animation and backdrop click-to-close"
  - "6 deep-linked window routes (orders, market, notifications, documents, support, settings)"
  - "Floating AI button with mini chat panel and Ctrl+J toggle"
  - "Keyboard shortcuts O/M/N for window navigation, / for chat focus, Escape to close"
affects: [08-portal-ai-chat, 09-portal-material-list-builder-quote-submission, 10-portal-quote-detail-acceptance, 11-portal-orders-delivery-remaining-windows, 12-supplier-portal]

tech-stack:
  added: []
  patterns: [window-shell-overlay, floating-ai-panel, layout-level-shortcuts]

key-files:
  created:
    - apps/portal/src/components/windows/WindowShell.tsx
    - apps/portal/src/components/windows/FloatingAIButton.tsx
    - apps/portal/src/routes/_portal/orders.tsx
    - apps/portal/src/routes/_portal/market.tsx
    - apps/portal/src/routes/_portal/notifications.tsx
    - apps/portal/src/routes/_portal/documents.tsx
    - apps/portal/src/routes/_portal/support.tsx
    - apps/portal/src/routes/_portal/settings.tsx
  modified:
    - apps/portal/src/routes/_portal.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json

key-decisions:
  - "WindowShell is portal-specific component, NOT shared GlassWindow -- centered panel over visible receded canvas"
  - "Exit animation handled by canvas restore (scale/blur/opacity tween) rather than AnimatePresence on window unmount"
  - "Keyboard shortcuts registered at _portal.tsx layout level for global availability"

patterns-established:
  - "Window routes render WindowShell + FloatingAIButton as siblings in a fragment"
  - "PortalShortcuts is a null-rendering component in layout for O/M/N/Slash shortcuts"
  - "FloatingAIButton auto-closes when navigating away from window routes via useEffect"

requirements-completed: [PORT-17]

duration: 3min
completed: 2026-04-01
---

# Phase 7 Plan 3: Glass Window System + Floating AI Summary

**Glass window system with spring open animation (stiffness 200, damping 20), 6 deep-linked routes, keyboard shortcuts O/M/N/Escape, and floating AI button with Ctrl+J toggle**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T07:48:47Z
- **Completed:** 2026-04-01T07:51:44Z
- **Tasks:** 2 (+ 1 checkpoint pending)
- **Files modified:** 11

## Accomplishments
- WindowShell renders centered glass panel (1200px max, 90vh max) with spring open animation, backdrop click-to-close, Escape closes, header bar with title and close button
- FloatingAIButton shows 44px blue circle when windows are open, Ctrl+J toggles mini AI panel with elevated glass (380px, isKeyboardDismissDisabled)
- Six window routes (orders, market, notifications, documents, support, settings) all render inside WindowShell with placeholder empty states
- Keyboard shortcuts O/M/N open respective windows, / focuses chat input, Escape closes windows
- Deep-linking works: /orders, /market, etc. open windows directly; browser back closes window
- Mobile: windows go full-screen with no rounded corners

## Task Commits

Each task was committed atomically:

1. **Task 1: WindowShell component + FloatingAIButton** - `141adff` (feat)
2. **Task 2: Window routes + keyboard shortcuts wiring** - `829d80a` (feat)

## Files Created/Modified
- `apps/portal/src/components/windows/WindowShell.tsx` - Glass window wrapper with spring/tween animation, header bar, close
- `apps/portal/src/components/windows/FloatingAIButton.tsx` - 44px blue circle with floating AI panel (380px, elevated glass)
- `apps/portal/src/routes/_portal/orders.tsx` - Orders window route with placeholder content
- `apps/portal/src/routes/_portal/market.tsx` - Market window route with placeholder content
- `apps/portal/src/routes/_portal/notifications.tsx` - Notifications window route
- `apps/portal/src/routes/_portal/documents.tsx` - Documents window route
- `apps/portal/src/routes/_portal/support.tsx` - Support window route
- `apps/portal/src/routes/_portal/settings.tsx` - Settings window route
- `apps/portal/src/routes/_portal.tsx` - Added PortalShortcuts component for O/M/N/Slash keys
- `packages/i18n/src/locales/en/portal.json` - Added 10 empty state keys
- `packages/i18n/src/locales/ar/portal.json` - Added 10 Arabic empty state keys

## Decisions Made
- **Portal-specific WindowShell:** Created custom component instead of using shared GlassWindow from @hyperquote/ui. The shared component is a full-screen overlay; portal needs a centered 1200px panel over visible receded canvas.
- **Exit animation via canvas restore:** TanStack Router unmounts route components immediately on navigation. Rather than fighting AnimatePresence with route transitions, the canvas restore animation (scale 0.96->1, blur 2px->0px, opacity 0.5->1, tween 300ms) provides visual feedback for window close. Documented per plan recommendation.
- **Layout-level shortcuts:** PortalShortcuts is a null-rendering component mounted in _portal.tsx layout, ensuring O/M/N/Slash work globally regardless of active route.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- All 6 window routes contain placeholder empty states (Phase 8-12 fills real content)
- FloatingAIButton chat input is non-functional (Phase 8 wires AI streaming)
- FloatingAIButton greeting is hardcoded to orders/market context only

## Next Phase Readiness
- All glass window infrastructure is ready for Phase 8 (AI chat integration)
- Window routes are ready for Phase 9-12 to replace placeholder content
- Deep-linking and keyboard shortcuts are production-ready

## Self-Check: PASSED
