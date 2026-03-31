---
phase: 04-website-layout-home-about
plan: 03
subsystem: ui
tags: [tanstack-start, ssg, prerender, motion, i18n, about-page, offline]

requires:
  - phase: 04-01
    provides: Website layout shell (header/footer), SectionReveal, home page
provides:
  - About page with 5 sections (hero, story, mission, team, careers CTA)
  - SSG prerendering for / and /about routes
  - OfflineBanner component in root layout
affects: [05-website-market-product-detail, 06-website-remaining-pages]

tech-stack:
  added: []
  patterns: [SSG prerender with crawlLinks disabled, offline detection via navigator.onLine]

key-files:
  created:
    - apps/website/src/routes/_website/about.tsx
    - apps/website/src/components/about/AboutHero.tsx
    - apps/website/src/components/about/CompanyStory.tsx
    - apps/website/src/components/about/MissionValues.tsx
    - apps/website/src/components/about/TeamGrid.tsx
    - apps/website/src/components/about/CareersCTA.tsx
    - apps/website/src/components/layout/OfflineBanner.tsx
  modified:
    - apps/website/vite.config.ts
    - apps/website/src/routes/__root.tsx
    - packages/i18n/src/locales/en/website.json
    - packages/i18n/src/locales/ar/website.json

key-decisions:
  - "Disabled crawlLinks in SSG prerender -- crawler follows <a> links to /market which doesn't exist yet, causing build failure"

patterns-established:
  - "About page sections as separate components under components/about/"
  - "SSG prerender config with crawlLinks: false to avoid crawling non-existent routes"

requirements-completed: [WEB-03]

duration: 5min
completed: 2026-03-31
---

# Phase 04 Plan 03: About Page + SSG Prerendering Summary

**About page with 5 sections (hero, story, mission values, team grid, careers CTA), SSG prerendering for / and /about with verified static HTML, and offline banner**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-31T16:44:23Z
- **Completed:** 2026-03-31T16:49:01Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- About page renders 5 sections: 70vh hero, 800px reading-width story, 3 mission value cards, team grid with initials circles, careers CTA
- SSG prerendering produces static HTML for both / and /about routes (verified in dist output)
- OfflineBanner detects connection loss and shows warning banner
- All text via i18n with proper Arabic translations

## Task Commits

1. **Task 1: Build About page sections and route** - `10bf911` (feat)
2. **Task 2: Enable SSG prerendering and add offline banner** - `85e749b` (feat)

## Files Created/Modified
- `apps/website/src/routes/_website/about.tsx` - About page route with 5 sections
- `apps/website/src/components/about/AboutHero.tsx` - 70vh hero with spring animation
- `apps/website/src/components/about/CompanyStory.tsx` - Reading-width story with staggered reveals
- `apps/website/src/components/about/MissionValues.tsx` - 3 value cards grid
- `apps/website/src/components/about/TeamGrid.tsx` - Team grid with initials fallback circles
- `apps/website/src/components/about/CareersCTA.tsx` - Careers CTA with link to /careers
- `apps/website/src/components/layout/OfflineBanner.tsx` - Offline detection banner
- `apps/website/vite.config.ts` - SSG prerender config for / and /about
- `apps/website/src/routes/__root.tsx` - Added OfflineBanner import and render
- `packages/i18n/src/locales/en/website.json` - Added story, mission, careers, offline keys
- `packages/i18n/src/locales/ar/website.json` - Arabic translations for all new keys

## Decisions Made
- Disabled `crawlLinks` in SSG prerender config because the crawler follows `<a>` links to routes that don't exist yet (e.g., /market, /careers), causing build failures. Only explicitly listed routes are prerendered.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Disabled crawlLinks in SSG prerender**
- **Found during:** Task 2 (SSG prerendering)
- **Issue:** TanStack Start prerender crawler follows all `<a>` links in rendered HTML. Links to /market and /careers (which don't exist yet) caused 404 errors and build failure.
- **Fix:** Added `crawlLinks: false` to prerender config to only prerender explicitly listed routes.
- **Files modified:** apps/website/vite.config.ts
- **Verification:** Build succeeds, static HTML for / and /about verified in dist output
- **Committed in:** 85e749b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for build to pass. No scope creep.

## Issues Encountered
None beyond the crawlLinks fix documented above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- Team member data in TeamGrid.tsx is hardcoded placeholder array (4 team members with static names/titles). Future plan should wire real team data.

## Next Phase Readiness
- About page complete and SSG-prerendered
- Phase 04 success criteria met: Home + About render as SSG static HTML
- Ready for Phase 05 (market/product detail pages)

---
*Phase: 04-website-layout-home-about*
*Completed: 2026-03-31*
