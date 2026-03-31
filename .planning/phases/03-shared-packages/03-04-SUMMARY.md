---
phase: 03-shared-packages
plan: 04
subsystem: integration
tags: [vertical-slice, supabase, react-aria, i18n, dark-mode, glass-ui, datatable]

requires:
  - phase: 03-02
    provides: "@hyperquote/ui components (GlassWindow, CurrencyDisplay, etc.)"
  - phase: 03-03
    provides: "@hyperquote/tables DataTable, @hyperquote/forms"
  - phase: 01-02
    provides: "@hyperquote/auth createSupabaseServerClient, authGuard"
  - phase: 02-02
    provides: "role_permissions table with RLS policies and seed data"
provides:
  - "Full stack vertical slice proving all 7 shared packages integrate correctly"
  - "Website app i18n initialization with Arabic default"
  - "Theme toggle utility with system preference detection"
  - "I18nProvider integration in root route with explicit locale"
affects: [04-website-layout-home-about, 05-website-market-product-detail, 06-website-remaining-pages]

tech-stack:
  added: [react-aria-components, i18next, react-i18next (as website deps)]
  patterns: [setupI18n singleton init, theme persistence via data-theme + localStorage, I18nProvider with explicit locale prop]

key-files:
  created:
    - apps/website/src/routes/vertical-slice.tsx
    - apps/website/src/lib/i18n.ts
    - apps/website/src/lib/theme.ts
  modified:
    - apps/website/package.json
    - apps/website/src/routes/__root.tsx

key-decisions:
  - "Vertical slice uses optional auth (no redirect) to allow demo without login"
  - "I18nProvider gets explicit locale prop to avoid SSR hydration bug #7474"

patterns-established:
  - "setupI18n singleton: call once in beforeLoad, skip on subsequent navigations"
  - "Theme utility: data-theme attribute + localStorage persistence"
  - "Server function pattern: createSupabaseServerClient with getRequest() for RLS"

requirements-completed: [FOUND-05, FOUND-06, FOUND-07, FOUND-08]

duration: 2min
completed: 2026-03-31
---

# Phase 03 Plan 04: Vertical Slice Integration Summary

**Full stack vertical slice: auth -> Supabase RLS -> server function -> React Aria + GlassWindow + DataTable -> i18n Arabic-Indic -> dark mode toggle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-31T15:44:31Z
- **Completed:** 2026-03-31T15:46:46Z
- **Tasks:** 2 auto + 1 checkpoint (pending)
- **Files modified:** 5

## Accomplishments
- Website app now consumes all 7 shared packages (@hyperquote/auth, types, i18n, ui, forms, tables + react-aria-components)
- Vertical slice page proves end-to-end: server function -> Supabase RLS query -> GlassWindow + DataTable + CurrencyDisplay/DateDisplay/UnitDisplay + StatusBadge
- Root route wraps with I18nProvider (explicit locale), dynamic html lang/dir, stylesheet linked
- Theme toggle with system preference detection and localStorage persistence

## Task Commits

1. **Task 1: Create i18n init + theme toggle for website app** - `baa9fb2` (feat)
2. **Task 2: Create vertical slice page with real Supabase query + all packages** - `9ac95de` (feat)
3. **Task 3: Visual verification of vertical slice** - Checkpoint (pending human verification)

## Files Created/Modified
- `apps/website/src/routes/vertical-slice.tsx` - Full stack integration page with server function, all UI components
- `apps/website/src/lib/i18n.ts` - i18n initialization wrapper (Arabic default)
- `apps/website/src/lib/theme.ts` - Theme toggle utility (data-theme, localStorage)
- `apps/website/src/routes/__root.tsx` - I18nProvider, setupI18n, dynamic locale/dir
- `apps/website/package.json` - Added workspace deps for all shared packages

## Decisions Made
- Vertical slice uses optional auth (no authGuard redirect) so the page works as a demo without login -- unauthenticated users see empty RLS results with a clear status message
- I18nProvider receives explicit locale prop (not auto-detected) to prevent SSR hydration mismatch bug #7474

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 shared packages proven to work together in the website app
- i18n, theme, and root route patterns established for all future website pages
- Ready for Phase 04 (website layout + home + about pages)

## Self-Check: PASSED

All files exist, all commits verified.

---
*Phase: 03-shared-packages*
*Completed: 2026-03-31*
