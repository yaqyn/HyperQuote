---
phase: 11-portal-orders-delivery-remaining-windows
plan: 03
subsystem: ui
tags: [supabase-realtime, notifications, react-aria, listbox, zustand, motion, i18n]

requires:
  - phase: 07-portal-layout-canvas-nav
    provides: WindowShell, portal layout, FloatingAIButton
  - phase: 03-shared-packages
    provides: i18n infrastructure, display components

provides:
  - Notification types (NotificationType, Notification interfaces)
  - Server functions (getNotifications, markNotificationRead, markAllNotificationsRead)
  - Supabase Realtime hook (useRealtimeNotifications) with TanStack Query invalidation
  - NotificationItem component with icon mapping and relative timestamps
  - Zustand notification store (unread count for nav badge)
  - Full Notifications window with ListBox, pagination, spring animation

affects: [portal-nav-badge, portal-settings-notification-preferences, portal-pwa-push]

tech-stack:
  added: []
  patterns:
    - "Supabase Realtime postgres_changes with TanStack Query invalidation (never direct Zustand writes)"
    - "POST method for mutations in TanStack Start server functions (not PATCH)"
    - "Intl.RelativeTimeFormat for locale-aware relative timestamps"

key-files:
  created:
    - apps/portal/src/types/notification.ts
    - apps/portal/src/lib/server/notifications.ts
    - apps/portal/src/components/notifications/NotificationItem.tsx
    - apps/portal/src/components/notifications/useRealtimeNotifications.ts
    - apps/portal/src/stores/notifications.ts
  modified:
    - apps/portal/src/routes/_portal/notifications.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json

key-decisions:
  - "POST method for markNotificationRead and markAllNotificationsRead (TanStack Start server fns only support GET/POST)"
  - "Dynamic import of @supabase/supabase-js in Realtime hook to avoid SSR bundling issues"
  - "Read spacer div maintains alignment when unread dot is absent"

patterns-established:
  - "Realtime subscription pattern: useEffect with channel setup and removeChannel cleanup"
  - "New notification detection via knownIdsRef Set for spring-in animation"

requirements-completed: [PORT-09]

duration: 3min
completed: 2026-04-01
---

# Phase 11 Plan 03: Notifications Window Summary

**Real-time notifications via Supabase Realtime with React Aria ListBox, relative timestamps in Geist Mono, mark-as-read mutations, and spring-in animation for new items**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-01T15:36:22Z
- **Completed:** 2026-04-01T15:39:50Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Notification type system with 5 notification types and 4 target types
- Server functions with dev-mode mock data (8 notifications with varied types/read states)
- Supabase Realtime hook subscribing to postgres_changes filtered by user_id (RLS)
- NotificationItem with icon mapping per type, 8px blue unread dot, Geist Mono relative timestamps
- Full Notifications window: ListBox, mark-all-read, show-older pagination, spring animation, empty state
- Zustand store syncing unread count for nav badge consumption
- i18n keys for en + ar (notifications namespace)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create notification types, server functions, Realtime hook, and NotificationItem** - `92626c0` (feat)
2. **Task 2: Wire Notifications window route with ListBox, real-time, mark-all-read, and show-older** - `40bc1a6` (feat)

## Files Created/Modified
- `apps/portal/src/types/notification.ts` - NotificationType, Notification interfaces
- `apps/portal/src/lib/server/notifications.ts` - getNotifications, markNotificationRead, markAllNotificationsRead server functions
- `apps/portal/src/components/notifications/NotificationItem.tsx` - ListBoxItem with icon, title, body, relative time
- `apps/portal/src/components/notifications/useRealtimeNotifications.ts` - Supabase Realtime postgres_changes hook
- `apps/portal/src/stores/notifications.ts` - Zustand unread count store
- `apps/portal/src/routes/_portal/notifications.tsx` - Full notification window with ListBox, animation, pagination
- `packages/i18n/src/locales/en/portal.json` - Notification i18n keys (en)
- `packages/i18n/src/locales/ar/portal.json` - Notification i18n keys (ar)

## Decisions Made
- POST method for mark-read mutations (TanStack Start limitation: server fns only support GET/POST, not PATCH)
- Dynamic import of Supabase client in Realtime hook to avoid SSR bundling
- Read items get invisible spacer div to maintain horizontal alignment with unread dot
- New notification detection via ref-tracked Set of known IDs, enabling spring-in only for genuinely new items

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all data flows are wired to server functions with dev-mode mock fallback.

## Next Phase Readiness
- Notification system complete, ready for nav badge integration (store provides unreadCount)
- Realtime subscription pattern established for reuse in other real-time features
- Settings notification preferences (PORT-12) can wire to notification store

---
*Phase: 11-portal-orders-delivery-remaining-windows*
*Completed: 2026-04-01*
