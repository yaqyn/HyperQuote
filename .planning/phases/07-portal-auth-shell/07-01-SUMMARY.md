---
phase: 07-portal-auth-shell
plan: 01
subsystem: auth
tags: [tanstack-start, supabase, i18n, zustand, react-aria, portal, auth-guard]

requires:
  - phase: 03-shared-packages
    provides: "@hyperquote/auth, @hyperquote/ui, @hyperquote/i18n packages"
  - phase: 06-website-remaining-pages
    provides: "Login flow patterns, auth server functions, root route pattern"
provides:
  - "Portal app with auth gate redirecting unauthenticated to website login"
  - "Portal i18n namespace with all UI-SPEC copywriting keys (AR+EN)"
  - "Zustand portal store (activeRole, isFloatingAIOpen)"
  - "useShortcut hook wrapping @tanstack/react-hotkeys"
  - "Root route with locale/theme SSR (mirrors website pattern)"
affects: [08-portal-ai-chat, 09-portal-material-list-builder-quote-submission, 10-portal-quote-detail-acceptance, 11-portal-orders-delivery-remaining-windows]

tech-stack:
  added: [react-aria-components, motion, zustand, lucide-react, i18next, react-i18next, "@tanstack/react-hotkeys", zod, tailwindcss-react-aria-components]
  patterns: [server-function-auth-check, cross-app-redirect, portal-i18n-namespace]

key-files:
  created:
    - apps/portal/src/lib/auth.ts
    - apps/portal/src/lib/env.ts
    - apps/portal/src/lib/i18n.ts
    - apps/portal/src/lib/theme.ts
    - apps/portal/src/stores/portal.ts
    - apps/portal/src/hooks/useShortcut.ts
    - apps/portal/src/routes/_portal.tsx
    - apps/portal/src/routes/_portal/index.tsx
    - packages/i18n/src/locales/en/portal.json
    - packages/i18n/src/locales/ar/portal.json
  modified:
    - apps/portal/package.json
    - apps/portal/src/routes/__root.tsx
    - apps/portal/src/styles.css
    - packages/i18n/src/config.ts

key-decisions:
  - "Server function wrapper for auth check -- avoids node:stream bundled into client"
  - "useHotkey (singular) from @tanstack/react-hotkeys v0.9.1 -- API changed from plan's assumed useHotkeys"
  - "No skipHydration on portal store -- non-persisted store, defaults identical on server/client"

patterns-established:
  - "Portal auth: createServerFn wraps getServerSession, _portal.tsx beforeLoad calls it and throws redirect({ href }) for cross-app redirect"
  - "Portal i18n: useTranslation('portal') namespace with all copywriting contract keys"
  - "Portal root route mirrors website pattern: detectLocale, setupI18n, I18nProvider, theme FOUC script"

requirements-completed: [PORT-01]

duration: 6min
completed: 2026-04-01
---

# Phase 7 Plan 1: Portal Auth + Shell Foundation Summary

**Portal app wired with auth gate (cross-app redirect to website login), locale/theme SSR, i18n namespace with 40 AR+EN keys, Zustand store, and useShortcut abstraction**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T07:33:16Z
- **Completed:** 2026-04-01T07:39:31Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Portal auth gate: unauthenticated users redirect to `hyperquote.net?login=portal&redirect={path}`, internal-pool users see error page
- Root route with locale detection (cookie/localStorage), theme FOUC prevention, I18nProvider, OfflineBanner, skip-to-content link
- Portal i18n namespace with all 40 copywriting contract keys in both AR and EN
- Zustand portal store and useShortcut hook ready for Plans 02/03

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create portal utilities** - `a1ce38d` (feat)
2. **Task 2: Root route + authenticated layout route** - `bbdf713` (feat)

## Files Created/Modified
- `apps/portal/package.json` - Added all portal dependencies (auth, ui, i18n, motion, zustand, etc.)
- `apps/portal/src/lib/auth.ts` - Server function for portal auth check
- `apps/portal/src/lib/env.ts` - Environment variable exports (Supabase URL, key, website URL)
- `apps/portal/src/lib/i18n.ts` - i18n setup mirroring website pattern
- `apps/portal/src/lib/theme.ts` - Theme utilities (get/set/toggle/init/persist)
- `apps/portal/src/stores/portal.ts` - Zustand store (activeRole, isFloatingAIOpen)
- `apps/portal/src/hooks/useShortcut.ts` - Swappable wrapper over @tanstack/react-hotkeys useHotkey
- `apps/portal/src/routes/__root.tsx` - Root HTML shell with locale/theme/I18nProvider
- `apps/portal/src/routes/_portal.tsx` - Auth layout route with beforeLoad guard
- `apps/portal/src/routes/_portal/index.tsx` - Placeholder portal index route
- `apps/portal/src/styles.css` - Tailwind + tokens + fonts + React Aria plugin + dark variant
- `packages/i18n/src/locales/en/portal.json` - English portal translations (40 keys)
- `packages/i18n/src/locales/ar/portal.json` - Arabic portal translations (40 keys)
- `packages/i18n/src/config.ts` - Added portal namespace to i18n resources

## Decisions Made
- **Server function for auth check:** Direct import of `getServerSession` in route file caused `node:stream` to bundle into client. Wrapped in `createServerFn` to keep server-only code out of client bundle. This is the correct TanStack Start pattern.
- **useHotkey (singular) API:** @tanstack/react-hotkeys v0.9.1 exports `useHotkey` not `useHotkeys`. No `enableOnFormTags` option exists -- the library handles this differently. Adapted `useShortcut` wrapper accordingly.
- **process.env for server function:** Auth server function uses `process.env.SUPABASE_URL` (server-side) instead of `import.meta.env.VITE_SUPABASE_URL` (client-side) since createServerFn runs on the server.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Wrapped auth check in createServerFn**
- **Found during:** Task 2 (Root route + auth layout)
- **Issue:** Direct import of `getServerSession` from `@hyperquote/auth` in `_portal.tsx` caused `node:stream` to be bundled into the client, breaking the Cloudflare Workers build
- **Fix:** Created `apps/portal/src/lib/auth.ts` with `checkPortalAuth` server function that wraps `getServerSession`. The `_portal.tsx` route calls this server function in beforeLoad instead.
- **Files modified:** apps/portal/src/lib/auth.ts (created), apps/portal/src/routes/_portal.tsx
- **Verification:** `bun run build` completes successfully
- **Committed in:** bbdf713

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for Cloudflare Workers build compatibility. No scope creep.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all files contain real implementations, not placeholders.

## Next Phase Readiness
- Auth gate, i18n, store, and shortcut hook are ready for Plan 02 (spatial canvas components)
- Portal builds cleanly with all shared package dependencies wired

## Self-Check: PASSED

All 12 created files verified present. Both task commits (a1ce38d, bbdf713) verified in git log.

---
*Phase: 07-portal-auth-shell*
*Completed: 2026-04-01*
